param(
    [ValidateSet('all', 'core', 'native', 'node', 'bun')][string]$Package = 'all',
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'helpers/npmHelpers.ps1')
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$auth = $null
$releaseDirectory = $null
$published = @()
Push-Location -LiteralPath $workspaceRoot
try {
    $order = @('core', 'native', 'node', 'bun')
    $selected = if ($Package -eq 'all') { $order } elseif ($Package -eq 'core') { @('core') } else { @('core', $Package) }
    $manifests = @{}
    foreach ($name in $order) {
        $manifest = Get-Content -Raw -LiteralPath "packages/$name/package.json" | ConvertFrom-Json
        if ($manifest.name -ne "@neuroinfoapi-client/$name" -or $manifest.private -or !$manifest.version) { throw "Invalid release manifest for packages/$name." }
        $manifests[$name] = $manifest
    }
    foreach ($name in @('native', 'node', 'bun')) {
        if ($manifests[$name].dependencies.'@neuroinfoapi-client/core' -ne $manifests['core'].version) { throw "$name must depend on the exact local core version $($manifests['core'].version)." }
    }
    Write-Host 'Cleaning build outputs and checking the workspace...' -ForegroundColor Cyan
    # Delete only these known generated directories after checking their absolute paths.
    $packagesDirectory = Get-Item -LiteralPath (Join-Path $workspaceRoot 'packages')
    if ($packagesDirectory.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing to clean linked packages.' }
    foreach ($name in $order) {
        $packageDirectory = Get-Item -LiteralPath (Join-Path $workspaceRoot "packages/$name")
        if ($packageDirectory.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing to clean a linked package directory.' }
        $dist = Join-Path $packageDirectory.FullName 'dist'
        if (Test-Path -LiteralPath $dist) {
            $item = Get-Item -LiteralPath $dist
            if ($item.FullName -ne $dist -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Unsafe build output path: $dist" }
            if (Get-ChildItem -LiteralPath $dist -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw "Linked entry inside $dist" }
            Remove-Item -LiteralPath $dist -Recurse -Force
        }
    }
    Write-Host (Invoke-NpmChecked -Arguments @('run', 'build'))
    Write-Host (Invoke-NpmChecked -Arguments @('run', 'typecheck'))
    $rootManifest = Get-Content -Raw -LiteralPath 'package.json' | ConvertFrom-Json
    if ($rootManifest.scripts.test) { Write-Host (Invoke-NpmChecked -Arguments @('run', 'test')) }
    $releaseDirectory = Join-Path ([IO.Path]::GetTempPath()) ('nia-release-' + [Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $releaseDirectory | Out-Null
    $artifacts = @{}
    foreach ($name in $selected) {
        $packed = Invoke-NpmChecked -Arguments @('pack', "./packages/$name", '--json', '--ignore-scripts', '--pack-destination', $releaseDirectory)
        $artifact = @($packed | ConvertFrom-Json)[0]
        foreach ($required in @('dist/index.js', 'dist/index.d.ts', 'LICENSE')) {
            if ($required -notin $artifact.files.path) { throw "$name package is missing $required." }
        }
        $artifacts[$name] = $artifact
        Write-Host "Prepared $($artifact.id) ($($artifact.entryCount) files)."
    }
    if ($DryRun) {
        Write-Host "Dry run passed. Publish order: $($selected -join ' -> '). No registry changes." -ForegroundColor Green
    } else {
        $auth = Start-NpmAuthentication
        $pending = @()
        # Preflight all versions before uploading. Identical releases can be resumed.
        foreach ($name in $selected) {
            $artifact = $artifacts[$name]
            $existing = Invoke-Npm -Arguments @('view', $artifact.id, 'dist.integrity', '--json', '--registry=https://registry.npmjs.org/')
            if ($existing.ExitCode -eq 0) {
                $integrity = $existing.Output | ConvertFrom-Json
                if ($integrity -ne $artifact.integrity) { throw "$($artifact.id) already exists with different contents. Bump its version before publishing." }
                Write-Host "$($artifact.id) already has identical contents; skipping."
            } elseif ($existing.Output -match 'E404') { $pending += $name }
            else { throw "Registry check failed for $($artifact.id): $($existing.Output)" }
        }
        foreach ($name in $pending) {
            $artifact = $artifacts[$name]
            $version = $manifests[$name].version
            $tag = if ($version -match '-([0-9A-Za-z-]+)') {
                if ($Matches[1] -match '^[0-9]+$') { 'next' } else { $Matches[1] }
            } else { 'latest' }
            Write-Host "Publishing $($artifact.id) with tag $tag..." -ForegroundColor Cyan
            Write-Host (Invoke-NpmChecked -Arguments @('publish', (Join-Path $releaseDirectory $artifact.filename), '--access', 'public', '--tag', $tag, '--ignore-scripts', '--registry=https://registry.npmjs.org/'))
            $published += $artifact.id
            if ($name -eq 'core' -and $selected.Count -gt 1) {
                $visible = $false
                for ($attempt = 0; $attempt -lt 6; $attempt++) {
                    $check = Invoke-Npm -Arguments @('view', $artifact.id, 'dist.integrity', '--json', '--prefer-online', '--registry=https://registry.npmjs.org/')
                    if ($check.ExitCode -eq 0 -and ($check.Output | ConvertFrom-Json) -eq $artifact.integrity) { $visible = $true; break }
                    Start-Sleep -Seconds 2
                }
                if (!$visible) { throw 'Core was uploaded but is not yet visible. Rerun later; identical versions will be skipped.' }
            }
        }
        Write-Host 'Release complete.' -ForegroundColor Green
    }
} catch {
    if ($published.Count -gt 0) { Write-Host "Already published: $($published -join ', '). These uploads were not rolled back." -ForegroundColor Yellow }
    Write-Host $_ -ForegroundColor Red
    exit 1
} finally {
    Stop-NpmAuthentication -State $auth
    if ($releaseDirectory -and (Test-Path -LiteralPath $releaseDirectory)) {
        $resolvedRelease = (Resolve-Path -LiteralPath $releaseDirectory).Path
        $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
        if (!$resolvedRelease.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path $resolvedRelease -Leaf) -notlike 'nia-release-*') { throw 'Unsafe temporary release directory.' }
        Remove-Item -LiteralPath $resolvedRelease -Recurse -Force
    }
    Pop-Location
}
