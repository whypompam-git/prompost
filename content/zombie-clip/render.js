const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const fps = 30;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + __dirname + '/scene.html'); await p.evaluate(() => window.ready);
  const dur = await p.evaluate(() => window.DURATION);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', 'audio.wav',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', 'zombie-agency-clip.mp4'], { cwd: __dirname, stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(dur * fps);
  for (let f = 0; f < total; f++) {
    const url = await p.evaluate(t => { window.render(t); return document.getElementById('c').toDataURL('image/jpeg', 0.92); }, f / fps);
    const buf = Buffer.from(url.split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log('frame', f, '/', total);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done');
})();
