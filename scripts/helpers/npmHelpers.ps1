# Tokens are never written to disk; the temporary npmrc contains a variable reference.
function Invoke-Npm {
    param([string[]]$Arguments)
    $ErrorActionPreference = 'Continue'
    $output = & npm.cmd @Arguments 2>&1
    return [PSCustomObject]@{ Output = (($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine).Trim(); ExitCode = $LASTEXITCODE }
}
function Invoke-NpmChecked {
    param([string[]]$Arguments)
    $result = Invoke-Npm -Arguments $Arguments
    if ($result.ExitCode -ne 0) { throw "npm $($Arguments[0]) failed: $($result.Output)" }
    return $result.Output
}
function Start-NpmAuthentication {
    $secure = Read-Host 'NPM Auth Token (hidden input, required)' -AsSecureString
    if ($secure.Length -eq 0) { $secure.Dispose(); throw 'NPM auth token is required.' }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $state = [PSCustomObject]@{
        Token = $env:NPM_TOKEN
        UserConfig = $env:NPM_CONFIG_USERCONFIG
        ConfigPath = Join-Path $env:TEMP ('npmrc-release-' + [Guid]::NewGuid().ToString() + '.npmrc')
    }
    try {
        Set-Content -LiteralPath $state.ConfigPath -Encoding ASCII -Value @(
            'registry=https://registry.npmjs.org/'
            '//registry.npmjs.org/:_authToken=${NPM_TOKEN}'
        )
        $env:NPM_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        $env:NPM_CONFIG_USERCONFIG = $state.ConfigPath
        return $state
    } catch { Stop-NpmAuthentication -State $state; throw }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr); $secure.Dispose() }
}
function Stop-NpmAuthentication {
    param($State)
    if ($null -eq $State) { return }
    $env:NPM_TOKEN = $State.Token
    $env:NPM_CONFIG_USERCONFIG = $State.UserConfig
    if (Test-Path -LiteralPath $State.ConfigPath) { Remove-Item -LiteralPath $State.ConfigPath -Force }
    $State.Token = $null
}
