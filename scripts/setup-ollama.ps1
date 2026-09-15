$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectRoot 'server/.runtime'
$binaryPath = Join-Path $runtimePath 'ollama.exe'
if (Test-Path -LiteralPath $binaryPath) { Write-Output "Portable Ollama already exists at $binaryPath"; exit 0 }
New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
$release = Invoke-RestMethod 'https://api.github.com/repos/ollama/ollama/releases/tags/v0.33.3'
$asset = $release.assets | Where-Object { $_.name -eq 'ollama-windows-amd64.zip' }
if (-not $asset -or $asset.digest -notmatch '^sha256:[a-f0-9]{64}$') { throw 'No verifiable official release asset found.' }
$archivePath = Join-Path $runtimePath 'ollama-windows-amd64.zip'
Write-Output "Downloading official Ollama $($release.tag_name), $([math]::Round($asset.size / 1MB)) MB"
& curl.exe --location --fail --retry 2 --output $archivePath $asset.browser_download_url
if ($LASTEXITCODE -ne 0) { throw 'Ollama download failed.' }
$actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $asset.digest.Substring(7)) { throw 'Checksum mismatch; downloaded archive will not be executed.' }
Expand-Archive -LiteralPath $archivePath -DestinationPath $runtimePath -Force
Write-Output "Verified portable runtime ready: $binaryPath"
