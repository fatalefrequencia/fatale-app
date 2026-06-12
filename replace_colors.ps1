$files = Get-ChildItem -Path "src" -Recurse -Include *.jsx, *.js, *.css, *.html

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Primary (#ff006e)
    $content = $content -replace '\[#ff006e\]', 'fatale'
    $content = $content -replace '\[#FF006E\]', 'fatale'
    $content = $content -replace '#ff006e', 'rgb(var(--theme-primary))'
    $content = $content -replace '#FF006E', 'rgb(var(--theme-primary))'
    
    # Secondary (#00ffff)
    $content = $content -replace '\[#00ffff\]', 'secondary'
    $content = $content -replace '\[#00FFFF\]', 'secondary'
    $content = $content -replace '#00ffff', 'rgb(var(--theme-secondary))'
    $content = $content -replace '#00FFFF', 'rgb(var(--theme-secondary))'
    
    # Background (#000000)
    $content = $content -replace '\[#000000\]', 'systemBg'
    
    # Text (#ffffff)
    $content = $content -replace '\[#ffffff\]', 'systemText'
    $content = $content -replace '\[#FFFFFF\]', 'systemText'

    if ($original -ne $content) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated $($file.Name)"
    }
}
