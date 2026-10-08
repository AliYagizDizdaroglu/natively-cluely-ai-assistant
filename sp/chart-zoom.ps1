# Throwaway: crop + upscale regions of the AI Studio usage chart, and print the colours of non-background
# pixels in the bump regions next to the legend icon colours, to tell which series each bump belongs to.
param([string]$In, [string]$OutDir)
Add-Type -AssemblyName System.Drawing
$src = New-Object System.Drawing.Bitmap($In)
function Crop($name, $x, $y, $w, $h, $s) {
    $bmp = New-Object System.Drawing.Bitmap(($w * $s), ($h * $s))
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, ($w * $s), ($h * $s))), (New-Object System.Drawing.Rectangle($x, $y, $w, $h)), [System.Drawing.GraphicsUnit]::Pixel)
    $bmp.Save("$OutDir\zoom-$name.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}
Crop 'right' 330 290 145 55 6
Crop 'left' 40 100 120 245 3
Crop 'legend' 40 370 440 45 3
function Hex($c) { '#{0:X2}{1:X2}{2:X2}' -f $c.R, $c.G, $c.B }
$bg = $src.GetPixel(300, 250)
"background " + (Hex $bg) + "  image " + $src.Width + "x" + $src.Height
foreach ($p in @(@('3 Flash Live', 57, 381), @('3.1 Flash Lite', 186, 381), @('3.5 Flash Lite', 322, 381), @('3.8 Live', 56, 405), @('Gemma 4 31B', 372, 405))) {
    "legend " + $p[0] + " " + (Hex ($src.GetPixel($p[1], $p[2])))
}
# every non-background pixel per column in the plot's lower band, summarised as topmost row + its colour
foreach ($band in @(@(45, 75), @(120, 150), @(370, 470))) {
    for ($x = $band[0]; $x -le $band[1]; $x++) {
        $top = $null
        for ($y = 290; $y -le 336; $y++) {
            $c = $src.GetPixel($x, $y)
            if ([Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B) -gt 30) { $top = @($y, (Hex $c)); break }
        }
        if ($top) { "x=$x top y=" + $top[0] + " " + $top[1] }
    }
}
