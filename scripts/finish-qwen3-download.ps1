$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$blobDirectory = Join-Path $projectRoot 'server/data/models/blobs'
$digest = 'a3de86cd1c132c822487ededd47a324c50491393e6565cd14bafa40d0b8e686f'
$blobPath = Join-Path $blobDirectory "sha256-$digest"
$downloadPath = "${blobPath}-manual"
$sourceUrl = "https://registry.ollama.ai/v2/library/qwen3/blobs/sha256:$digest"

if (-not (Test-Path -LiteralPath $blobPath)) {
  New-Item -ItemType Directory -Path $blobDirectory -Force | Out-Null
  Write-Output 'Resuming qwen3:8b from the official Ollama registry.'
  & curl.exe --silent --show-error --location --fail --retry 20 --retry-all-errors --retry-delay 3 --continue-at - --output $downloadPath $sourceUrl
  if ($LASTEXITCODE -ne 0) { throw 'The qwen3:8b download could not finish; rerun this script to resume it.' }
  $actualHash = (Get-FileHash -LiteralPath $downloadPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $digest) { throw 'The qwen3:8b model checksum did not match; it was not installed.' }
  Move-Item -LiteralPath $downloadPath -Destination $blobPath
}
$installedHash = (Get-FileHash -LiteralPath $blobPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($installedHash -ne $digest) { throw 'The local qwen3:8b model checksum did not match; it will not be registered.' }

Set-Location $projectRoot
& npm.cmd run setup:models
if ($LASTEXITCODE -ne 0) { throw 'Ollama could not register the downloaded model. Rerun npm run setup:models.' }
