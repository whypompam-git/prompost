# soft background pad for the tutorials: python3 music.py out.wav seconds gain
import sys, wave, numpy as np
out_path, D, G = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
SR = 44100; N = int(SR * D); out = np.zeros(N)
def tone(f, dur, harm=((1, .55), (2, .18), (3, .06))):
    t = np.arange(int(dur * SR)) / SR
    return sum(a * np.sin(2 * np.pi * f * h * t) for h, a in harm)
chords = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7]]
bar = 4.0; k = 0; t0 = 0.0
while t0 < D:
    ch = chords[k % 4]; k += 1
    dur = bar + 0.6
    s = sum(tone(f, dur) for f in ch) + 0.8 * tone(ch[0] / 2, dur)
    n = len(s); tt = np.arange(n) / SR
    s *= np.minimum(1, tt / 0.8) * np.minimum(1, (dur - tt) / 0.8)
    i = int(t0 * SR); j = min(N, i + n); out[i:j] += s[: j - i]
    # gentle plucks
    arp = [ch[0] * 2, ch[2] * 2, ch[1] * 2, ch[2] * 2]
    for q in range(8):
        tq = t0 + q * 0.5
        if tq >= D: break
        p = tone(arp[q % 4], 0.6, ((1, .5), (2, .1))) * np.exp(-np.arange(int(0.6 * SR)) / SR * 6)
        i = int(tq * SR); j = min(N, i + len(p)); out[i:j] += 0.35 * p[: j - i]
    t0 += bar
fade = int(2.5 * SR)
out[:fade] *= np.linspace(0, 1, fade); out[-fade:] *= np.linspace(1, 0, fade)
out = out / np.max(np.abs(out)) * G * 4
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
w = wave.open(out_path, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(np.stack([pcm, pcm], 1).tobytes()); w.close()
