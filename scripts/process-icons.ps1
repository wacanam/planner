Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\User\.gemini\antigravity\brain\75755942-c947-406e-8038-6312f5c12233\cute_pwa_icon_1786968609637.jpg"
$iconsDir = "c:\Users\User\projects\personal\github\planner\public\icons"
$publicDir = "c:\Users\User\projects\personal\github\planner\public"
$appDir = "c:\Users\User\projects\personal\github\planner\src\app"

if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Loaded source image: $($srcImage.Width) x $($srcImage.Height)"

function Resize-And-Save($targetPath, [int]$targetWidth, [int]$targetHeight) {
    $destBitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $rect = New-Object System.Drawing.Rectangle(0, 0, $targetWidth, $targetHeight)
    $graphics.DrawImage($srcImage, $rect, 0, 0, $srcImage.Width, $srcImage.Height, [System.Drawing.GraphicsUnit]::Pixel)
    
    $destBitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $destBitmap.Dispose()
    Write-Host "Saved: $targetPath ($($targetWidth)x$($targetHeight))"
}

# Standard PWA icon sizes
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512, 1024)
foreach ($s in $sizes) {
    Resize-And-Save "$iconsDir\icon-$s.png" $s $s
    Resize-And-Save "$iconsDir\icon-maskable-$s.png" $s $s
}

# Apple Touch Icons
Resize-And-Save "$publicDir\apple-touch-icon.png" 180 180
Resize-And-Save "$publicDir\apple-touch-icon-180x180.png" 180 180
Resize-And-Save "$publicDir\apple-touch-icon-152x152.png" 152 152
Resize-And-Save "$publicDir\apple-touch-icon-120x120.png" 120 120
Resize-And-Save "$iconsDir\apple-touch-icon.png" 180 180
Resize-And-Save "$appDir\apple-icon.png" 180 180

# Next.js App Router icons
Resize-And-Save "$appDir\icon.png" 32 32

# Favicons
Resize-And-Save "$publicDir\favicon-48x48.png" 48 48
Resize-And-Save "$publicDir\favicon-32x32.png" 32 32
Resize-And-Save "$publicDir\favicon-16x16.png" 16 16
Resize-And-Save "$iconsDir\favicon-32x32.png" 32 32
Resize-And-Save "$iconsDir\favicon-16x16.png" 16 16

# Generate .ico (standard Windows / desktop favicon)
function Generate-Ico($outputPath) {
    $icon48 = New-Object System.Drawing.Bitmap(48, 48, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g48 = [System.Drawing.Graphics]::FromImage($icon48)
    $g48.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g48.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g48.DrawImage($srcImage, 0, 0, 48, 48)
    $g48.Dispose()

    $hIcon = $icon48.GetHicon()
    $ico = [System.Drawing.Icon]::FromHandle($hIcon)
    $fs = [System.IO.File]::OpenWrite($outputPath)
    $ico.Save($fs)
    $fs.Close()
    $icon48.Dispose()
    Write-Host "Saved ICO: $outputPath"
}

Generate-Ico "$publicDir\favicon.ico"
Generate-Ico "$appDir\favicon.ico"

$srcImage.Dispose()
Write-Host "All icons and favicons generated successfully!"
