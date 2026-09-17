# Scripts

Run from the repository root with dependencies installed. Requires pnpm, Node/npm,
Bun and Windows PowerShell.

## Releases

```powershell
pnpm run publishPackage -- -DryRun       # Build, typecheck and pack locally
pnpm run publishPackage                 # Publish all packages, Core first
pnpm run publishPackage -- -Package node # Publish Core and Node only
pnpm run deprecatePackage               # Choose package, versions and message
```

Publishing prompts for an npm token and skips identical published versions;
changed contents require a version bump. Stable releases use `latest`, prereleases
their identifier (`beta`, `rc`, etc.) or `next` for numeric identifiers.

Deprecation targets `core`, `native`, `node`, `bun`, or `legacy`
(`neuroinfoapi-client`). Both commands accept `-DryRun` without registry changes;
publish permissions are not checked.

## Maintenance

```powershell
pnpm run clean -- -WhatIf              # Preview dist/node_modules removals
pnpm run clean                        # Remove them throughout the repository
pnpm run setVersions                  # Show versions and prompt for a new one
pnpm run setVersions -- -Version 2.7.0 # Set all package versions and Core references
pnpm run update                       # Upgrade external dependencies, including majors
```

After cleaning, run `pnpm install` and `npm run build`.

`setVersions` and `update` synchronize Core references and refresh the lockfile;
both support `-DryRun`. Run build/typecheck after dependency updates.
