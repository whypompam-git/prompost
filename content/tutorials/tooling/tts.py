# python3 tts.py lines.json outdir provider voice
#   provider: azure  (env AZURE_SPEECH_KEY, AZURE_SPEECH_REGION) voice e.g. th-TH-NiwatNeural
#             google (env GOOGLE_TTS_API_KEY)                     voice e.g. th-TH-Chirp3-HD-Charon
#             edge   (free Edge read-aloud, needs WebSocket)      voice e.g. th-TH-NiwatNeural
# Synthesises each line once (cached by hash) and writes outdir/manifest.json { text: {file, dur} }.
import sys, json, os, hashlib, subprocess, ssl, base64, urllib.request
from xml.sax.saxutils import escape

lines, outdir, provider, voice = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3], sys.argv[4]
os.makedirs(outdir, exist_ok=True)
ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None))


def post(url, body, headers):
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, context=ctx, timeout=60) as r:
        return r.read()


def synth(text, path):
    if provider == "azure":
        region, key = os.environ["AZURE_SPEECH_REGION"], os.environ["AZURE_SPEECH_KEY"]
        ssml = f'<speak version="1.0" xml:lang="th-TH"><voice name="{voice}"><prosody rate="+5%">{escape(text)}</prosody></voice></speak>'
        audio = post(f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1", ssml.encode(), {
            "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3", "User-Agent": "prompost-tutorials"})
    elif provider == "google":
        key = os.environ["GOOGLE_TTS_API_KEY"]
        body = {"input": {"text": text}, "voice": {"languageCode": "th-TH", "name": voice}, "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.05}}
        res = json.loads(post(f"https://texttospeech.googleapis.com/v1/text:synthesize?key={key}", json.dumps(body).encode(), {"Content-Type": "application/json"}))
        audio = base64.b64decode(res["audioContent"])
    elif provider == "edge":
        edge = os.path.join(os.path.dirname(sys.executable), "edge-tts")
        cmd = [edge, "--voice", voice, "--rate=+5%", "--text", text, "--write-media", path]
        if os.environ.get("HTTPS_PROXY"): cmd[1:1] = ["--proxy", os.environ["HTTPS_PROXY"]]
        subprocess.run(cmd, check=True, capture_output=True)
        return
    else:
        raise SystemExit("unknown provider " + provider)
    open(path, "wb").write(audio)


man = {}
for text in lines:
    f = os.path.join(outdir, hashlib.sha1((provider + voice + text).encode()).hexdigest()[:16] + ".mp3")
    if not os.path.exists(f) or os.path.getsize(f) == 0:
        synth(text, f)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True, check=True).stdout)
    man[text] = {"file": os.path.abspath(f), "dur": dur}
json.dump(man, open(os.path.join(outdir, "manifest.json"), "w"), ensure_ascii=False, indent=1)
print(len(man), "lines,", round(sum(v["dur"] for v in man.values())), "s of speech")
