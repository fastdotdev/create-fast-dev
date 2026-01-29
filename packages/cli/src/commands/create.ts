import { access, constants, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import * as p from "@clack/prompts";
import type { InstallationMode, MonorepoContext } from "@repo/core";
import {
  cleanupTemplateConfig,
  CLI_NAME,
  copyLocalTemplate,
  createFallbackTemplate,
  createLogger,
  detectMonorepo,
  detectPackageManager,
  EXIT_CODE,
  expandTilde,
  fetchTemplate,
  getConfig,
  getTemplateBySlug,
  initializeGit,
  installDependencies,
  isLocalPath,
  isTemplateMonorepo,
  loadTemplateConfig,
  mergeConfigIntoTemplate,
  promptPostActions,
  promptProjectName,
  promptTemplateSelection,
  runTemplatePrompts,
  runTransformations,
} from "@repo/core";
import { defineCommand } from "citty";
import pc from "picocolors";

import { formatError } from "../utils/errors.js";

export const createCommand = defineCommand({
  meta: {
    name: "create",
    description: "Create a new project from a template",
  },
  args: {
    name: {
      type: "positional",
      description: "Project name",
      required: false,
    },
    template: {
      type: "string",
      alias: "t",
      description: "Template to use (e.g., nextjs-starter, expo-starter)",
    },
    yes: {
      type: "boolean",
      alias: "y",
      description: "Skip prompts and use defaults",
      default: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output directory (default: current directory)",
    },
    debug: {
      type: "boolean",
      description: "Enable debug logging",
      default: false,
    },
    "no-install": {
      type: "boolean",
      description: "Skip dependency installation",
      default: false,
    },
    "no-git": {
      type: "boolean",
      description: "Skip git initialization",
      default: false,
    },
    monorepo: {
      type: "boolean",
      alias: "m",
      description: "Force monorepo mode (auto-detected by default)",
    },
    "no-monorepo": {
      type: "boolean",
      description: "Disable monorepo mode even if detected",
      default: false,
    },
    target: {
      type: "string",
      description: "Target directory in monorepo (apps or packages)",
    },
  },
  async run({ args }) {
    const logger = createLogger({ debug: args.debug });

    // Start the UI
    p.intro(pc.bgCyan(pc.black(` ${CLI_NAME} `)));

    try {
      // Monorepo detection happens after outputDir is determined
      let monorepoContext: MonorepoContext | null = null;
      let installMode: InstallationMode = "standalone";

      // Get project name from positional arg or prompt
      let projectName = args.name;

      // Check if template arg is a local path
      let template;
      let isLocal = false;
      let localPath: string | undefined;

      if (args.template && isLocalPath(args.template)) {
        // Expand ~ and resolve to absolute path
        const expanded = expandTilde(args.template);
        localPath = resolve(process.cwd(), expanded);

        // Validate path exists
        try {
          await access(localPath, constants.F_OK);
        } catch {
          p.log.error(`Local template not found: ${localPath}`);
          process.exit(EXIT_CODE.ERROR);
        }

        // Create a minimal template object for local use
        template = createFallbackTemplate(`local:${localPath}`);
        isLocal = true;
        logger.debug(`Using local template: ${localPath}`);
      } else {
        // Select template from registry
        template = args.template
          ? getTemplateBySlug(args.template)
          : await promptTemplateSelection();

        if (!template) {
          if (args.template) {
            p.log.error(`Template not found: ${args.template}`);
            p.log.info("Run 'create-fast-dev list' to see available templates");
          }
          process.exit(EXIT_CODE.ERROR);
        }

        logger.debug(`Selected template: ${template.slug}`);
      }

      // Get project name if not provided
      if (!projectName) {
        projectName = await promptProjectName(template.slug);
      }

      // Validate project name format
      if (!/^[a-z0-9-]+$/.test(projectName)) {
        p.log.error("Project name must be lowercase alphanumeric with dashes");
        process.exit(EXIT_CODE.ERROR);
      }

      // Determine default output directory (monorepo detection happens after)
      let defaultOutputDir: string;

      if (args.output) {
        // Explicit output directory is used as-is (final destination)
        const expanded = expandTilde(args.output);
        defaultOutputDir = resolve(process.cwd(), expanded);
        logger.debug(`Using explicit output directory: ${defaultOutputDir}`);
      } else {
        // Default to current working directory
        defaultOutputDir = resolve(process.cwd(), projectName);
      }

      // Prompt for output directory (or use default with --yes)
      let outputDir: string;

      if (args.yes) {
        outputDir = defaultOutputDir;
      } else {
        const outputDirInput = await p.text({
          message: "Output directory",
          placeholder: defaultOutputDir,
          defaultValue: defaultOutputDir,
        });

        if (p.isCancel(outputDirInput)) {
          p.cancel("Operation cancelled");
          process.exit(EXIT_CODE.CANCELLED);
        }

        outputDir = outputDirInput as string;
      }

      // Check if directory exists and handle accordingly
      try {
        await access(outputDir, constants.F_OK);
        // Directory exists - check if it's empty
        const files = await readdir(outputDir);
        if (files.length > 0) {
          // Directory is not empty - prompt for confirmation
          if (args.yes) {
            p.log.error(`Directory is not empty: ${outputDir}`);
            process.exit(EXIT_CODE.ERROR);
          }

          const shouldContinue = await p.confirm({
            message: `Directory "${outputDir}" is not empty. Continue anyway?`,
            initialValue: false,
          });

          if (p.isCancel(shouldContinue) || !shouldContinue) {
            p.cancel("Operation cancelled");
            process.exit(EXIT_CODE.CANCELLED);
          }
        }
        // Directory exists but is empty - proceed
      } catch {
        // Directory doesn't exist - proceed
      }

      // Detect monorepo mode based on output directory
      if (!args["no-monorepo"]) {
        monorepoContext = await detectMonorepo(outputDir);

        if (monorepoContext || args.monorepo) {
          installMode = "monorepo";

          if (!monorepoContext && args.monorepo) {
            p.log.error("--monorepo flag set but no Turborepo detected");
            p.log.info("Make sure the output directory is inside a Turborepo");
            process.exit(EXIT_CODE.ERROR);
          }

          if (monorepoContext) {
            p.log.info(`Monorepo detected: ${monorepoContext.rootDir}`);
          }
        }
      }

      logger.debug(`Installation mode: ${installMode}`);

      // Start the spinner
      const s = p.spinner();

      // Clone/copy template first (we need config file to know prompts)
      if (isLocal && localPath) {
        // Check if local template is a monorepo
        const localIsMonorepo = await isTemplateMonorepo(localPath);
        if (localIsMonorepo && installMode === "monorepo") {
          p.log.error("Cannot add a monorepo template to an existing monorepo");
          p.log.info(
            "Monorepo templates contain their own turbo.json and workspace configuration."
          );
          p.log.info("Clone this template into a standalone directory instead.");
          process.exit(EXIT_CODE.ERROR);
        }

        s.start("Copying local template...");
        logger.debug(`Copying template from ${localPath} to ${outputDir}`);

        try {
          await copyLocalTemplate(localPath, outputDir);
          s.stop("Template copied");
        } catch (error) {
          s.stop("Failed to copy template");
          logger.debug("Template copy error:", error);
          p.log.error(formatError(error, { template: localPath }));
          process.exit(EXIT_CODE.ERROR);
        }
      } else {
        s.start("Downloading template...");
        logger.debug(`Fetching template from ${template.gitUrl} to ${outputDir}`);

        try {
          await fetchTemplate(template, {
            dir: outputDir,
            force: false,
          });
          s.stop("Template downloaded");

          // Check if remote template is a monorepo
          const templateIsMonorepo = await isTemplateMonorepo(outputDir);
          if (templateIsMonorepo && installMode === "monorepo") {
            await rm(outputDir, { recursive: true, force: true });
            p.log.error("Cannot clone a monorepo template into an existing monorepo");
            p.log.info(
              "Monorepo templates contain their own turbo.json and workspace configuration."
            );
            p.log.info("Clone this template into a standalone directory instead.");
            process.exit(EXIT_CODE.ERROR);
          }
        } catch (error) {
          s.stop("Failed to download template");
          logger.debug("Template fetch error:", error);
          p.log.error(formatError(error, { template: template.slug }));
          process.exit(EXIT_CODE.ERROR);
        }
      }

      // Load template config from fast-dev.config.json (if exists)
      const templateConfig = await loadTemplateConfig(outputDir);

      if (templateConfig) {
        // Merge config into template
        template = mergeConfigIntoTemplate(template, templateConfig);
        logger.debug("Loaded template config from fast-dev.config.json");
      } else {
        // No config found - use fallback (only rename-package transform)
        logger.debug("No fast-dev.config.json found, using fallback mode");
        template = createFallbackTemplate(template.gitUrl, template.branch);
      }

      // Run template prompts (now with prompts from config)
      const answers = await runTemplatePrompts(template, args.yes);
      answers["projectName"] = projectName;

      // Add author from config if available
      const savedAuthor = getConfig("author");
      if (savedAuthor && !answers["author"]) {
        answers["author"] = savedAuthor;
      }

      logger.debug("Collected answers:", answers);

      // Determine post-actions (skip git init in monorepo mode)
      let installDeps = !args["no-install"];
      let initGit = !args["no-git"] && installMode !== "monorepo";

      if (
        !args.yes &&
        !args["no-install"] &&
        installMode !== "monorepo" &&
        !args["no-git"]
      ) {
        const postActions = await promptPostActions();
        installDeps = postActions.installDeps;
        initGit = postActions.initGit;
      } else if (!args.yes && !args["no-install"] && installMode === "monorepo") {
        // In monorepo mode, only ask about install
        const shouldInstall = await p.confirm({
          message: "Install dependencies?",
          initialValue: true,
        });
        if (p.isCancel(shouldInstall)) {
          p.cancel("Operation cancelled");
          process.exit(EXIT_CODE.CANCELLED);
        }
        installDeps = shouldInstall;
      }

      // Prepend monorepo transforms if applicable
      if (installMode === "monorepo" && templateConfig?.monorepo?.enabled) {
        template.transforms = [
          { type: "builtin", transformer: "monorepo-adapt" },
          { type: "builtin", transformer: "tsconfig-adapt" },
          ...template.transforms,
        ];
      }

      // Run transformations
      s.start("Applying customizations...");
      logger.debug("Running transformations");

      try {
        await runTransformations(
          {
            projectPath: outputDir,
            projectName,
            answers,
            template,
            mode: installMode,
            monorepoContext: monorepoContext ?? undefined,
            templateConfig: templateConfig ?? undefined,
          },
          logger
        );

        // Clean up config files
        await cleanupTemplateConfig(outputDir);

        s.stop("Customizations applied");
      } catch (error) {
        s.stop("Failed to apply customizations");
        logger.debug("Transform error:", error);
        p.log.error(formatError(error, { template: template.slug }));
        process.exit(EXIT_CODE.ERROR);
      }

      // Initialize git
      if (initGit) {
        s.start("Initializing git repository...");
        const gitResult = await initializeGit({ dir: outputDir });
        if (gitResult.success) {
          s.stop("Git repository initialized");
        } else {
          s.stop("Git initialization skipped");
          logger.warn("Git init failed:", gitResult.error);
        }
      }

      // Install dependencies
      if (installDeps) {
        // In monorepo mode, install from root; otherwise from project dir
        const installDir =
          installMode === "monorepo" && monorepoContext
            ? monorepoContext.rootDir
            : outputDir;

        const pm =
          installMode === "monorepo" && monorepoContext
            ? monorepoContext.packageManager
            : (getConfig("preferredPackageManager") ??
              (await detectPackageManager(outputDir)));

        s.start(`Installing dependencies with ${pm}...`);

        const installResult = await installDependencies({
          dir: installDir,
          packageManager: pm,
          stdio: "pipe",
        });

        if (installResult.success) {
          s.stop("Dependencies installed");
        } else {
          s.stop("Dependency installation failed");
          logger.warn("Install failed:", installResult.error);
          p.log.warn(`Failed to install dependencies: ${installResult.error}`);
          const installPath = installMode === "monorepo" ? "monorepo root" : projectName;
          p.log.info(`You can install manually: cd ${installPath} && ${pm} install`);
        }
      }

      // Success message
      const pm =
        installMode === "monorepo" && monorepoContext
          ? monorepoContext.packageManager
          : await detectPackageManager(outputDir);

      // Build relative path for display
      let relativePath: string;
      if (installMode === "monorepo" && monorepoContext) {
        const targetType = args.target === "packages" ? "packages" : "apps";
        relativePath = `${targetType}/${projectName}`;
      } else {
        relativePath = projectName;
      }

      const nextSteps =
        installMode === "monorepo"
          ? [`cd ${relativePath}`, `${pm} dev`]
          : [`cd ${relativePath}`, installDeps ? "" : `${pm} install`, `${pm} dev`];

      p.note(nextSteps.filter(Boolean).join("\n"), "Next steps");

      p.outro(pc.green("Happy coding!"));
    } catch (error) {
      logger.debug("Unexpected error:", error);
      p.log.error(formatError(error));
      process.exit(EXIT_CODE.ERROR);
    }
  },
});
