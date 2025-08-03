# pnpm Usage Guide

This project uses pnpm as the package manager for better performance and workspace management.

## Why pnpm?

- **Faster**: Up to 2x faster than npm
- **Disk Efficient**: Saves disk space with content-addressable storage
- **Strict**: Better dependency resolution
- **Workspace Support**: Excellent monorepo support

## Installation

```bash
# Install pnpm globally
npm install -g pnpm

# Or use npx (no global install needed)
npx pnpm install
```

## Common Commands

### Project Setup
```bash
# Install all dependencies in workspace
pnpm install

# Install dependencies for specific workspace
pnpm --filter vue-demo install
pnpm --filter react-demo install
```

### Development
```bash
# Run Vue demo
pnpm run dev:vue

# Run React demo
pnpm run dev:react

# Build main library
pnpm run build

# Build all packages
pnpm run build:all
```

### Testing
```bash
# Run tests
pnpm test

# Run tests with UI
pnpm run test:ui

# Run coverage
pnpm run coverage
```

### Package Management
```bash
# Add dependency to root
pnpm add lodash

# Add dev dependency to root
pnpm add -D typescript

# Add dependency to specific workspace
pnpm --filter vue-demo add vue-router
pnpm --filter react-demo add react-router-dom

# Remove dependency
pnpm remove lodash
pnpm --filter vue-demo remove vue-router
```

### Workspace Commands
```bash
# Run command in all workspaces
pnpm -r run build

# Run command in specific workspace
pnpm --filter vue-demo dev
pnpm --filter react-demo build

# List all workspaces
pnpm list -r --depth=-1
```

## Project Structure

```
virtual-scroll/
├── package.json              # Root package
├── pnpm-workspace.yaml       # Workspace configuration
├── pnpm-lock.yaml           # Lock file (auto-generated)
├── .npmrc                   # pnpm configuration
├── demos/
│   ├── vue-demo/
│   │   └── package.json     # Vue demo package
│   └── react-demo/
│       └── package.json     # React demo package
└── src/                     # Main library source
```

## Configuration Files

### pnpm-workspace.yaml
Defines which directories are part of the workspace.

### .npmrc
Contains pnpm-specific configuration:
- `auto-install-peers=true`: Automatically install peer dependencies
- `prefer-workspace-packages=true`: Prefer local workspace packages

## Migration from npm

If you have npm-related files, clean them up:

```bash
# Remove npm lock files
rm -f package-lock.json
find . -name "package-lock.json" -delete

# Remove node_modules and reinstall with pnpm
rm -rf node_modules
pnpm install
```

## Troubleshooting

### Clear Cache
```bash
pnpm store prune
```

### Rebuild Dependencies
```bash
pnpm rebuild
```

### Check Store Status
```bash
pnpm store status
```

### Update Dependencies
```bash
# Update all dependencies
pnpm update

# Update specific dependency
pnpm update lodash

# Update in specific workspace
pnpm --filter vue-demo update vue
```

## Best Practices

1. **Always use pnpm** instead of npm/yarn
2. **Run from root** for workspace commands
3. **Use filters** for workspace-specific operations
4. **Keep .npmrc** for consistent behavior
5. **Don't commit pnpm-lock.yaml** (optional, depends on team preference)

## Performance Benefits

- **Installation Speed**: ~2x faster than npm
- **Disk Usage**: Up to 90% space savings
- **Cache Efficiency**: Global content-addressable store
- **Network Efficiency**: Parallel downloads