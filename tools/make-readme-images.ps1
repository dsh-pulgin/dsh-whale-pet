# Compose README illustrations for the whale-pet plugin.
# Uses System.Drawing: real pose assets on a stylised app frame.
# Drawings are illustrative mock-ups, never screenshots.
Add-Type -AssemblyName System.Drawing

$root = "C:\Users\Administrator\Documents\deepseek-harness\default-workspace\dsh-whale-pet"
$assets = Join-Path $root "lib\assets"
$outDir = Join-Path $root "docs\images"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$idlePath = Join-Path $assets "whale-idle-6bdaf4bf8794.png"
$happyPath = Join-Path $assets "whale-happy-a3bd65a9b06b.png"
$workPath = Join-Path $assets "whale-eating-d5ae447c7b60.png"

function New-Font([string]$family, [float]$size, [string]$style = "Regular") {
  try { return [System.Drawing.Font]::new($family, $size, [System.Drawing.FontStyle]::$style, [System.Drawing.GraphicsUnit]::Pixel) }
  catch { return [System.Drawing.Font]::new("Segoe UI", $size, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel) }
}

$fontTitle = New-Font "Microsoft YaHei UI" 30 "Bold"
$fontSub = New-Font "Microsoft YaHei UI" 15
$fontLabel = New-Font "Microsoft YaHei UI" 18 "Bold"
$fontCaption = New-Font "Microsoft YaHei UI" 13
$fontNote = New-Font "Microsoft YaHei UI" 12
$fontBubble = New-Font "Microsoft YaHei UI" 15 "Bold"
$fontBubbleSmall = New-Font "Microsoft YaHei UI" 12

function New-RoundedPath([int]$x, [int]$y, [int]$w, [int]$h, [int]$r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Set-Quality([System.Drawing.Graphics]$g) {
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
}

function Fill-Round([System.Drawing.Graphics]$g, [int]$x, [int]$y, [int]$w, [int]$h, [int]$r, $brush) {
  $path = New-RoundedPath $x $y $w $h $r
  $g.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-Round([System.Drawing.Graphics]$g, [int]$x, [int]$y, [int]$w, [int]$h, [int]$r, $pen) {
  $path = New-RoundedPath $x $y $w $h $r
  $g.DrawPath($pen, $path)
  $path.Dispose()
}

# ---------------------------------------------------------------- states.png
$W = 1200
$H = 560
$bmp = [System.Drawing.Bitmap]::new($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
Set-Quality $g
$bgRect = [System.Drawing.Rectangle]::new(0, 0, $W, $H)
$bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  $bgRect,
  [System.Drawing.Color]::FromArgb(255, 243, 247, 253),
  [System.Drawing.Color]::FromArgb(255, 226, 234, 246),
  45.0)
$g.FillRectangle($bgBrush, $bgRect)

$titleBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 30, 43, 66))
$subBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 92, 107, 130))
$cardBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 253, 254, 255))
$cardPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 214, 225, 240), 1.4)
$noteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 122, 137, 160))

$g.DrawString("她会跟着你的进度换样子", $fontTitle, $titleBrush, 56, 40)
$g.DrawString("空闲打瞌睡并显示余额 · 干活时偷吃白饭（token）· 等你确认时举感叹号 · 跑完蹦一下（复用开心脸）", $fontSub, $subBrush, 58, 88)

$cards = @(
  @{ img = $idlePath;  label = "空闲"; caption = "打瞌睡，显示账号余额"; tag = "idle" },
  @{ img = $workPath;  label = "工作中"; caption = "就吃白饭（吃 token）"; tag = "working" },
  @{ img = $happyPath; label = "等你确认"; caption = "审批 / 计划 / 提问时举感叹号"; tag = "waiting" }
)
$cardW = 340
$cardH = 348
$gap = 34
$totalW = $cards.Count * $cardW + ($cards.Count - 1) * $gap
$startX = [int](($W - $totalW) / 2)
$cardY = 132

