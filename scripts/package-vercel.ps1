$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$release = Join-Path $root "release"
$packageDir = Join-Path $release ("vercel-package-1.1.3-" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
$zipPath = Join-Path $release "LCS_SCS_Visualizer_Vercel_1.1.3.zip"

New-Item -ItemType Directory -Force -Path $release | Out-Null

New-Item -ItemType Directory -Force -Path $packageDir | Out-Null

$files = @(
  ".env.example",
  ".gitignore",
  ".vercelignore",
  "index.html",
  "package.json",
  "package-lock.json",
  "README.md",
  "vercel.json",
  "vite.config.js"
)

$dirs = @(
  "api",
  "public",
  "scripts",
  "wasm",
  "web-src"
)

foreach ($file in $files) {
  $source = Join-Path $root $file
  if (Test-Path $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $packageDir $file) -Force
  }
}

foreach ($dir in $dirs) {
  $source = Join-Path $root $dir
  if (Test-Path $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $packageDir $dir) -Recurse -Force
  }
}

New-Item -ItemType Directory -Force -Path (Join-Path $packageDir "docs") | Out-Null
Copy-Item -LiteralPath (Join-Path $root "docs\USAGE_1.1.3.md") -Destination (Join-Path $packageDir "docs\USAGE_1.1.3.md") -Force
Copy-Item -LiteralPath (Join-Path $root "docs\references") -Destination (Join-Path $packageDir "docs\references") -Recurse -Force

if (-not (Test-Path (Join-Path $packageDir "public\lcs_scs.wasm"))) {
  throw "Missing public\lcs_scs.wasm."
}

Start-Sleep -Milliseconds 800

try {
  Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $zipPath -Force
  Write-Host "Vercel package built: $zipPath"
} catch {
  Start-Sleep -Milliseconds 1200
  $fallbackZipPath = Join-Path $release ("LCS_SCS_Visualizer_Vercel_1.1.3_source_" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + ".zip")
  Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $fallbackZipPath -Force
  Write-Host "Vercel package built: $fallbackZipPath"
}
