# publishAsk.ps1

$plainToken = Read-Host -Prompt "NPM Auth Token (leer lassen fuer bestehendes npm adduser Login)"
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

    Write-Host "Publishing..." -ForegroundColor Cyan

    npm publish 2>&1 | Tee-Object -Variable publishOutput | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Published successfully!" -ForegroundColor Green
    } else {
        if ($publishOutput -match "Two-factor authentication|bypass 2fa") {
            Write-Host "Publish blocked by npm security policy." -ForegroundColor Yellow
            Write-Host "Nutze einen granular token mit aktivem 'bypass 2fa' fuer Publishing." -ForegroundColor Yellow
        } elseif ($publishOutput -match "ENEEDAUTH|need auth") {
            Write-Host "Keine gueltige npm Auth gefunden. Entweder Token eingeben oder vorher 'npm adduser' im selben User-Profil ausfuehren." -ForegroundColor Yellow
        }
        Write-Host "Publish failed (exit code $LASTEXITCODE)" -ForegroundColor Red
    }
} finally {
    Remove-Item Env:NPM_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:NPM_CONFIG_USERCONFIG -ErrorAction SilentlyContinue

    if (Test-Path $tempNpmrc) {
        Remove-Item $tempNpmrc -Force -ErrorAction SilentlyContinue
    }

    $plainToken = $null
    Write-Host "Token removed." -ForegroundColor DarkGray
}