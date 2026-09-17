# Aktuelle Versionen anzeigen, Eingabe abfragen, alle Packages und Core-Referenzen setzen.
param([string]$Version, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'helpers/workspaceHelpers.ps1')
$backup = @{}
Push-Location -LiteralPath $WorkspaceRoot
try {
    $packages = @(Get-WorkspacePackages)
    if (!$packages.Count) { throw 'No workspace packages found.' }
    foreach ($package in $packages) { Write-Host "$($package.Manifest.name): $($package.Manifest.version)" }
    if (!$Version) { $Version = Read-Host 'New version for all packages (e.g. 2.7.0 or 2.7.0-beta.1)' }
    # Strict SemVer: no v prefix, ranges, whitespace or leading zeroes in numeric identifiers.
    $number = '(0|[1-9][0-9]*)'
    $identifier = '(0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)'
    if ($Version -cnotmatch "\A$number\.$number\.$number(?:-$identifier(?:\.$identifier)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?\z") { throw "Invalid SemVer version: $Version" }
    if ($DryRun) { Write-Host "Would set all package versions and Core dependencies to $Version and refresh pnpm-lock.yaml." }
    else {
        Get-Command pnpm.cmd -ErrorAction Stop | Out-Null
        $lock = Join-Path $WorkspaceRoot 'pnpm-lock.yaml'
        foreach ($file in @($packages.Path) + @($lock)) {
            $backup[$file] = if (Test-Path -LiteralPath $file) { [IO.File]::ReadAllBytes($file) } else { $null }
        }
        foreach ($package in $packages) {
            $package.Manifest | Add-Member -NotePropertyName version -NotePropertyValue $Version -Force
            Write-WorkspaceManifest $package
        }
        Sync-CoreDependency $packages
        Invoke-WorkspacePnpm -Arguments @('install', '--lockfile-only', '--ignore-scripts')
        Write-Host "All package versions set to $Version; lockfile updated." -ForegroundColor Green
    }
} catch {
    foreach ($file in $backup.Keys) {
        if ($null -eq $backup[$file]) { if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force } }
        else { [IO.File]::WriteAllBytes($file, $backup[$file]) }
    }
    Write-Host $_ -ForegroundColor Red
    exit 1
} finally { Pop-Location }
