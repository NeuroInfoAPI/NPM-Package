# Shared workspace operations; paths are independent of the caller's directory.
$WorkspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
function Get-WorkspacePackages {
    $packagesPath = Join-Path $WorkspaceRoot 'packages'
    if ((Get-Item -LiteralPath $packagesPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked packages directory is not supported.' }
    foreach ($directory in Get-ChildItem -LiteralPath $packagesPath -Directory) {
        if ($directory.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked package directory: $($directory.FullName)" }
        $file = Join-Path $directory.FullName 'package.json'
        if (Test-Path -LiteralPath $file) {
            [PSCustomObject]@{ Path = $file; Manifest = (Get-Content -Raw -LiteralPath $file | ConvertFrom-Json) }
        }
    }
}
function Write-WorkspaceManifest {
    param($Package)
    $arguments = @((Join-Path $PSScriptRoot 'writeManifest.mjs'), $Package.Path)
    if ($Package.Manifest.PSObject.Properties['version']) { $arguments += "version=$($Package.Manifest.version)" }
    foreach ($section in @('dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies')) {
        $dependencies = $Package.Manifest.$section
        if ($dependencies -and $dependencies.PSObject.Properties['@neuroinfoapi-client/core']) {
            $arguments += "${section}=$($dependencies.'@neuroinfoapi-client/core')"
        }
    }
    & node @arguments
    if ($LASTEXITCODE -ne 0) { throw "Could not update manifest: $($Package.Path)" }
}
function Sync-CoreDependency {
    param($Packages)
    $core = @($Packages | Where-Object { $_.Manifest.name -eq '@neuroinfoapi-client/core' })
    if ($core.Count -ne 1 -or !$core[0].Manifest.version) { throw 'Expected exactly one local Core package with a version.' }
    $version = $core[0].Manifest.version
    foreach ($package in $Packages) {
        $changed = $false
        foreach ($section in @('dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies')) {
            $dependencies = $package.Manifest.$section
            if ($dependencies -and $dependencies.PSObject.Properties['@neuroinfoapi-client/core']) {
                if ($dependencies.'@neuroinfoapi-client/core' -ne $version) {
                    $dependencies.'@neuroinfoapi-client/core' = $version
                    $changed = $true
                }
            }
        }
        if ($changed) { Write-WorkspaceManifest $package }
    }
    Write-Host "Core dependencies pinned to $version."
}
function Invoke-WorkspacePnpm {
    param([string[]]$Arguments)
    $ErrorActionPreference = 'Continue'
    & pnpm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) { throw "pnpm $($Arguments -join ' ') failed (exit code $LASTEXITCODE)." }
}
