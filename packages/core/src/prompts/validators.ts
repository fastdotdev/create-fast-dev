import { VALIDATION } from "@repo/shared";

/**
 * Validate a project name
 */
export function validateProjectName(value: string): string | undefined {
  if (!value || value.trim() === "") {
    return "Project name is required";
  }

  const trimmed = value.trim();

  if (trimmed.length > 214) {
    return "Project name must be less than 214 characters";
  }

  if (!VALIDATION.PROJECT_NAME.test(trimmed)) {
    return "Use lowercase letters, numbers, and dashes only. Must start and end with alphanumeric.";
  }

  return undefined;
}

/**
 * Validate an email address
 */
export function validateEmail(value: string): string | undefined {
  if (!value || value.trim() === "") {
    return undefined; // Email is optional
  }

  if (!VALIDATION.EMAIL.test(value.trim())) {
    return "Please enter a valid email address";
  }

  return undefined;
}

/**
 * Validate that a value is not empty
 */
export function validateRequired(value: string): string | undefined {
  if (!value || value.trim() === "") {
    return "This field is required";
  }
  return undefined;
}

/**
 * Create a validator from a template prompt's validate function
 */
export function createValidator(
  validateFn?: (value: unknown) => boolean | string
): ((value: string) => string | undefined) | undefined {
  if (!validateFn) return undefined;

  return (value: string) => {
    const result = validateFn(value);
    if (result === true) return undefined;
    if (typeof result === "string") return result;
    return "Invalid value";
  };
}
