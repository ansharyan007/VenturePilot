$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectRoot 'server/.runtime'
$binaryPath = Join-Path $runtimePath 'ollama.exe'
if (Test-Path -LiteralPath $binaryPath) { Write-Output "Portable Ollama already exists at $binaryPath"; exit 0 }
New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
$version = 'v0.33.3'
$releaseUrl = "https://github.com/ollama/ollama/releases/download/$version"
$checksumResponse = Invoke-WebRequest -Uri "$releaseUrl/sha256sum.txt" -UseBasicParsing
$checksumText = [Text.Encoding]::UTF8.GetString($checksumResponse.Content)
$checksum = [regex]::Match($checksumText, '(?m)^([a-f0-9]{64})\s+\./ollama-windows-amd64\.zip\s*$').Groups[1].Value
if (-not $checksum) { throw 'No checksum for the official Windows runtime was found.' }
$archivePath = Join-Path $runtimePath 'ollama-windows-amd64.zip'
Write-Output "Downloading official Ollama $version (resuming an incomplete archive when possible)"
& curl.exe --silent --show-error --location --fail --retry 5 --retry-all-errors --continue-at - --output $archivePath "$releaseUrl/ollama-windows-amd64.zip"
if ($LASTEXITCODE -ne 0) { throw 'Ollama download failed.' }
$actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $checksum) { throw 'Checksum mismatch; downloaded archive will not be executed.' }
Expand-Archive -LiteralPath $archivePath -DestinationPath $runtimePath -Force
Write-Output "Verified portable runtime ready: $binaryPath"
