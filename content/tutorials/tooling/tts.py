# python tts.py lines.json outdir voice — synthesises each line once (cached by hash) and writes outdir/manifest.json
import sys, json, os, hashlib, subprocess
lines, outdir, voice = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3]
os.makedirs(outdir, exist_ok=True)
edge = os.path.join(os.path.dirname(sys.executable), "edge-tts")
man = {}
for text in lines:
    f = os.path.join(outdir, hashlib.sha1((voice + text).encode()).hexdigest()[:16] + ".mp3")
    if not os.path.exists(f) or os.path.getsize(f) == 0:
        cmd = [edge, "--voice", voice, "--rate=+5%", "--text", text, "--write-media", f]
        if os.environ.get("HTTPS_PROXY"): cmd[1:1] = ["--proxy", os.environ["HTTPS_PROXY"]]
        subprocess.run(cmd, check=True, capture_output=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True, check=True).stdout)
    man[text] = {"file": os.path.abspath(f), "dur": dur}
json.dump(man, open(os.path.join(outdir, "manifest.json"), "w"), ensure_ascii=False, indent=1)
print(len(man), "lines,", round(sum(v["dur"] for v in man.values())), "s of speech")
