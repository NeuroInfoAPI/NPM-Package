# alle dist & node_modules ordner aufraeumen
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspacePrefix = $workspaceRoot.TrimEnd('\') + '\'
function Assert-WorkspacePath {
    param([string]$Path)
    $absolute = [IO.Path]::GetFullPath($Path)
    if (!$absolute.StartsWith($workspacePrefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Path is outside the workspace: $absolute" }
}
function Find-CleanupTargets {
    param([string]$Directory)
    foreach ($item in Get-ChildItem -LiteralPath $Directory -Force -Directory) {
        if ($item.Name -eq '.git') { continue }
        Assert-WorkspacePath $item.FullName
        if ($item.Name -in @('dist', 'node_modules')) { $item.FullName }
        elseif (!($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { Find-CleanupTargets $item.FullName }
    }
}
function Remove-GeneratedTree {
    param([string]$Path)
    Assert-WorkspacePath $Path
    $item = Get-Item -LiteralPath $Path -Force
    # pnpm uses junctions/symlinks. Remove each link itself, never visit its target.
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        if ($item.PSIsContainer) { [IO.Directory]::Delete($item.FullName) }
        else { [IO.File]::Delete($item.FullName) }
    } elseif ($item.PSIsContainer) {
        foreach ($child in Get-ChildItem -LiteralPath $Path -Force) { Remove-GeneratedTree $child.FullName }
        [IO.Directory]::Delete($item.FullName)
    } else { Remove-Item -LiteralPath $item.FullName -Force }
}
try {
    $targets = @(Find-CleanupTargets $workspaceRoot)
    if ($targets.Count -eq 0) { Write-Host 'No dist or node_modules directories found.' }
    foreach ($target in $targets) {
        if ($PSCmdlet.ShouldProcess($target, 'Remove generated directory')) {
            Remove-GeneratedTree $target
            Write-Host "Removed $target"
        }
    }
} catch { Write-Host $_ -ForegroundColor Red; exit 1 }
