$ErrorActionPreference = 'Stop'
$whisperTestDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.whisper-validation'))
New-Item -ItemType Directory -Force -Path $whisperTestDir | Out-Null
Add-Type -AssemblyName System.Speech
$whisperTestVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $selectedVoice = $null
  $installedVoices = @($whisperTestVoice.GetInstalledVoices() | Where-Object { $_.Enabled })
  $preferredVoices = @($installedVoices | Sort-Object @{ Expression = { if ($_.VoiceInfo.Culture.Name -eq 'pt-BR') { 0 } else { 1 } } }, @{ Expression = { $_.VoiceInfo.Name } })

  foreach ($voice in $preferredVoices) {
    try {
      $whisperTestVoice.SelectVoice($voice.VoiceInfo.Name)
      $selectedVoice = $voice.VoiceInfo
      break
    } catch {
      Write-Warning "A voz '$($voice.VoiceInfo.Name)' está registrada, mas não pôde ser ativada."
    }
  }

  if (-not $selectedVoice) {
    $selectedVoice = $whisperTestVoice.Voice
  }

  $validationText = if ($selectedVoice.Culture.Name -eq 'pt-BR') {
    'O sistema Organon grava notas e organiza tarefas. Esta frase confirma o funcionamento da transcrição local.'
  } else {
    'The Organon system records notes and organizes tasks. This sentence confirms that local transcription works.'
  }

  $whisperTestVoice.SetOutputToWaveFile((Join-Path $whisperTestDir 'speech.wav'))
  $whisperTestVoice.Speak($validationText)
} finally { $whisperTestVoice.Dispose() }
