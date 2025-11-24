/**
 * Template stack for grouping templates in the CLI
 * Can be framework-based (nextjs, expo) or use-case-based (cli, library)
 */
export interface TemplateStack {
  /** Unique identifier for the stack */
  id: string;
  /** Display name shown in the CLI */
  name: string;
  /** Short description of the stack */
  description: string;
}

/**
 * Prompt types supported by the CLI
 */
export type PromptType = "text" | "select" | "multiselect" | "confirm";

/**
 * Option for select/multiselect prompts
 */
export interface PromptOption {
  /** Value stored when this option is selected */
  value: string;
  /** Display label shown to user */
  label: string;
  /** Optional hint text shown next to label */
  hint?: string;
}

/**
 * Template-specific prompt configuration
 */
export interface TemplatePrompt {
  /** Type of prompt to display */
  type: PromptType;
  /** Key to store the answer under */
  name: string;
  /** Question/message to display */
  message: string;
  /** Default value if user skips */
  default?: unknown;
  /** Options for select/multiselect prompts */
  options?: PromptOption[];
  /** Validation function - return true for valid, string for error message */
  validate?: (value: unknown) => boolean | string;
}

/**
 * Transform type - builtin or custom from template
 */
export type TransformType = "builtin" | "custom";

/**
 * Built-in transformer names
 */
export type BuiltinTransformer =
  | "rename-package"
  | "toggle-feature"
  | "update-config"
  | "env-setup"
  | "readme-personalize";

/**
 * Template transformation configuration
 */
export interface TemplateTransform {
  /** Whether this is a builtin or custom transformer */
  type: TransformType;
  /** Name of the transformer to use */
  transformer: string;
  /** Options passed to the transformer */
  options?: Record<string, unknown>;
}

/**
 * Post-clone action configuration
 */
export interface PostActionConfig {
  /** Skip git init for this template */
  skipGitInit?: boolean;
  /** Skip dependency installation */
  skipInstall?: boolean;
  /** Custom scripts to run from the template directory */
  customScripts?: string[];
}

/**
 * Full template definition
 */
export interface Template {
  /** Unique identifier */
  id: string;
  /** URL-safe slug for CLI flags (e.g., 'expo-starter') */
  slug: string;
  /** Display name (e.g., 'Expo Starter') */
  name: string;
  /** Short description */
  description: string;
  /** Stack ID this template belongs to */
  stackId: string;
  /** Git URL in giget format (e.g., 'github:org/repo') */
  gitUrl: string;
  /** Specific branch to clone (default: main) */
  branch?: string;
  /** Template-specific prompts */
  prompts: TemplatePrompt[];
  /** Transformations to apply after cloning */
  transforms: TemplateTransform[];
  /** Post-clone action overrides */
  postActions?: PostActionConfig;
  /** Searchable tags */
  tags: string[];
  /** Maintainer name/handle */
  maintainer?: string;
  /** Link to documentation */
  docsUrl?: string;
}

/**
 * User's persistent configuration
 */
export interface UserConfig {
  /** Default author name for new projects */
  author?: string;
  /** Default author email */
  email?: string;
  /** Preferred package manager */
  preferredPackageManager?: PackageManager;
  /** Whether to init git by default */
  defaultGitInit?: boolean;
  /** Whether to install deps by default */
  defaultInstallDeps?: boolean;
}

/**
 * Supported package managers
 */
export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

/**
 * Context passed to transformers
 */
export interface TransformContext {
  /** Absolute path to the cloned project */
  projectPath: string;
  /** Project name chosen by user */
  projectName: string;
  /** All answers collected from prompts */
  answers: Record<string, unknown>;
  /** The template being scaffolded */
  template: Template;
}

/**
 * Transformer interface
 */
export interface Transformer {
  /** Unique name of the transformer */
  name: string;
  /** Description of what this transformer does */
  description: string;
  /** Execute the transformation */
  transform(ctx: TransformContext, options?: Record<string, unknown>): Promise<void>;
}

/**
 * Log levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * CLI options passed via command line
 */
export interface CliOptions {
  /** Template slug to use */
  template?: string;
  /** Skip prompts, use defaults */
  yes?: boolean;
  /** Output directory */
  output?: string;
  /** Enable debug logging */
  debug?: boolean;
}
