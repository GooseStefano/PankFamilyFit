Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $projectRoot 'public\icons'

function New-PankFitIcon([int]$size, [string]$name, [bool]$maskable) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphite = [System.Drawing.ColorTranslator]::FromHtml('#2A2A2A')
  $pistachio = [System.Drawing.ColorTranslator]::FromHtml('#A3C644')
  $graphics.Clear($graphite)

  $scale = $size / 512.0
  if ($maskable) {
    $center = [single](256*$scale)
    $graphics.TranslateTransform($center, $center)
    $graphics.ScaleTransform([single]0.8, [single]0.8)
    $graphics.TranslateTransform(-$center, -$center)
  }
  $apple = New-Object System.Drawing.Drawing2D.GraphicsPath
  $apple.AddBezier(255*$scale, 145*$scale, 326*$scale, 111*$scale, 403*$scale, 162*$scale, 403*$scale, 247*$scale)
  $apple.AddBezier(403*$scale, 247*$scale, 403*$scale, 350*$scale, 322*$scale, 435*$scale, 255*$scale, 435*$scale)
  $apple.AddBezier(255*$scale, 435*$scale, 188*$scale, 435*$scale, 107*$scale, 350*$scale, 107*$scale, 247*$scale)
  $apple.AddBezier(107*$scale, 247*$scale, 107*$scale, 162*$scale, 184*$scale, 111*$scale, 255*$scale, 145*$scale)
  $apple.CloseFigure()
  $pistachioBrush = New-Object System.Drawing.SolidBrush($pistachio)
  $graphics.FillPath($pistachioBrush, $apple)

  $leaf = New-Object System.Drawing.Drawing2D.GraphicsPath
  $leaf.AddBezier(282*$scale,132*$scale,290*$scale,95*$scale,316*$scale,71*$scale,354*$scale,63*$scale)
  $leaf.AddBezier(354*$scale,63*$scale,357*$scale,103*$scale,332*$scale,133*$scale,282*$scale,132*$scale)
  $leaf.CloseFigure()
  $graphics.FillPath($pistachioBrush, $leaf)

  $graphiteBrush = New-Object System.Drawing.SolidBrush($graphite)
  $bite = [System.Drawing.RectangleF]::new([single](336*$scale), [single](158*$scale), [single](58*$scale), [single](72*$scale))
  $graphics.FillEllipse($graphiteBrush, $bite)
  $font = New-Object System.Drawing.Font('Arial', (134*$scale), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textRect = [System.Drawing.RectangleF]::new([single](107*$scale), [single](205*$scale), [single](296*$scale), [single](194*$scale))
  $graphics.DrawString('PF', $font, $graphiteBrush, $textRect, $format)

  $output = Join-Path $iconDir $name
  $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
  $font.Dispose(); $format.Dispose(); $apple.Dispose(); $leaf.Dispose()
  $pistachioBrush.Dispose(); $graphiteBrush.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}

New-PankFitIcon 192 'pankfit-192.png' $false
New-PankFitIcon 512 'pankfit-512.png' $false
New-PankFitIcon 512 'pankfit-maskable-512.png' $true
