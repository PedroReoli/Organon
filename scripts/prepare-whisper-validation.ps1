$ErrorActionPreference = 'Stop'
$whisperTestDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.whisper-validation'))
New-Item -ItemType Directory -Force -Path $whisperTestDir | Out-Null
Add-Type -AssemblyName System.Speech
$whisperTestVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $whisperTestVoice.SelectVoice('Microsoft Maria Desktop')
  $whisperTestVoice.SetOutputToWaveFile((Join-Path $whisperTestDir 'speech.wav'))
  $whisperTestVoice.Speak('O sistema Organon grava notas e organiza tarefas. Esta frase confirma o funcionamento da transcrição local.')
} finally { $whisperTestVoice.Dispose() }
