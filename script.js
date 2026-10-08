'use strict';
const music = document.querySelector('#music');
const video = document.querySelector('#film');
const dialog = document.querySelector('#film-dialog');
const sound = document.querySelector('#sound');
const notice = document.querySelector('#audio-notice');
const videoError = document.querySelector('#video-error');
let context, gain, musicReady, musicStarted = false, muted = false;
const musicLevel = 0.28;

// Unlock audio inside the video click; keep it silent until the film exits.
function prepareMusic() {
  if (musicReady) return musicReady;
  try {
    if (!context) {
      context = new (window.AudioContext || window.webkitAudioContext)();
      gain = context.createGain();
      gain.gain.value = 0;
      context.createMediaElementSource(music).connect(gain).connect(context.destination);
    }
    const resume = context.resume();
    musicReady = Promise.all([resume, music.play()]).catch(() => {
      musicReady = null;
      return false;
    });
  } catch {
    musicReady = null;
    return Promise.resolve(false);
  }
  return musicReady;
}
function fadeTo(level, seconds = 2) {
  if (!gain) return;
  const now = context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(level, now + seconds);
}
function showAudioNotice() {
  notice.textContent = '声音未能开启，请点击右上角声音按钮重试。';
  notice.hidden = false;
  sound.title = '点击开启声音';
  sound.setAttribute('aria-label', '点击开启声音');
}
async function startMusic() {
  if (!musicStarted) music.currentTime = 0;
  musicStarted = true;
  const ready = await musicReady;
  if (dialog.open) return;
  if (!musicReady || ready === false || music.paused || !gain || context.state !== 'running') {
    showAudioNotice();
    return;
  }
  notice.hidden = true;
  fadeTo(muted ? 0 : musicLevel);
}
function closeFilm() { if (dialog.open) dialog.close(); }
document.querySelector('#open-film').addEventListener('click', () => {
  prepareMusic();
  fadeTo(0, 0.15);
  videoError.hidden = true;
  dialog.showModal();
  video.currentTime = 0;
  video.play().catch(() => {
    videoError.textContent = '视频未能播放，请使用播放器的播放按钮重试，或关闭视频进入音乐。';
    videoError.hidden = false;
  });
});
document.querySelector('#close-film').addEventListener('click', closeFilm);
dialog.addEventListener('click', event => { if (event.target === dialog) closeFilm(); });
dialog.addEventListener('close', () => { video.pause(); startMusic(); });
video.addEventListener('ended', closeFilm);
video.addEventListener('error', () => {
  videoError.textContent = '视频加载失败。关闭视频后仍可进入音乐。';
  videoError.hidden = false;
});
music.addEventListener('error', showAudioNotice);
sound.addEventListener('click', async () => {
  if (!notice.hidden && musicStarted) {
    try {
      if (!gain) prepareMusic();
      await context.resume();
      await music.play();
      musicReady = Promise.resolve(true);
      notice.hidden = true;
    } catch { showAudioNotice(); return; }
  } else {
    muted = !muted;
  }
  music.muted = muted;
  sound.setAttribute('aria-pressed', String(muted));
  sound.setAttribute('aria-label', muted ? '取消静音' : '静音');
  sound.title = muted ? '取消静音' : '静音';
  if (musicStarted && !dialog.open) fadeTo(muted ? 0 : musicLevel, 0.2);
});

const canvas = document.querySelector('#stardust');
const ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let particles = [], lastPointer = null, frame = 0, width = 0, height = 0;
function resize() {
  width = innerWidth; height = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
resize(); addEventListener('resize', resize);
// Four inward curves; long axis stays vertical. No rotation anywhere.
function starPath(size) {
  const x = size * 0.66;
  ctx.beginPath(); ctx.moveTo(0, -size);
  ctx.bezierCurveTo(x * 0.12, -size * 0.2, x * 0.23, -size * 0.07, x, 0);
  ctx.bezierCurveTo(x * 0.23, size * 0.07, x * 0.12, size * 0.2, 0, size);
  ctx.bezierCurveTo(-x * 0.12, size * 0.2, -x * 0.23, size * 0.07, -x, 0);
  ctx.bezierCurveTo(-x * 0.23, -size * 0.07, -x * 0.12, -size * 0.2, 0, -size);
  ctx.closePath();
}
function render(now) {
  frame = 0;
  ctx.clearRect(0, 0, width, height);
  particles = particles.filter(p => now - p.born < p.life);
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    const age = (now - p.born) / p.life;
    const opacity = Math.pow(1 - age, 1.7) * p.opacity;
    const size = p.size * (1 - age * 0.65);
    ctx.save(); ctx.translate(p.x + p.dx * age, p.y + p.dy * age);
    ctx.globalAlpha = opacity;
    if (p.dot) {
      ctx.fillStyle = '#c9fafa'; ctx.shadowColor = '#54bedf'; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.save(); ctx.translate(1.2, 0.5); ctx.globalAlpha = opacity * 0.32;
      ctx.fillStyle = '#ff243d'; ctx.shadowColor = '#ff243d'; ctx.shadowBlur = 3;
      starPath(size); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#8ceef3'; ctx.shadowColor = '#54bedf'; ctx.shadowBlur = size * 0.75;
      starPath(size); ctx.fill();
      ctx.fillStyle = '#c9fafa'; ctx.shadowColor = '#8ceef3'; ctx.shadowBlur = 3;
      starPath(size * 0.76); ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  if (particles.length) frame = requestAnimationFrame(render);
}
addEventListener('pointermove', event => {
  if (reduced.matches || event.pointerType === 'touch' || document.hidden) return;
  const now = performance.now();
  const current = {x: event.clientX, y: event.clientY, time: now};
  if (!lastPointer || now - lastPointer.time > 120) { lastPointer = current; return; }
  const dx = current.x - lastPointer.x, dy = current.y - lastPointer.y;
  const distance = Math.hypot(dx, dy);
  const speed = distance / Math.max(1, now - lastPointer.time);
  const count = Math.min(36, Math.ceil(distance / (4 + Math.min(speed * 5, 16))));
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    particles.push({x: lastPointer.x + dx * t, y: lastPointer.y + dy * t,
      size: Math.random() < 0.04 ? 16 : 3 + Math.random() * 9,
      opacity: 0.45 + Math.random() * 0.4, life: 600 + Math.random() * 600, born: now,
      dx: (Math.random() - 0.5) * 12, dy: (Math.random() - 0.5) * 16,
      dot: Math.random() < 0.23});
  }
  if (particles.length > 140) particles.splice(0, particles.length - 140);
  lastPointer = current;
  if (!frame && particles.length) frame = requestAnimationFrame(render);
}, {passive: true});
function clearTrail() {
  cancelAnimationFrame(frame); frame = 0; particles = []; lastPointer = null;
  ctx.clearRect(0, 0, width, height);
}
reduced.addEventListener('change', clearTrail);
addEventListener('blur', () => { lastPointer = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden) clearTrail(); });
