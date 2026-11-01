function Assert-WorkspaceItem {
    param($Item, [switch]$Recurse)
    if ($Item.LinkType) { throw "Linked workspace path: $($Item.FullName)" }
    if ($Item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        # OneDrive placeholders are reparse points too. Only allow Cloud tags.
        $details = & fsutil.exe reparsepoint query $Item.FullName 2>&1
        $queryExitCode = $LASTEXITCODE
        $tag = [regex]::Match(($details -join "`n"), '0x[0-9a-fA-F]{8}').Value
        if ($queryExitCode -ne 0 -or $tag -notmatch '^0x9000[0-9a-f]01a$') { throw "Unsupported reparse point: $($Item.FullName)" }
    }
    if ($Recurse -and $Item.PSIsContainer) {
        foreach ($child in Get-ChildItem -LiteralPath $Item.FullName -Force) { Assert-WorkspaceItem $child -Recurse }
    }
}
