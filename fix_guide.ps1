$file = 'c:\Users\USER\Desktop\fatale-app\src\components\DiscoveryHUD.jsx'
$lines = [System.IO.File]::ReadAllLines($file)
# Keep lines 0..3162 (new guide) and 3596..end (AnimatePresence close + scanline + rest)
$keep = $lines[0..3162] + $lines[3596..($lines.Count - 1)]
[System.IO.File]::WriteAllLines($file, $keep, [System.Text.Encoding]::UTF8)
Write-Host "Done. Lines removed: $($lines.Count - $keep.Count). New total: $($keep.Count)"