for ($i = 0; $i -lt $cards.Count; $i++) {
  $cx = $startX + $i * ($cardW + $gap)
  Fill-Round $g $cx $cardY $cardW $cardH 18 $cardBrush
  Draw-Round $g $cx $cardY $cardW $cardH 18 $cardPen

  $img = [System.Drawing.Image]::FromFile($cards[$i].img)
  $boxW = $cardW - 60
  $boxH = 214
  $scale = [Math]::Min($boxW / $img.Width, $boxH / $img.Height)
  $dw = [int]($img.Width * $scale)
  $dh = [int]($img.Height * $scale)
  $dx = [int]($cx + ($cardW - $dw) / 2)
  $dy = [int]($cardY + 22 + ($boxH - $dh) / 2)
  $g.DrawImage($img, $dx, $dy, $dw, $dh)
  $img.Dispose()

  $labelBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 32, 46, 70))
  $size = $g.MeasureString($cards[$i].label, $fontLabel)
  $g.DrawString($cards[$i].label, $fontLabel, $labelBrush, $cx + ($cardW - $size.Width) / 2, $cardY + 248)
  $size2 = $g.MeasureString($cards[$i].caption, $fontCaption)
  $g.DrawString($cards[$i].caption, $fontCaption, $subBrush, $cx + ($cardW - $size2.Width) / 2, $cardY + 278)
  $labelBrush.Dispose()
}

$g.DrawString("示意图：用插件内置素材拼合，不是运行截图。素材来源见 NOTICE-ARTWORK.md", $fontNote, $noteBrush, 56, $H - 44)

$statesFile = Join-Path $outDir "states.png"
$bmp.Save($statesFile, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

# ------------------------------------------------------------ ui-preview.png
$W = 1200
$H = 700
$bmp = [System.Drawing.Bitmap]::new($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
Set-Quality $g
$bgRect = [System.Drawing.Rectangle]::new(0, 0, $W, $H)
$bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  $bgRect,
  [System.Drawing.Color]::FromArgb(255, 240, 245, 252),
  [System.Drawing.Color]::FromArgb(255, 222, 232, 246),
  90.0)
$g.FillRectangle($bgBrush, $bgRect)

# window card
$winX = 70
$winY = 64
$winW = 1060
$winH = 548
Fill-Round $g $winX $winY $winW $winH 18 $cardBrush
Draw-Round $g $winX $winY $winW $winH 18 $cardPen
$dotBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 214, 225, 240))
foreach ($i in 0..2) {
  $g.FillEllipse($dotBrush, $winX + 22 + $i * 18, $winY + 20, 10, 10)
}
$hairPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 233, 240, 249), 1.5)
$g.DrawLine($hairPen, $winX, $winY + 46, $winX + $winW, $winY + 46)

# sidebar hint
$sideBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 246, 249, 253))
$sidePath = New-RoundedPath ($winX + 16) ($winY + 62) 230 ($winH - 84) 12
$g.FillPath($sideBrush, $sidePath)
$rowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 227, 235, 246))
for ($i = 0; $i -lt 6; $i++) {
  Fill-Round $g ($winX + 34) ($winY + 82 + $i * 40) (150 + ($i % 3) * 26) 14 7 $rowBrush
}

# conversation skeleton + composer
$lineBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 232, 239, 247))
$widths = @(420, 520, 360, 470, 300)
for ($i = 0; $i -lt $widths.Count; $i++) {
  Fill-Round $g ($winX + 292) ($winY + 92 + $i * 34) $widths[$i] 14 7 $lineBrush
}
$composerX = $winX + 292
$composerY = $winY + $winH - 96
Fill-Round $g $composerX $composerY 700 46 23 $cardBrush
Draw-Round $g $composerX $composerY 700 46 23 $cardPen
Fill-Round $g ($composerX + 18) ($composerY + 17) 220 12 6 $lineBrush
$sendBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 46, 74, 122))
$g.FillEllipse($sendBrush, $composerX + 650, $composerY + 10, 26, 26)

