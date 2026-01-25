// Templates
export type { FetchOptions, FetchResult } from "./templates/index.js";
export {
  cleanupTemplateConfig,
  clearRegistryCache,
  createFallbackTemplate,
  createTemplateFromConfig,
  fetchRemoteRegistry,
  fetchTemplate,
  getAllTemplates,
  getRemoteTemplateBySlug,
  getRemoteTemplates,
  getStackById,
  getTemplateBySlug,
  getTemplatesByStack,
  loadTemplateConfig,
  mergeConfigIntoTemplate,
  registryTemplateToTemplate,
  searchRemoteTemplates,
  searchTemplates,
  stacks,
  templates,
  validateTemplateUrl,
} from "./templates/index.js";

// Monorepo detection
export {
  detectMonorepo,
  getAppsDir,
  getPackagesDir,
  getTargetDir,
} from "./monorepo/index.js";

// Transforms
export {
  envSetupTransformer,
  getTransformer,
  listTransformers,
  monorepoAdaptTransformer,
  readmePersonalizeTransformer,
  registerTransformer,
  renamePackageTransformer,
  runTransformations,
  toggleFeatureTransformer,
  tsconfigAdaptTransformer,
} from "./transform/index.js";

// Config
export {
  deleteConfig,
  getAllConfig,
  getConfig,
  getConfigPath,
  getConfigStore,
  resetConfig,
  setConfig,
} from "./config/index.js";

// Logger
export type { Logger, LoggerOptions } from "./logger/index.js";
export { createLogger, getLogDir, getLogFilePath } from "./logger/index.js";

// Post-actions
export {
  detectFromEnvironment,
  detectFromLockfile,
  detectFromPackageJson,
  detectPackageManager,
  initializeGit,
  installDependencies,
} from "./post-actions/index.js";

// Prompts
export {
  createValidator,
  handleCancel,
  promptPostActions,
  promptProjectName,
  promptTemplateSelection,
  runTemplatePrompts,
  validateEmail,
  validateProjectName,
  validateRequired,
} from "./prompts/index.js";

// Re-export types from shared
export type {
  CliOptions,
  InstallationMode,
  MonorepoConfig,
  MonorepoContext,
  MonorepoTargetType,
  PackageManager,
  RegistryTemplate,
  Template,
  TemplateConfig,
  TemplatePrompt,
  TemplateRegistry,
  TemplateStack,
  TemplateTransform,
  TransformContext,
  Transformer,
  UserConfig,
} from "@repo/shared";

// Re-export constants from shared
export {
  CLI_NAME,
  CLI_VERSION,
  DEFAULT_PACKAGE_MANAGER,
  EXIT_CODE,
  STACKS,
} from "@repo/shared";
