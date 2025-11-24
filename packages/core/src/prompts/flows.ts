import * as p from "@clack/prompts";
import type { Template, TemplatePrompt } from "@repo/shared";

import { getConfig } from "../config/index.js";
import { getAllTemplates, getTemplatesByStack, stacks } from "../templates/index.js";
import { createValidator, validateProjectName } from "./validators.js";

/**
 * Check if the user cancelled a prompt
 */
export function handleCancel<T>(value: T | symbol): value is symbol {
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }
  return false;
}

/**
 * Prompt for template selection with stack grouping
 */
export async function promptTemplateSelection(): Promise<Template> {
  // First, select a stack
  const stackOptions = stacks.map((stack) => ({
    value: stack.id,
    label: stack.name.trim(),
    hint: stack.description,
  }));

  const stackId = await p.select({
    message: "What's your stack?",
    options: stackOptions,
  });

  if (handleCancel(stackId)) {
    process.exit(0);
  }

  // Then, select a template from that stack
  const stackTemplates = getTemplatesByStack(stackId as string);

  if (stackTemplates.length === 0) {
    p.log.warn("No templates available for this stack");
    // Fall back to showing all templates
    const allTemplates = getAllTemplates();
    return promptFromTemplateList(allTemplates);
  }

  // If only one template, select it automatically
  if (stackTemplates.length === 1 && stackTemplates[0]) {
    return stackTemplates[0];
  }

  return promptFromTemplateList(stackTemplates);
}

/**
 * Prompt user to select from a list of templates
 */
async function promptFromTemplateList(templates: Template[]): Promise<Template> {
  const templateOptions = templates.map((t) => ({
    value: t.slug,
    label: t.name,
    hint: t.description,
  }));

  const slug = await p.select({
    message: "Select a template",
    options: templateOptions,
  });

  if (handleCancel(slug)) {
    process.exit(0);
  }

  const template = templates.find((t) => t.slug === slug);
  if (!template) {
    throw new Error(`Template not found: ${slug}`);
  }

  return template;
}

/**
 * Prompt for project name
 */
export async function promptProjectName(defaultName?: string): Promise<string> {
  const name = await p.text({
    message: "Project name",
    placeholder: defaultName ?? "my-project",
    validate: validateProjectName,
  });

  if (handleCancel(name)) {
    process.exit(0);
  }

  return name as string;
}

/**
 * Run a single template prompt
 */
async function runTemplatePrompt(prompt: TemplatePrompt): Promise<unknown> {
  const validator = createValidator(prompt.validate);

  switch (prompt.type) {
    case "text": {
      const value = await p.text({
        message: prompt.message,
        placeholder: prompt.default as string | undefined,
        defaultValue: prompt.default as string | undefined,
        validate: validator,
      });
      if (handleCancel(value)) process.exit(0);
      return value;
    }

    case "confirm": {
      const value = await p.confirm({
        message: prompt.message,
        initialValue: (prompt.default as boolean) ?? false,
      });
      if (handleCancel(value)) process.exit(0);
      return value;
    }

    case "select": {
      if (!prompt.options?.length) {
        throw new Error(`Select prompt "${prompt.name}" has no options`);
      }
      const value = await p.select({
        message: prompt.message,
        options: prompt.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          hint: opt.hint,
        })),
        initialValue: prompt.default as string | undefined,
      });
      if (handleCancel(value)) process.exit(0);
      return value;
    }

    case "multiselect": {
      if (!prompt.options?.length) {
        throw new Error(`Multiselect prompt "${prompt.name}" has no options`);
      }
      const value = await p.multiselect({
        message: prompt.message,
        options: prompt.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          hint: opt.hint,
        })),
        initialValues: (prompt.default as string[]) ?? [],
        required: false,
      });
      if (handleCancel(value)) process.exit(0);
      return value;
    }

    default:
      throw new Error(`Unknown prompt type: ${prompt.type}`);
  }
}

/**
 * Run all prompts for a template and collect answers
 */
export async function runTemplatePrompts(
  template: Template,
  skipPrompts = false
): Promise<Record<string, unknown>> {
  const answers: Record<string, unknown> = {};

  // Pre-fill from user config
  const savedAuthor = getConfig("author");
  if (savedAuthor) {
    answers["author"] = savedAuthor;
  }

  // Skip prompts if requested (use defaults)
  if (skipPrompts) {
    for (const prompt of template.prompts) {
      if (prompt.default !== undefined) {
        answers[prompt.name] = prompt.default;
      }
    }
    return answers;
  }

  // Run each prompt
  for (const prompt of template.prompts) {
    // Skip projectName if already set
    if (prompt.name === "projectName" && answers["projectName"]) {
      continue;
    }

    const value = await runTemplatePrompt(prompt);
    answers[prompt.name] = value;
  }

  return answers;
}

/**
 * Prompt for post-action preferences
 */
export async function promptPostActions(): Promise<{
  installDeps: boolean;
  initGit: boolean;
}> {
  const defaultInstallDeps = getConfig("defaultInstallDeps") ?? true;
  const defaultGitInit = getConfig("defaultGitInit") ?? true;

  const installDeps = await p.confirm({
    message: "Install dependencies?",
    initialValue: defaultInstallDeps,
  });
  if (handleCancel(installDeps)) process.exit(0);

  const initGit = await p.confirm({
    message: "Initialize git repository?",
    initialValue: defaultGitInit,
  });
  if (handleCancel(initGit)) process.exit(0);

  return {
    installDeps: installDeps as boolean,
    initGit: initGit as boolean,
  };
}
