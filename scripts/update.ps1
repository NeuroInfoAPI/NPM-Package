# pnpm update -L fuer alle Packages; Core bleibt auf der lokalen Version.
param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'helpers/workspaceHelpers.ps1')
Push-Location -LiteralPath $WorkspaceRoot
try {
    $packages = @(Get-WorkspacePackages)
    $root = [PSCustomObject]@{ Path = (Join-Path $WorkspaceRoot 'package.json'); Manifest = (Get-Content -Raw -LiteralPath 'package.json' | ConvertFrom-Json) }
    $allPackages = @($root) + $packages
    $localNames = @($packages | ForEach-Object { $_.Manifest.name })
    # Use explicit external names so --latest never queries npm for local Core.
    $external = @(@(foreach ($package in $allPackages) {
        foreach ($section in @('dependencies', 'devDependencies', 'optionalDependencies')) {
            if ($package.Manifest.$section) {
                foreach ($property in $package.Manifest.$section.PSObject.Properties) {
                    if ($property.Name -notin $localNames) { $property.Name }
                }
            }
        }
    }) | Sort-Object -Unique)
    if ($DryRun) {
        Write-Host "Would update external dependencies to latest: $($external -join ', ')"
        Write-Host 'Includes the root and all workspace packages; Core stays pinned to its local version.'
    } else {
        Get-Command pnpm.cmd -ErrorAction Stop | Out-Null
        Sync-CoreDependency $allPackages
        if ($external.Count) { Invoke-WorkspacePnpm -Arguments (@('update', '-r', '--include-workspace-root', '-L') + $external) }
        # Reload manifests so new external dependency ranges are preserved.
        $packages = @(Get-WorkspacePackages)
        $root.Manifest = Get-Content -Raw -LiteralPath $root.Path | ConvertFrom-Json
        Sync-CoreDependency (@($root) + $packages)
        Invoke-WorkspacePnpm -Arguments @('install', '--lockfile-only', '--ignore-scripts')
        Write-Host 'Dependencies updated and Core references synchronized.' -ForegroundColor Green
    }
} catch { Write-Host $_ -ForegroundColor Red; exit 1 }
finally { Pop-Location }
