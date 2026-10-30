// Recording harness: drives the real app with Playwright, draws a fake cursor,
// highlight boxes, captions and chapter cards inside the page, and captures
// frames through the CDP screencast (sharp text, real timing).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const BASE = "http://localhost:3000";
const IDS = {
  owner: "00000000-0000-0000-0000-000000000001",
  may: "00000000-0000-0000-0000-000000000002",
  boss: "00000000-0000-0000-0000-000000000003",
  june: "00000000-0000-0000-0000-000000000004",
  fah: "00000000-0000-0000-0000-000000000005",
};

const OVERLAY = String.raw`
(() => {
  const css = ` + "`" + String.raw`
  #tut-root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:inherit}
  #tut-ui{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0}
  #tut-cursor{position:absolute;left:0;top:0;width:26px;height:26px;transition:transform 700ms cubic-bezier(.45,.05,.25,1);will-change:transform;filter:drop-shadow(0 3px 4px rgba(0,0,0,.35))}
  #tut-hl{position:absolute;border:4px solid #f97316;border-radius:14px;box-shadow:0 0 0 9999px rgba(15,23,42,.28),0 0 24px rgba(249,115,22,.7);opacity:0;transition:all 450ms ease}
  #tut-cap{position:absolute;left:50%;bottom:44px;transform:translateX(-50%) translateY(20px);max-width:1500px;min-width:520px;background:rgba(17,24,39,.92);color:#fff;border-radius:22px;padding:22px 34px;font-size:34px;line-height:1.45;font-weight:500;display:flex;gap:22px;align-items:center;opacity:0;transition:opacity 300ms ease,transform 300ms ease;box-shadow:0 18px 40px rgba(0,0,0,.35)}
  #tut-cap.top{bottom:auto;top:110px}
  #tut-cap.show{opacity:1;transform:translateX(-50%) translateY(0)}
  #tut-cap b{color:#fdba74;font-weight:700}
  #tut-step{flex:none;background:#f97316;color:#fff;border-radius:14px;padding:6px 16px;font-size:26px;font-weight:700;white-space:nowrap}
  #tut-title{position:absolute;inset:0;background:linear-gradient(135deg,#fff7ed 0%,#ffedd5 45%,#fdba74 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;opacity:0;transition:opacity 450ms ease;color:#1f2937;text-align:center}
  #tut-title.show{opacity:1}
  #tut-title .ch{background:#f97316;color:#fff;font-weight:700;font-size:34px;border-radius:999px;padding:8px 30px}
  #tut-title .main{font-size:86px;font-weight:800;line-height:1.2}
  #tut-title .sub{font-size:38px;color:#7c2d12;max-width:1400px;line-height:1.5}
  #tut-title img{width:120px;height:120px;border-radius:28px;box-shadow:0 10px 30px rgba(249,115,22,.35)}
  #tut-title ul{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,560px));gap:14px 40px;text-align:left;font-size:32px}
  #tut-title li{background:rgba(255,255,255,.85);border-radius:16px;padding:12px 22px}
  #tut-title li span{color:#f97316;font-weight:800;margin-right:12px}
  #tut-card{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.55);opacity:0;transition:opacity 400ms ease}
  #tut-card.show{opacity:1}
  #tut-card .box{background:#fff;border-radius:30px;padding:44px 56px;max-width:1500px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
  #tut-card h2{margin:0 0 26px;font-size:46px;color:#1f2937}
  #tut-card .row{display:flex;align-items:center;gap:24px;font-size:30px;color:#374151;margin:12px 0}
  #tut-card .pill{flex:none;width:170px;text-align:center;border-radius:999px;color:#fff;font-weight:700;padding:6px 0;font-size:28px}
  #tut-card .arrow{color:#f97316;font-weight:800}
  .tut-ripple{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:rgba(249,115,22,.55);animation:tutr 600ms ease-out forwards}
  @keyframes tutr{to{transform:scale(4.5);opacity:0}}
  ` + "`" + String.raw`;
  function install() {
    if (document.getElementById("tut-root")) return;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const root = document.createElement("div"); root.id = "tut-root";
    root.innerHTML = '<div id="tut-hl"></div><div id="tut-ui"><div id="tut-card"></div><div id="tut-title"></div><div id="tut-cap"><span id="tut-step"></span><span id="tut-text"></span></div></div>' +
      '<svg id="tut-cursor" viewBox="0 0 24 24"><path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z" fill="#111827" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(root);
    document.getElementById("tut-ui").style.transform = "scale(" + window.innerWidth / 1920 + ")";
    const s = window.__tutState || {};
    if (s.x !== undefined) window.__tut.cursor(s.x, s.y, 0);
    if (s.cap) window.__tut.cap(s.cap, s.step, s.pos, true);
  }
  window.__tut = {
    cursor(x, y, ms) { const c = document.getElementById("tut-cursor"); if (!c) return; c.style.transitionDuration = ms + "ms"; c.style.transform = "translate(" + (x - 5) + "px," + (y - 3) + "px)"; },
    ripple(x, y) { const r = document.createElement("div"); r.className = "tut-ripple"; r.style.left = x + "px"; r.style.top = y + "px"; document.getElementById("tut-root").appendChild(r); setTimeout(() => r.remove(), 700); },
    hl(b, pad) { const h = document.getElementById("tut-hl"); if (!b) { h.style.opacity = 0; return; } pad = pad ?? 8; Object.assign(h.style, { left: b.x - pad + "px", top: b.y - pad + "px", width: b.width + pad * 2 + "px", height: b.height + pad * 2 + "px", opacity: 1 }); },
    cap(html, step, pos, instant) { const c = document.getElementById("tut-cap"); if (!c) return; if (!html) { c.classList.remove("show"); return; }
      document.getElementById("tut-text").innerHTML = html; const st = document.getElementById("tut-step"); st.textContent = step || ""; st.style.display = step ? "" : "none";
      c.classList.toggle("top", pos === "top"); if (instant) c.style.transition = "none"; c.classList.add("show"); if (instant) { c.offsetHeight; c.style.transition = ""; } },
    title(html) { const t = document.getElementById("tut-title"); if (!html) { t.classList.remove("show"); return; } t.innerHTML = html; t.classList.add("show"); },
    card(html) { const t = document.getElementById("tut-card"); if (!html) { t.classList.remove("show"); return; } t.innerHTML = '<div class="box">' + html + "</div>"; t.classList.add("show"); },
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();
`;

