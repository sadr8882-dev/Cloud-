"""Whisper subtitles (faster-whisper, CPU): python subtitles.py <audio_or_video> <out.srt> [language]
Audio is decoded with ffmpeg (16 kHz mono) and passed as an array, so PyAV is not needed."""
import subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
src, out = sys.argv[1], sys.argv[2]
lang = sys.argv[3] if len(sys.argv) > 3 else None
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], check=True, capture_output=True).stdout
audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
m = WhisperModel(__file__.rsplit("/", 1)[0] + "/models/faster-whisper-small", device="cpu", compute_type="int8")
segs, info = m.transcribe(audio, language=lang)
ts = lambda x: f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{x % 60:06.3f}".replace(".", ",")
blocks = [f"{i}\n{ts(s.start)} --> {ts(s.end)}\n{s.text.strip()}\n" for i, s in enumerate(segs, 1)]
open(out, "w", encoding="utf-8").write("\n".join(blocks))
print(f"{len(blocks)} subtitles, language {info.language}")
