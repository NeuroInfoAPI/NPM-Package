param(
    [ValidateSet('core', 'native', 'node', 'bun', 'legacy')][string]$Package,
    [string]$VersionRange,
    [string]$Message,
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'helpers/npmHelpers.ps1')
$auth = $null
try {
    if (!$Package) { $Package = Read-Host 'Package to deprecate (core/native/node/bun/legacy)' }
    if ($Package -notin @('core', 'native', 'node', 'bun', 'legacy')) { throw 'Choose one package explicitly.' }
    $packageName = if ($Package -eq 'legacy') { 'neuroinfoapi-client' } else { "@neuroinfoapi-client/$Package" }
    if (!$VersionRange) { $VersionRange = Read-Host 'Package version or range to deprecate (required)' }
    if (!$Message) { $Message = Read-Host 'Deprecation message (required)' }
    if ([string]::IsNullOrWhiteSpace($VersionRange) -or [string]::IsNullOrWhiteSpace($Message)) { throw 'A version range and message are required.' }
    $spec = "${packageName}@${VersionRange}"
    Write-Host "Deprecate $spec with message: $Message" -ForegroundColor Cyan
    if ($DryRun) { Write-Host 'Dry run only. No registry changes.' -ForegroundColor Green }
    else {
        $auth = Start-NpmAuthentication
        Write-Host (Invoke-NpmChecked -Arguments @('deprecate', $spec, $Message, '--registry=https://registry.npmjs.org/'))
        Write-Host 'Deprecated successfully.' -ForegroundColor Green
    }
} catch { Write-Host $_ -ForegroundColor Red; exit 1 }
finally { Stop-NpmAuthentication -State $auth }
