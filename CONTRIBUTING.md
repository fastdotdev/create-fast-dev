# Contributing to create-fast-dev

Thanks for your interest in contributing!

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 9+

### Getting Started

```bash
# Clone the repo
git clone https://github.com/fastdotdev/create-fast-dev.git
cd create-fast-dev

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Development Workflow

### Running the CLI Locally

**Option 1: Run from source (fastest iteration)**
```bash
# Run CLI directly from TypeScript source - no build needed
pnpm dev:cli --help
pnpm dev:cli list
pnpm dev:cli create my-app -t nextjs-starter
```

**Option 2: Build and link globally**
```bash
# Build and link to test as `create-fast-dev`
pnpm link:cli

# Now you can use it like a real install
create-fast-dev --help
npx create-fast-dev my-app
```

**Option 3: Watch mode**
```bash
# Watch all packages for changes (rebuilds on save)
pnpm dev
```

### Testing in the Playground

The `playground/` directory is gitignored and meant for local testing:

```bash
cd playground
pnpm dev:cli create test-app -t expo-starter
```

## Code Quality

### Linting & Formatting

```bash
# Run ESLint
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Format with Prettier
pnpm format

# Check formatting
pnpm format:check
```

### Pre-commit Hooks

Husky runs lint-staged on commit, which:
- Runs ESLint with auto-fix on `.ts` files
- Formats with Prettier

### Type Checking

```bash
pnpm typecheck
```

### Running Tests

```bash
# Watch mode
pnpm test

# Run once
pnpm test:run
```

## Project Structure

```
create-fast-dev/
├── packages/
│   ├── shared/     # Types, constants (@repo/shared)
│   ├── core/       # Business logic (@repo/core)
│   └── cli/        # CLI entry point (create-fast-dev)
├── playground/     # Local testing (gitignored)
└── .changeset/     # Changesets for versioning
```

## Adding a New Template

Templates are defined in `packages/core/src/templates/registry.ts`:

```typescript
{
  id: 'my-template',
  slug: 'my-template',
  name: 'My Template',
  description: 'Description here',
  categoryId: CATEGORIES.WEB,
  gitUrl: 'github:fastdotdev/template-stack-details',
  prompts: [
    // Template-specific prompts
  ],
  transforms: [
    { type: 'builtin', transformer: 'rename-package' },
  ],
  tags: ['tag1', 'tag2'],
}
```

## Creating a Release

We use [Changesets](https://github.com/changesets/changesets) for versioning:

```bash
# Create a changeset
pnpm changeset

# Version packages (CI does this automatically)
pnpm version

# Publish (CI does this automatically)
pnpm release
```

## Pull Request Guidelines

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm lint && pnpm test:run && pnpm typecheck`
4. Create a changeset if your change affects published packages
5. Open a PR with a clear description

## Questions?

Open an issue or discussion on GitHub.