# the pet, sitting above the composer on the right
$petImg = [System.Drawing.Image]::FromFile($idlePath)
$petH = 200
$petW = [int]($petImage = $petImg.Width * ($petH / $petImg.Height))
$petX = $winX + $winW - $petW - 44
$petY = $winY + $winH - $petH - 118
$g.DrawImage($petImg, $petX, $petY, $petW, $petH)
$petImg.Dispose()

# speech bubble above the pet
$bubbleW = 262
$bubbleH = 104
$bubbleX = $petX + $petW - $bubbleW + 8
$bubbleY = $petY - $bubbleH - 2
Fill-Round $g $bubbleX $bubbleY $bubbleW $bubbleH 16 $cardBrush
Draw-Round $g $bubbleX $bubbleY $bubbleW $bubbleH 16 $cardPen
$bubbleTail = [System.Drawing.Drawing2D.GraphicsPath]::new()
$bubbleTail.AddPolygon([System.Drawing.Point[]]@(
  [System.Drawing.Point]::new($bubbleX + $bubbleW - 62, $bubbleY + $bubbleH - 2),
  [System.Drawing.Point]::new($bubbleX + $bubbleW - 48, $bubbleY + $bubbleH + 12),
  [System.Drawing.Point]::new($bubbleX + $bubbleW - 34, $bubbleY + $bubbleH - 2)
))
$g.FillPath($cardBrush, $bubbleTail)

$dotIdle = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 150, 164, 184))
$g.FillEllipse($dotIdle, $bubbleX + 18, $bubbleY + 20, 8, 8)
$g.DrawString("余额 ¥12.34", $fontBubble, $titleBrush, $bubbleX + 34, $bubbleY + 11)
$g.DrawString("空闲中 · 含赠送 ¥3.00 · Lv.3", $fontBubbleSmall, $subBrush, $bubbleX + 18, $bubbleY + 38)
$dividerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 226, 234, 245), 1.2)
$g.DrawLine($dividerPen, $bubbleX + 16, $bubbleY + 64, $bubbleX + $bubbleW - 16, $bubbleY + 64)
$g.DrawString("跟人家说点什么…", $fontBubbleSmall, $subBrush, $bubbleX + 20, $bubbleY + 72)
$sendSmall = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 46, 74, 122))
$g.FillEllipse($sendSmall, $bubbleX + $bubbleW - 36, $bubbleY + 68, 20, 20)

# annotations
$noteBrush2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 74, 90, 116))
$g.DrawString("气泡：状态 · 余额 · 亲密度 · 聊天输入", $fontCaption, $noteBrush2, $bubbleX - 208, $bubbleY + 20)
$arrowPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 160, 178, 202), 2)
$g.DrawLine($arrowPen, $bubbleX - 26, $bubbleY + 30, $bubbleX - 6, $bubbleY + 30)
$g.DrawLine($arrowPen, $bubbleX - 14, $bubbleY + 24, $bubbleX - 6, $bubbleY + 30)
$g.DrawLine($arrowPen, $bubbleX - 14, $bubbleY + 36, $bubbleX - 6, $bubbleY + 30)
$g.DrawString("浮在输入框上方，不遮挡发送按钮", $fontCaption, $noteBrush2, $petX - 250, $petY + $petH - 26)
$g.DrawLine($arrowPen, $petX - 40, $petY + $petH - 18, $petX - 8, $petY + $petH - 18)

$g.DrawString("示意图：按插件实际布局绘制的示意，不是运行截图", $fontNote, $noteBrush, 70, $H - 42)

