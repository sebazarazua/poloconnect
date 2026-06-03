$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$base = 'C:\Users\sebas\Documents\Codex\2026-06-01\tengo-q-hacer-un-proyecto-de\outputs\polo-app\assets\ads'
$items = @(
  @{ Path = 'home\hero-1.png'; Title = 'Publicidades destacadas'; Subtitle = 'Promociones y partners para la temporada'; Bg = '#1F5A7A' },
  @{ Path = 'home\hero-2.png'; Title = 'Equipamiento premium'; Subtitle = 'Novedades y marcas para tu equipo'; Bg = '#196B89' },
  @{ Path = 'home\hero-3.png'; Title = 'Torneos destacados'; Subtitle = 'Fechas clave y eventos que no te podés perder'; Bg = '#234A64' },
  @{ Path = 'home\compact-1.png'; Title = 'Sponsor Oficial'; Subtitle = 'Banner 1 para marca o club'; Bg = '#2B5F8C' },
  @{ Path = 'home\compact-2.png'; Title = 'Equipamiento premium'; Subtitle = 'Banner 2 para tienda de polo'; Bg = '#1F7A6B' },
  @{ Path = 'home\compact-3.png'; Title = 'Torneos y eventos'; Subtitle = 'Banner 3 para torneo destacado'; Bg = '#294D7A' },
  @{ Path = 'live\slide-1.png'; Title = 'Cobertura en vivo'; Subtitle = 'Seguimiento minuto a minuto de los partidos'; Bg = '#345D7C' },
  @{ Path = 'live\slide-2.png'; Title = 'Marcadores oficiales'; Subtitle = 'Resultados y estadísticas al instante'; Bg = '#3B7B74' },
  @{ Path = 'live\slide-3.png'; Title = 'Próximos cruces'; Subtitle = 'Lo que viene en la agenda de la jornada'; Bg = '#5D4D8C' },
  @{ Path = 'community\slide-1.png'; Title = 'Comunidades activas'; Subtitle = 'Chats y conversaciones del circuito'; Bg = '#2F5F88' },
  @{ Path = 'community\slide-2.png'; Title = 'Noticias del polo'; Subtitle = 'Actualizaciones y rumores confirmados'; Bg = '#4B7C6E' },
  @{ Path = 'community\slide-3.png'; Title = 'Equipos y torneos'; Subtitle = 'Grupos para competir, coordinar y seguir'; Bg = '#6A4D7F' }
)

foreach ($folder in @('home', 'live', 'community')) {
  New-Item -ItemType Directory -Force -Path (Join-Path $base $folder) | Out-Null
}

foreach ($item in $items) {
  $path = Join-Path $base $item.Path
  $bitmap = New-Object System.Drawing.Bitmap 1200, 700
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($item.Bg))

  $overlayBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35, 255, 255, 255))
  $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(24, 0, 0, 0))
  $tagBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 255, 255, 255))
  $tagTextBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $titleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235, 245, 248, 255))
  $tagFont = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Bold)
  $titleFont = New-Object System.Drawing.Font('Segoe UI Semibold', 54, [System.Drawing.FontStyle]::Bold)
  $subFont = New-Object System.Drawing.Font('Segoe UI', 28, [System.Drawing.FontStyle]::Regular)

  $graphics.FillEllipse($overlayBrush, 870, 42, 280, 280)
  $graphics.FillEllipse($shadowBrush, -120, 430, 420, 420)
  $graphics.FillEllipse($shadowBrush, 760, 500, 320, 320)
  $graphics.FillRectangle($tagBrush, 70, 70, 290, 52)
  $graphics.DrawString('POLO CONNECT', $tagFont, $tagTextBrush, 92, 83)
  $graphics.DrawString($item.Title, $titleFont, $titleBrush, 70, 175)
  $subtitleRect = New-Object System.Drawing.RectangleF 70, 290, 760, 130
  $subtitleFormat = New-Object System.Drawing.StringFormat
  $subtitleFormat.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $subtitleFormat.FormatFlags = [System.Drawing.StringFormatFlags]::LineLimit
  $graphics.DrawString($item.Subtitle, $subFont, $subBrush, $subtitleRect, $subtitleFormat)

  $graphics.Dispose()
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  $overlayBrush.Dispose()
  $shadowBrush.Dispose()
  $tagBrush.Dispose()
  $tagTextBrush.Dispose()
  $titleBrush.Dispose()
  $subBrush.Dispose()
  $tagFont.Dispose()
  $titleFont.Dispose()
  $subFont.Dispose()
}

Write-Output 'Generated ad placeholder images.'