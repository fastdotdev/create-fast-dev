import { access, constants } from "node:fs/promises";
import { resolve } from "node:path";

import * as p from "@clack/prompts";
import {
  CLI_NAME,
  createLogger,
  detectPackageManager,
  EXIT_CODE,
  fetchTemplate,
  getConfig,
  getTemplateBySlug,
  initializeGit,
  installDependencies,
  promptPostActions,
  promptProjectName,
  promptTemplateSelection,
  runTemplatePrompts,
  runTransformations,
} from "@repo/core";
import { defineCommand } from "citty";
import pc from "picocolors";

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
  },
  async run({ args }) {
    const logger = createLogger({ debug: args.debug });

    // Start the UI
    p.intro(pc.bgCyan(pc.black(` ${CLI_NAME} `)));

    try {
      // Get project name from positional arg or prompt
      let projectName = args.name;

      // Select template
      const template = args.template
        ? getTemplateBySlug(args.template)
        : await promptTemplateSelection();

      if (!template) {
        if (args.template) {
          p.log.error(`Template not found: ${args.template}`);
          p.log.info("Run with --help to see available templates");
        }
        process.exit(EXIT_CODE.ERROR);
      }

      logger.debug(`Selected template: ${template.slug}`);

      // Get project name if not provided
      if (!projectName) {
        projectName = await promptProjectName(template.slug);
      }

      // Validate project name format
      if (!/^[a-z0-9-]+$/.test(projectName)) {
        p.log.error("Project name must be lowercase alphanumeric with dashes");
        process.exit(EXIT_CODE.ERROR);
      }

      // Determine output directory
      const outputDir = args.output
        ? resolve(args.output, projectName)
        : resolve(process.cwd(), projectName);

      // Check if directory exists
      try {
        await access(outputDir, constants.F_OK);
        p.log.error(`Directory already exists: ${outputDir}`);
        process.exit(EXIT_CODE.ERROR);
      } catch {
        // Directory doesn't exist, good
      }

      // Run template prompts
      const answers = await runTemplatePrompts(template, args.yes);
      answers["projectName"] = projectName;

      // Add author from config if available
      const savedAuthor = getConfig("author");
      if (savedAuthor && !answers["author"]) {
        answers["author"] = savedAuthor;
      }

      logger.debug("Collected answers:", answers);

      // Determine post-actions
      let installDeps = !args["no-install"];
      let initGit = !args["no-git"];

      if (!args.yes && !args["no-install"] && !args["no-git"]) {
        const postActions = await promptPostActions();
        installDeps = postActions.installDeps;
        initGit = postActions.initGit;
      }

      // Start the spinner
      const s = p.spinner();

      // Clone template
      s.start("Downloading template...");
      logger.debug(`Fetching template from ${template.gitUrl}`);

      try {
        await fetchTemplate(template, {
          dir: outputDir,
          force: false,
        });
        s.stop("Template downloaded");
      } catch (error) {
        s.stop("Failed to download template");
        logger.error("Template fetch error:", error);
        p.log.error(
          error instanceof Error ? error.message : "Failed to download template"
        );
        process.exit(EXIT_CODE.ERROR);
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
          },
          logger
        );
        s.stop("Customizations applied");
      } catch (error) {
        s.stop("Failed to apply customizations");
        logger.error("Transform error:", error);
        p.log.error(
          error instanceof Error ? error.message : "Failed to apply customizations"
        );
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
        const pm =
          getConfig("preferredPackageManager") ?? (await detectPackageManager(outputDir));
        s.start(`Installing dependencies with ${pm}...`);

        const installResult = await installDependencies({
          dir: outputDir,
          packageManager: pm,
          stdio: "pipe",
        });

        if (installResult.success) {
          s.stop("Dependencies installed");
        } else {
          s.stop("Dependency installation failed");
          logger.warn("Install failed:", installResult.error);
          p.log.warn(`Failed to install dependencies: ${installResult.error}`);
          p.log.info(`You can install manually: cd ${projectName} && ${pm} install`);
        }
      }

      // Success message
      const pm = await detectPackageManager(outputDir);
      const relativePath = projectName;

      p.note(
        [`cd ${relativePath}`, installDeps ? "" : `${pm} install`, `${pm} dev`]
          .filter(Boolean)
          .join("\n"),
        "Next steps"
      );

      p.outro(pc.green("Happy coding! 🚀"));
    } catch (error) {
      logger.error("Unexpected error:", error);
      p.log.error(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      process.exit(EXIT_CODE.ERROR);
    }
  },
});