// What the narrator says for a caption: no markup/emoji, symbols read as words.
function speechText(html) {
  return (html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/[✅🎉⚠️✓📋🧡]/gu, "")
    .replace(/\b0:(\d\d)\b/g, (_, s) => `วินาทีที่ ${Number(s)}`)
    .replace(/\s*→\s*/g, " แล้ว ")
    .replace(/\s+=\s+/g, " คือ ")
    .replace(/\s+\/\s+/g, " หรือ ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/\+\s*(?=File|Ref|Final|เพิ่ม)/g, "")
    .replace(/\s+\+\s+/g, " และ ")
    .replace(/\bPIN\b/g, "พิน")
    .replace(/\s+/g, " ")
    .trim();
}

class Tut {
  constructor(name, outDir, { vw = 1600 } = {}) {
    this.vw = vw; this.vh = Math.round(vw * 9 / 16);
    this.name = name;
    this.outDir = outDir;
    this.frames = [];
    this.state = { x: 700, y: 500 };
    this.pending = [];
    this.events = []; // { t, file } narration clips, absolute time
    this.caps = []; // { t0, t1, text } for the SRT
    const vf = path.join(outDir, "voice", "manifest.json");
    this.voice = fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf, "utf8")) : null;
  }
  // start a narration clip now; returns how long it lasts (ms), 0 without a voice
  speak(text) {
    const v = this.voice && this.voice[speechText(text)];
    if (!v) { if (this.voice) console.log("NO VOICE FOR", speechText(text)); return 0; }
    this.events.push({ t: Date.now() / 1000, file: v.file });
    return Math.round(v.dur * 1000);
  }
  async start({ clock = "2026-10-29T10:00:00+07:00", loginAs } = {}) {
    fs.rmSync(path.join(this.outDir, "frames"), { recursive: true, force: true });
    fs.mkdirSync(path.join(this.outDir, "frames"), { recursive: true });
    this.browser = await chromium.launch();
    this.ctx = await this.browser.newContext({ viewport: { width: this.vw, height: this.vh }, deviceScaleFactor: 1920 / this.vw, locale: "th-TH", timezoneId: "Asia/Bangkok" });
    await this.ctx.addInitScript(OVERLAY);
    await this.ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    this.page = await this.ctx.newPage();
    this.page.on("pageerror", (e) => console.log("PAGEERR", e.message));
    this.page.on("dialog", (d) => d.accept());
    await this.page.clock.install({ time: new Date(clock) });
    if (loginAs) {
      const r = await this.page.request.post(BASE + "/api/auth/login", { data: { staffId: IDS[loginAs], pin: "1234" } });
      if (r.status() !== 200) throw new Error("login failed");
    }
    this.cdp = await this.ctx.newCDPSession(this.page);
    this.recording = false;
  }
  async rec() {
    // capture loop: device-pixel screenshots at whatever rate the browser manages (~15-20 fps)
    this.recording = true;
    const scale = 1920 / this.vw;
    let n = 0;
    this.loop = (async () => {
      while (this.recording) {
        try {
          const lm = await this.cdp.send("Page.getLayoutMetrics");
          const vp = lm.cssVisualViewport || lm.visualViewport;
          const r = await Promise.race([this.cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90, optimizeForSpeed: true, clip: { x: vp.pageX, y: vp.pageY, width: this.vw, height: this.vh, scale } }), new Promise((_, rej) => setTimeout(() => rej(new Error("capture timeout")), 3000))]);
          const file = path.join(this.outDir, "frames", `f${String(n++).padStart(6, "0")}.jpg`);
          this.frames.push({ t: Date.now() / 1000, file });
          this.pending.push(fs.promises.writeFile(file, Buffer.from(r.data, "base64")));
        } catch (e) { await new Promise((r) => setTimeout(r, 30)); }
      }
    })();
  }
  wait(ms) { return this.page.waitForTimeout(ms); }
  async sync() { await this.page.evaluate((s) => { window.__tutState = s; }, this.state).catch(() => {}); }
  async goto(p, settle = 2200) {
    await this.page.goto(BASE + p);
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.page.evaluate((s) => { window.__tutState = s; const i = () => { if (!document.getElementById("tut-root")) return setTimeout(i, 50); const t = window.__tut; t.cursor(s.x, s.y, 0); if (s.cap) t.cap(s.cap, s.step, s.pos, true); }; i(); }, this.state);
    await this.wait(settle);
  }
  async cap(html, step, { pos, read } = {}) {
    Object.assign(this.state, { cap: html, step, pos });
    await this.page.evaluate(([h, s, p]) => window.__tut.cap(h, s, p), [html, step, pos]);
    await this.sync();
    const t0 = Date.now() / 1000;
    const said = this.speak(html);
    // reading time: ~14 Thai chars per second, at least 2.6 s — and never shorter than the narration
    const plain = (html || "").replace(/<[^>]+>/g, "");
    await this.wait(Math.max(read ?? Math.max(2600, plain.length * 70), said ? said + 700 : 0));
    this.caps.push({ t0, t1: Date.now() / 1000, text: plain });
  }
  async nocap() { this.state.cap = null; await this.page.evaluate(() => window.__tut.cap(null)); await this.sync(); await this.wait(300); }
  async box(loc) {
    const l = typeof loc === "string" ? this.page.locator(loc).first() : loc;
    await l.scrollIntoViewIfNeeded().catch(() => {});
    const b = await l.boundingBox();
    if (!b) throw new Error("no box for " + loc);
    return b;
  }
  async move(loc, ms = 750) {
    const b = await this.box(loc);
    const x = Math.round(b.x + Math.min(b.width / 2, 60)), y = Math.round(b.y + b.height / 2);
    Object.assign(this.state, { x, y });
    await this.page.evaluate(([x, y, ms]) => window.__tut.cursor(x, y, ms), [x, y, ms]);
    await this.sync();
    await this.wait(ms + 120);
    return b;
  }
  async click(loc, { ms = 750, after = 900 } = {}) {
    const l = typeof loc === "string" ? this.page.locator(loc).first() : loc;
    await this.move(l, ms);
    await this.page.evaluate(([x, y]) => window.__tut.ripple(x, y), [this.state.x, this.state.y]);
    await this.wait(180);
    await l.click();
    await this.wait(after);
  }
  async type(loc, text, { delay = 85 } = {}) {
    const l = typeof loc === "string" ? this.page.locator(loc).first() : loc;
    await this.click(l, { after: 250 });
    await l.pressSequentially(text, { delay });
    await this.wait(500);
  }
  async select(loc, value, { after = 900 } = {}) {
    const l = typeof loc === "string" ? this.page.locator(loc).first() : loc;
    await this.move(l);
    await this.page.evaluate(([x, y]) => window.__tut.ripple(x, y), [this.state.x, this.state.y]);
    await this.wait(250);
    await l.selectOption(value);
    await this.wait(after);
  }
  async hl(loc, ms = 0, pad) {
    if (!loc) { await this.page.evaluate(() => window.__tut.hl(null)); return; }
    const b = await this.box(loc);
    await this.page.evaluate(([b, pad]) => window.__tut.hl(b, pad), [b, pad]);
    if (ms) await this.wait(ms);
  }
  async title(html, ms = 3200, { say } = {}) {
    await this.page.evaluate((h) => window.__tut.title(h), html);
    await this.wait(400);
    const said = say ? this.speak(say) : 0;
    await this.wait(Math.max(ms - 400, said ? said + 700 : 0));
    await this.page.evaluate(() => window.__tut.title(null));
    await this.wait(500);
  }
  async card(html, ms, { say } = {}) {
    await this.page.evaluate((h) => window.__tut.card(h), html);
    await this.wait(400);
    const said = say ? this.speak(say) : 0;
    await this.wait(Math.max(ms - 400, said ? said + 700 : 0));
    await this.page.evaluate(() => window.__tut.card(null));
    await this.wait(450);
  }
  chapter(n, main, sub) {
    return this.title(`<img src="/icon-512.png"><div class="ch">บทที่ ${n}</div><div class="main">${main}</div>${sub ? `<div class="sub">${sub}</div>` : ""}`, 2800, { say: `บทที่ ${n}. ${main.replace(/"/g, "")}` });
  }
  async finish(musicGain = 0.06) {
    await this.wait(400);
    this.recording = false;
    await this.loop;
    await Promise.all(this.pending);
    await this.browser.close();
    const fr = this.frames;
    const list = fr.map((f, i) => `file '${f.file}'\nduration ${(i + 1 < fr.length ? fr[i + 1].t - f.t : 1.5).toFixed(4)}`).join("\n") + `\nfile '${fr[fr.length - 1].file}'\n`;
    fs.writeFileSync(path.join(this.outDir, "list.txt"), list);
    const dur = fr[fr.length - 1].t - fr[0].t + 1.5;
    const silent = path.join(this.outDir, "video.mp4");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(this.outDir, "list.txt"),
      "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "18", silent]);
    // music sits lower under a narrator
    execFileSync("python3", ["-I", path.join(__dirname, "music.py"), path.join(this.outDir, "music.wav"), String(dur), String(this.events.length ? musicGain * 0.45 : musicGain)]);
    let audio = path.join(this.outDir, "music.wav");
    if (this.events.length) {
      const ev = this.events.map((e) => ({ at: e.t - fr[0].t, file: e.file }));
      fs.writeFileSync(path.join(this.outDir, "voice-events.json"), JSON.stringify(ev));
      execFileSync("python3", ["-I", path.join(__dirname, "mix.py"), audio, path.join(this.outDir, "voice-events.json"), path.join(this.outDir, "mix.wav")]);
      audio = path.join(this.outDir, "mix.wav");
    }
    const ts = (x) => { const ms = Math.max(0, Math.round((x - fr[0].t) * 1000)); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
    fs.writeFileSync(path.join(this.outDir, `${this.name}.srt`), this.caps.map((c, i) => `${i + 1}\n${ts(c.t0)} --> ${ts(c.t1)}\n${c.text}\n`).join("\n"));
    const out = path.join(this.outDir, `${this.name}.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", silent, "-i", audio, "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out]);
    console.log("wrote", out, dur.toFixed(1) + "s", fr.length, "frames");
  }
}

module.exports = { Tut, IDS, speechText };
