# publishAsk.ps1
# Auth is ephemeral only: token stays in process memory for this run and is cleared in finally.
# No token is written to the project, user profile, or npm config.

# Prevent recursive invocation when npm publish triggers the package "publish" lifecycle script.
if ($env:NIAC_PUBLISH_WRAPPER_ACTIVE -eq "1") {
    exit 0
}

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
    $plainToken = Read-NpmToken
    if ([string]::IsNullOrWhiteSpace($plainToken)) {
        Write-Host "NPM auth token is required." -ForegroundColor Red
        exit 1
    }

    $tempNpmrc = Join-Path $env:TEMP ("npmrc-publish-" + [Guid]::NewGuid().ToString() + ".npmrc")
    Set-Content -Path $tempNpmrc -Encoding ASCII -Value @(
        "registry=https://registry.npmjs.org/"
        '//registry.npmjs.org/:_authToken=${NPM_TOKEN}'
        "always-auth=true"
    )

    $env:NPM_TOKEN = $plainToken
    $env:NPM_CONFIG_USERCONFIG = $tempNpmrc

    Write-Host "Building & Publishing..." -ForegroundColor Cyan

    $buildResult = Invoke-Npm --loglevel error run build
    if ($buildResult.ExitCode -ne 0) {
        $buildResult.Output | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        Write-Host "Build failed (exit code $($buildResult.ExitCode))" -ForegroundColor Red
        exit $buildResult.ExitCode
    }

    $env:NIAC_PUBLISH_WRAPPER_ACTIVE = "1"
    $publishResult = Invoke-Npm --loglevel error publish

    if ($publishResult.ExitCode -eq 0) {
        Write-Host "Published successfully!" -ForegroundColor Green
    } else {
        $publishResult.Output | ForEach-Object { Write-Host $_ -ForegroundColor Red }

        $outputText = $publishResult.Output | Out-String
        if ($outputText -match "Two-factor authentication|bypass 2fa") {
            Write-Host "Publish blocked by npm security policy." -ForegroundColor Yellow
            Write-Host "Use a granular token with active 'bypass 2fa' for publishing." -ForegroundColor Yellow
        } elseif (Test-NpmAuthHint $publishResult.Output) {
            Write-Host "Invalid or unauthorized npm token." -ForegroundColor Yellow
        }

        Write-Host "Publish failed (exit code $($publishResult.ExitCode))" -ForegroundColor Red
        exit $publishResult.ExitCode
    }
} finally {
    Remove-Item Env:NPM_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:NPM_CONFIG_USERCONFIG -ErrorAction SilentlyContinue
    Remove-Item Env:NIAC_PUBLISH_WRAPPER_ACTIVE -ErrorAction SilentlyContinue

    if ($tempNpmrc -and (Test-Path $tempNpmrc)) {
        Remove-Item $tempNpmrc -Force -ErrorAction SilentlyContinue
    }

    $plainToken = $null
    Write-Host "Token cleared from memory." -ForegroundColor DarkGray
}
