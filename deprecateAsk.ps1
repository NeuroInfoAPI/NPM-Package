# deprecateAsk.ps1
# Auth is ephemeral only: token stays in process memory for this run and is cleared in finally.
# No token is written to the project, user profile, or npm config.

$ErrorActionPreference = "Stop"
$plainToken = $null
$tempNpmrc = $null

function Read-NpmToken {
    $secure = Read-Host -Prompt "NPM Auth Token (hidden input, required)" -AsSecureString
    if ($secure.Length -eq 0) {
        $secure.Dispose()
        return $null
    }

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        $secure.Dispose()
    }
}

function Invoke-Npm {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$NpmArguments
    )

    $output = & npm @NpmArguments 2>&1
    $exitCode = $LASTEXITCODE

    if ($null -eq $exitCode -or $exitCode -eq "") {
        $exitCode = if (($output | Out-String) -match "npm error") { 1 } else { 0 }
    }

    return [PSCustomObject]@{
        Output   = $output
        ExitCode = [int]$exitCode
    }
}

function Test-NpmAuthHint {
    param([object[]]$Output)

    $text = ($Output | Out-String)
    return $text -match "ENEEDAUTH|need auth|E401|403 Forbidden|does not have permission"
}

try {
    $packageName = (Get-Content -Raw (Join-Path $PSScriptRoot "package.json") | ConvertFrom-Json).name
    $versionRange = Read-Host -Prompt "Package version or range to deprecate (required)"
    if ([string]::IsNullOrWhiteSpace($versionRange)) {
        Write-Host "A package version or range is required." -ForegroundColor Red
        exit 1
    }

    $message = Read-Host -Prompt "Deprecation message (required)"
    if ([string]::IsNullOrWhiteSpace($message)) {
        Write-Host "A deprecation message is required." -ForegroundColor Red
        exit 1
    }

    $plainToken = Read-NpmToken
    if ([string]::IsNullOrWhiteSpace($plainToken)) {
        Write-Host "NPM auth token is required." -ForegroundColor Red
        exit 1
    }

    $tempNpmrc = Join-Path $env:TEMP ("npmrc-deprecate-" + [Guid]::NewGuid().ToString() + ".npmrc")
    Set-Content -Path $tempNpmrc -Encoding ASCII -Value @(
        "registry=https://registry.npmjs.org/"
        '//registry.npmjs.org/:_authToken=${NPM_TOKEN}'
        "always-auth=true"
    )

    $env:NPM_TOKEN = $plainToken
    $env:NPM_CONFIG_USERCONFIG = $tempNpmrc

    Write-Host "Deprecating $packageName@$versionRange..." -ForegroundColor Cyan
    $deprecateResult = Invoke-Npm --loglevel error deprecate "$packageName@$versionRange" $message

    if ($deprecateResult.ExitCode -eq 0) {
        Write-Host "Deprecated successfully!" -ForegroundColor Green
    } else {
        $deprecateResult.Output | ForEach-Object { Write-Host $_ -ForegroundColor Red }

        if (Test-NpmAuthHint $deprecateResult.Output) {
            Write-Host "Invalid or unauthorized npm token." -ForegroundColor Yellow
        }

        Write-Host "Deprecation failed (exit code $($deprecateResult.ExitCode))" -ForegroundColor Red
        exit $deprecateResult.ExitCode
    }
} finally {
    Remove-Item Env:NPM_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:NPM_CONFIG_USERCONFIG -ErrorAction SilentlyContinue

    if ($tempNpmrc -and (Test-Path $tempNpmrc)) {
        Remove-Item $tempNpmrc -Force -ErrorAction SilentlyContinue
    }

    $plainToken = $null
    Write-Host "Token cleared from memory." -ForegroundColor DarkGray
}
