$ErrorActionPreference = 'Stop'
$whisperRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../resources/whisper'))
New-Item -ItemType Directory -Force -Path $whisperRoot | Out-Null
$whisperArchive = Join-Path $whisperRoot 'runtime.zip'
Invoke-WebRequest 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.7.6/whisper-bin-x64.zip' -OutFile $whisperArchive
if ((Get-FileHash -LiteralPath $whisperArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne '0d2eca299c248f965bd0341bcb219db4b433c7f0c0ce2200d4df85765e8156a9') { throw 'Checksum inv?lido para whisper.cpp' }
Expand-Archive -LiteralPath $whisperArchive -DestinationPath (Join-Path $whisperRoot 'archive') -Force
Get-ChildItem -LiteralPath (Join-Path $whisperRoot 'archive') -Recurse -File | Where-Object { $_.Extension -in '.exe','.dll' } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $whisperRoot -Force }
Invoke-WebRequest 'https://raw.githubusercontent.com/ggml-org/whisper.cpp/v1.7.6/LICENSE' -OutFile (Join-Path $whisperRoot 'LICENSE')
& (Join-Path $whisperRoot 'whisper-cli.exe') --help
if ($LASTEXITCODE -ne 0) { throw 'O execut?vel Whisper n?o iniciou.' }
Write-Host 'Whisper nativo instalado e verificado.'
