# publishAsk.ps1

# Prevent recursive invocation when npm publish triggers the package "publish" lifecycle script.
if ($env:NIAC_PUBLISH_WRAPPER_ACTIVE -eq "1") {
    exit 0
}

$plainToken = Read-Host -Prompt "NPM Auth Token (keep empty to use existing npm auth config)"
$tempNpmrc = $null

try {
    if (-not [string]::IsNullOrWhiteSpace($plainToken)) {
        $tempNpmrc = Join-Path $env:TEMP ("npmrc-publish-" + [Guid]::NewGuid().ToString() + ".npmrc")

        Set-Content -Path $tempNpmrc -Encoding ASCII -Value @(
            "registry=https://registry.npmjs.org/"
            '//registry.npmjs.org/:_authToken=${NPM_TOKEN}'
            "always-auth=true"
        )

        $env:NPM_TOKEN = $plainToken
        $env:NPM_CONFIG_USERCONFIG = $tempNpmrc
    }

    Write-Host "Building & Publishing..." -ForegroundColor Cyan

    $env:NIAC_PUBLISH_WRAPPER_ACTIVE = "1"
    npm publish 2>&1 | Tee-Object -Variable publishOutput | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Published successfully!" -ForegroundColor Green
    } else {
        if ($publishOutput -match "Two-factor authentication|bypass 2fa") {
            Write-Host "Publish blocked by npm security policy." -ForegroundColor Yellow
            Write-Host "Use a granular token with active 'bypass 2fa' for publishing." -ForegroundColor Yellow
        } elseif ($publishOutput -match "ENEEDAUTH|need auth") {
            Write-Host "No valid npm auth found. Either enter a token or run 'npm adduser' in the same user profile." -ForegroundColor Yellow
        }
        Write-Host "Publish failed (exit code $LASTEXITCODE)" -ForegroundColor Red
    }
} finally {
    Remove-Item Env:NPM_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:NPM_CONFIG_USERCONFIG -ErrorAction SilentlyContinue
    Remove-Item Env:NIAC_PUBLISH_WRAPPER_ACTIVE -ErrorAction SilentlyContinue

    if (Test-Path $tempNpmrc) {
        Remove-Item $tempNpmrc -Force -ErrorAction SilentlyContinue
    }

    $plainToken = $null
    Write-Host "Token removed." -ForegroundColor DarkGray
}