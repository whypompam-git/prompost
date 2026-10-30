# python3 mix.py music.wav events.json out.wav — lays narration clips over the music bed
import sys, json, wave, subprocess, numpy as np
SR = 44100
def load(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768
music = load(sys.argv[1])
events = json.load(open(sys.argv[2]))
out = music.copy()
for e in events:
    v = load(e["file"]) * 0.95
    i = int(e["at"] * SR)
    if i >= len(out): continue
    j = min(len(out), i + len(v))
    out[i:j] += v[: j - i]
peak = np.max(np.abs(out))
if peak > 0.98: out *= 0.98 / peak
pcm = (out * 32767).astype(np.int16)
w = wave.open(sys.argv[3], "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(np.stack([pcm, pcm], 1).tobytes()); w.close()
