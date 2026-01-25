# create-fast-dev

A CLI tool to scaffold projects from fast-dev templates.

## Installation

Run directly with npx (recommended):

```bash
npx create-fast-dev
```

Or install globally:

```bash
# npm
npm install -g create-fast-dev

# pnpm
pnpm add -g create-fast-dev

# yarn
yarn global add create-fast-dev
```

## Quick Start

```bash
# Interactive mode - prompts for template and project name
npx create-fast-dev

# Specify project name
npx create-fast-dev my-app

# Specify template
npx create-fast-dev my-app --template nextjs-starter
```

## Commands

### create (default)

Create a new project from a template.

```bash
npx create-fast-dev [name] [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--template <slug>` | `-t` | Template to use (e.g., nextjs-starter) |
| `--yes` | `-y` | Skip prompts and use defaults |
| `--output <dir>` | `-o` | Output directory (default: current directory) |
| `--no-install` | | Skip dependency installation |
| `--no-git` | | Skip git initialization |
| `--monorepo` | `-m` | Force monorepo mode |
| `--no-monorepo` | | Disable monorepo mode even if detected |
| `--target <dir>` | | Target directory in monorepo (`apps` or `packages`) |
| `--debug` | | Enable debug logging |

### list

List available templates.

```bash
npx create-fast-dev list [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--stack <name>` | `-s` | Filter by stack |
| `--json` | | Output as JSON |

### config

Manage user configuration.

```bash
# Get a value
npx create-fast-dev config get <key>

# Set a value
npx create-fast-dev config set <key> <value>

# List all config
npx create-fast-dev config list [--json]

# Delete a value
npx create-fast-dev config delete <key>

# Reset all config
npx create-fast-dev config reset

# Show config file path
npx create-fast-dev config path
```

## Available Stacks

Templates are organized by stack:

- **nextjs** - Next.js web applications
- **expo** - Expo/React Native mobile apps
- **hono** - Hono API servers
- **cli** - Command-line tools
- **library** - Reusable packages/libraries
- **monorepo** - Turborepo monorepo setups

Use `npx create-fast-dev list` to see all available templates.

## Configuration

Store your preferences to skip repetitive prompts:

```bash
# Set author name (used in package.json)
npx create-fast-dev config set author "Your Name"

# Set email
npx create-fast-dev config set email "you@example.com"

# Set preferred package manager (npm, yarn, pnpm, bun)
npx create-fast-dev config set preferredPackageManager pnpm

# Set default for git initialization (true/false)
npx create-fast-dev config set defaultGitInit true

# Set default for dependency installation (true/false)
npx create-fast-dev config set defaultInstallDeps true
```

**Valid config keys:**
- `author` - Author name for package.json
- `email` - Author email
- `preferredPackageManager` - npm, yarn, pnpm, or bun
- `defaultGitInit` - Auto-initialize git (true/false)
- `defaultInstallDeps` - Auto-install dependencies (true/false)

## Monorepo Support

The CLI automatically detects Turborepo monorepos and adapts its behavior:

- Projects are placed in `apps/` or `packages/` directories
- Git initialization is skipped (uses monorepo's git)
- Dependencies are installed from the monorepo root

### Manual control

```bash
# Force monorepo mode
npx create-fast-dev my-app --monorepo

# Disable monorepo detection
npx create-fast-dev my-app --no-monorepo

# Specify target directory
npx create-fast-dev my-lib --target packages
```

i
