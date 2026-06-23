$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$zig = Join-Path $root "tools\zig\zig.exe"
if (-not (Test-Path $zig)) {
  throw "Zig compiler not found: $zig"
}

$temp = Join-Path $env:TEMP "lcs_scs_wasm_build"
$public = Join-Path $root "public"
New-Item -ItemType Directory -Force -Path $temp | Out-Null
New-Item -ItemType Directory -Force -Path $public | Out-Null

Copy-Item -LiteralPath (Join-Path $root "wasm\lcs_scs_wasm.cpp") -Destination (Join-Path $temp "lcs_scs_wasm.cpp") -Force

Push-Location $temp
try {
  & $zig c++ -target wasm32-freestanding -O3 -nostdlib `
    "-Wl,--no-entry" `
    "-Wl,--initial-memory=268435456" `
    "-Wl,--max-memory=536870912" `
    "-Wl,--export-memory" `
    "-Wl,--export=wasm_alloc" `
    "-Wl,--export=wasm_reset" `
    "-Wl,--export=lcs_dp" `
    "-Wl,--export=lcs_rolling" `
    "-Wl,--export=lcs_hirschberg" `
    "-Wl,--export=lcs_backtrack" `
    "-Wl,--export=scs_construct" `
    "-Wl,--export=lcs_bruteforce_length" `
    -o lcs_scs.wasm lcs_scs_wasm.cpp
  if ($LASTEXITCODE -ne 0) {
    throw "Wasm build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Copy-Item -LiteralPath (Join-Path $temp "lcs_scs.wasm") -Destination (Join-Path $public "lcs_scs.wasm") -Force
Write-Host "Wasm built: public\lcs_scs.wasm"