$uiFile = Join-Path $outDir "ui-preview.png"
$bmp.Save($uiFile, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Get-ChildItem -LiteralPath $outDir | ForEach-Object { "{0}  {1} bytes" -f $_.Name, $_.Length }

# ----------------------------------------------------------------- chat.png
$W = 900
$H = 560
$bmp = [System.Drawing.Bitmap]::new($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
Set-Quality $g
$bgRect = [System.Drawing.Rectangle]::new(0, 0, $W, $H)
$bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  $bgRect,
  [System.Drawing.Color]::FromArgb(255, 242, 246, 252),
  [System.Drawing.Color]::FromArgb(255, 226, 235, 247),
  60.0)
$g.FillRectangle($bgBrush, $bgRect)

$titleBrush2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 30, 43, 66))
$subBrush2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 92, 107, 130))
$noteBrush3 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 122, 137, 160))
$bubbleBrush2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 253, 254, 255))
$userBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 232, 238, 248))
$pen2 = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 214, 225, 240), 1.4)

$g.DrawString("气泡里就能跟她说话", $fontTitle, $titleBrush2, 48, 36)
$g.DrawString("用的是你当前默认模型，一两句话；每条会消耗你自己的模型额度", $fontSub, $subBrush2, 50, 82)

# panel
$panelX = 150
$panelY = 132
$panelW = 600
$panelH = 348
Fill-Round $g $panelX $panelY $panelW $panelH 18 $bubbleBrush2
Draw-Round $g $panelX $panelY $panelW $panelH 18 $pen2

$dotIdle2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 150, 164, 184))
$g.FillEllipse($dotIdle2, $panelX + 20, $panelY + 20, 8, 8)
$g.DrawString("余额 ¥12.34", $fontBubble, $titleBrush2, $panelX + 36, $panelY + 11)
$g.DrawString("空闲中 · 含赠送 ¥3.00 · Lv.3", $fontBubbleSmall, $subBrush2, $panelX + 20, $panelY + 38)
$g.DrawLine($pen2, $panelX + 16, $panelY + 64, $panelX + $panelW - 16, $panelY + 64)

# conversation turns
$turnUser = "今天好累啊…"
$turnPet = "那人家给你数数余额？¥12.34，够再陪你干好一阵子的~"
$userF = New-Font "Microsoft YaHei UI" 14
$y = $panelY + 80
$sz = $g.MeasureString($turnUser, $userF)
$uw = [int]$sz.Width + 28
Fill-Round $g ($panelX + $panelW - $uw - 20) $y $uw 34 12 $userBrush
$g.DrawString($turnUser, $userF, $titleBrush2, $panelX + $panelW - $uw - 6, $y + 7)

$y2 = $y + 46
$long = New-Font "Microsoft YaHei UI" 14
$sz2 = $g.MeasureString($turnPet, $long)
$pw = [int]$sz2.Width + 28
Fill-Round $g ($panelX + 20) $y2 $pw 36 12 $cardBrush
Draw-Round $g ($panelX + 20) $y2 $pw 36 12 $pen2
$g.DrawString($turnPet, $long, $titleBrush2, $panelX + 34, $y2 + 8)

# composer row at the bottom of the bubble
$g.DrawLine($pen2, $panelX + 16, $panelY + $panelH - 58, $panelX + $panelW - 16, $panelY + $panelH - 58)
$g.DrawString("说点什么…", $fontBubbleSmall, $subBrush2, $panelX + 36, $panelY + $panelH - 40)
$sendBrush2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 46, 74, 122))
$g.FillEllipse($sendBrush2, $panelX + $panelW - 48, $panelY + $panelH - 48, 24, 24)

$g.DrawString("示意图：按插件气泡的版式绘制，不是运行截图", $fontNote, $noteBrush3, 48, $H - 40)

$chatFile = Join-Path $outDir "chat.png"
$bmp.Save($chatFile, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
"chat.png saved"
Get-ChildItem -LiteralPath $outDir | ForEach-Object { "{0}  {1} bytes" -f $_.Name, $_.Length }
