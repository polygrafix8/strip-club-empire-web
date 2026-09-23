(function () {
  'use strict';

  var STEAM = 'https://store.steampowered.com/app/4994860/Strip_Club_Empire/';
  var BEST_KEY = 'sce_stage_tips_best';
  var MUTE_KEY = 'sce_stage_tips_mute';
  var sim = window.StageTipsSim;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var hud = document.getElementById('hud');
  var cashEl = document.getElementById('cash');
  var timerEl = document.getElementById('timer');
  var roundEl = document.getElementById('roundLabel');
  var comboEl = document.getElementById('combo');
  var startOverlay = document.getElementById('startOverlay');
  var endOverlay = document.getElementById('endOverlay');
  var muteBtn = document.getElementById('mute');
  var bestStart = document.getElementById('bestStart');
  var copyNote = document.getElementById('copyNote');

  var cssW = 800;
  var cssH = 600;
  var dpr = 1;
  var mode = 'ready';
  var match = null;
  var pointer = null;
  var trail = [];
  var particles = [];
  var shake = 0;
  var arm = { x: 0, y: 0, on: false };
  var lastTs = 0;
  var audioCtx = null;
  var muted = false;
  var reduced = false;
  var idleBills = [];
  var bgImg = new Image();
  var bgOk = false;
  bgImg.onload = function () { bgOk = true; };
  bgImg.src = 'bg.jpg';

  try {
    muted = localStorage.getItem(MUTE_KEY) === '1';
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* ignore */ }

  function readBest() {
    try { return Number(localStorage.getItem(BEST_KEY) || 0) || 0; }
    catch (e) { return 0; }
  }

  function writeBest(n) {
    try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* ignore */ }
  }

  function money(n) {
    return '$' + Math.max(0, Math.round(n)).toLocaleString();
  }

  function showBest() {
    var best = readBest();
    if (best > 0) {
      bestStart.hidden = false;
      bestStart.textContent = 'Your best: ' + money(best);
    }
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    cssW = Math.max(320, rect.width);
    cssH = Math.max(240, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    if (match) {
      match.w = cssW;
      match.h = cssH;
    }
    if (!arm.on) {
      arm.x = cssW * 0.9;
      arm.y = cssH * 0.74;
    }
  }

  function unlockAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(freq, dur, type, gain, slide) {
    if (muted || !audioCtx) return;
    var t0 = audioCtx.currentTime;
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function playHit(hit) {
    if (hit.type === 'junk') {
      tone(140, 0.22, 'square', 0.05, 70);
      shake = Math.max(shake, hit.id === 'heel' ? 14 : 8);
      burst(hit.x, hit.y, '#ff4d6d', 14);
      return;
    }
    var pitch = 520 + Math.min(hit.combo, 8) * 48 + (hit.id === '100' ? 180 : 0);
    tone(pitch, 0.09, 'triangle', 0.06);
    burst(hit.x, hit.y, hit.id === '100' ? '#ff2d95' : '#ffc857', hit.id === '100' ? 18 : 8);
  }

  function burst(x, y, color, n) {
    var i;
    var a;
    var s;
    for (i = 0; i < n; i++) {
      a = Math.random() * Math.PI * 2;
      s = 70 + Math.random() * 240;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 30,
        life: 0.4 + Math.random() * 0.2,
        max: 0.55,
        color: color
      });
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSpot(x, y, color, alpha) {
    var g = ctx.createRadialGradient(x, y, 10, x, y, cssW * 0.55);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.globalAlpha = 1;
  }

  function drawClub(time) {
    var g;
    var y;
    var n;
    var i;
    var x;
    var bob;
    var scale;
    var dw;
    var dh;
    if (bgOk && bgImg.width) {
      scale = Math.max(cssW / bgImg.width, cssH / bgImg.height);
      dw = bgImg.width * scale;
      dh = bgImg.height * scale;
      ctx.drawImage(bgImg, (cssW - dw) / 2, (cssH - dh) / 2, dw, dh);
      g = ctx.createLinearGradient(0, cssH * 0.72, 0, cssH);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cssW, cssH);
      return;
    }
    g = ctx.createLinearGradient(0, 0, 0, cssH);
    g.addColorStop(0, '#241036');
    g.addColorStop(0.55, '#140818');
    g.addColorStop(1, '#07040c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);
    drawSpot(cssW * 0.32, -20, '#ff2d95', 0.2);
    drawSpot(cssW * 0.72, -10, '#b14dff', 0.16);
    drawSpot(cssW * 0.5, cssH * 0.15, '#ffc857', 0.05);

    y = cssH * 0.86;
    ctx.fillStyle = '#10060f';
    ctx.fillRect(0, y, cssW, cssH - y);
    ctx.fillStyle = 'rgba(255, 45, 149, 0.85)';
    ctx.fillRect(0, y - 3, cssW, 3);
    n = Math.max(7, Math.floor(cssW / 64));
    for (i = 0; i < n; i++) {
      x = (i + 0.5) * (cssW / n);
      bob = reduced ? 0 : Math.sin(time / 280 + i * 0.8) * 3;
      ctx.fillStyle = i % 2 ? '#2a1233' : '#1a0c22';
      ctx.beginPath();
      ctx.ellipse(x, y + 36 + bob, 24, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + 14 + bob, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBill(it) {
    var colors = { '1': '#1f8a4c', '5': '#178a55', '20': '#d4a017', '100': '#c45cff' };
    var w = it.radius * 1.7;
    var h = it.radius * 0.95;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(Math.sin(it.rot) * 0.35);
    roundRect(-w / 2, -h / 2, w, h, 5);
    ctx.fillStyle = colors[it.type] || '#1f8a4c';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    ctx.fillStyle = '#fff';
    ctx.font = '800 ' + Math.max(16, Math.floor(it.radius * 0.58)) + 'px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$' + it.type, 0, 1);
    ctx.restore();
  }

  function drawJunk(it) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot * 0.25);
    ctx.scale(1.35, 1.35);
    if (it.type === 'beer') {
      ctx.fillStyle = '#c9a06a';
      ctx.fillRect(-5, -20, 10, 8);
      ctx.fillStyle = '#6d3b16';
      roundRect(-10, -12, 20, 32, 6);
      ctx.fill();
      ctx.fillStyle = '#f2e2b0';
      ctx.fillRect(-8, -2, 16, 10);
    } else if (it.type === 'heel') {
      ctx.fillStyle = '#ff4f9a';
      ctx.beginPath();
      ctx.moveTo(-18, 4);
      ctx.quadraticCurveTo(0, -8, 16, 0);
      ctx.lineTo(10, 10);
      ctx.lineTo(-14, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(10, 0, 5, 20);
      ctx.beginPath();
      ctx.ellipse(12, 20, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1b1b22';
      roundRect(-13, -20, 26, 40, 5);
      ctx.fill();
      ctx.fillStyle = '#7af0ff';
      roundRect(-9, -14, 18, 24, 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function limb(ax, ay, bx, by, w0, w1, fill) {
    var ang = Math.atan2(by - ay, bx - ax);
    var px = Math.cos(ang + Math.PI / 2);
    var py = Math.sin(ang + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(ax + px * w0, ay + py * w0);
    ctx.lineTo(bx + px * w1, by + py * w1);
    ctx.lineTo(bx - px * w1, by - py * w1);
    ctx.lineTo(ax - px * w0, ay - py * w0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function solveElbow(sx, sy, tx, ty, upper, lower, bendSign) {
    var dx = tx - sx;
    var dy = ty - sy;
    var dist = Math.hypot(dx, dy) || 1;
    var max = upper + lower - 6;
    var min = Math.abs(upper - lower) + 8;
    var nx = tx;
    var ny = ty;
    if (dist > max) {
      nx = sx + dx / dist * max;
      ny = sy + dy / dist * max;
      dist = max;
    } else if (dist < min) {
      nx = sx + dx / dist * min;
      ny = sy + dy / dist * min;
      dist = min;
    }
    var ang = Math.atan2(ny - sy, nx - sx);
    var cosA = (upper * upper + dist * dist - lower * lower) / (2 * upper * dist);
    cosA = Math.max(-1, Math.min(1, cosA));
    var elbowAng = ang + bendSign * Math.acos(cosA);
    var ex = sx + Math.cos(elbowAng) * upper;
    var ey = sy + Math.sin(elbowAng) * upper;
    return { ex: ex, ey: ey, hx: nx, hy: ny, ang: Math.atan2(ny - ey, nx - ex) };
  }

  function drawHand(x, y, ang) {
    var i;
    var fx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = '#f0c4a4';
    ctx.beginPath();
    ctx.ellipse(0, 2, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e7b08a';
    for (i = 0; i < 4; i++) {
      fx = -11 + i * 7;
      limb(fx, -6, fx + (i - 1.5) * 1.2, -24, 3.4, 2.4, '#f0c4a4');
      ctx.fillStyle = '#ff2d95';
      ctx.beginPath();
      ctx.ellipse(fx + (i - 1.5) * 1.2, -25, 2.3, 3.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e7b08a';
    }
    limb(-16, 4, -24, -6, 3.2, 2.2, '#f0c4a4');
    ctx.fillStyle = '#ff2d95';
    ctx.beginPath();
    ctx.ellipse(-25, -7, 2.2, 2.8, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawOneArm(sx, sy, tx, ty, bendSign) {
    var upper = Math.max(78, cssH * 0.22);
    var lower = Math.max(70, cssH * 0.2);
    var pose = solveElbow(sx, sy, tx, ty, upper, lower, bendSign);
    limb(sx, sy, pose.ex, pose.ey, 16, 12, '#e2b08a');
    limb(sx + 2, sy, pose.ex, pose.ey, 7, 5, 'rgba(255, 220, 190, 0.28)');
    ctx.fillStyle = '#d9a484';
    ctx.beginPath();
    ctx.arc(pose.ex, pose.ey, 11, 0, Math.PI * 2);
    ctx.fill();
    limb(pose.ex, pose.ey, pose.hx, pose.hy, 11, 7, '#e8b896');
    limb(pose.ex, pose.ey, pose.hx, pose.hy, 4, 2.5, 'rgba(255, 228, 206, 0.35)');
    ctx.strokeStyle = '#ffc857';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pose.hx - Math.cos(pose.ang) * 14, pose.hy - Math.sin(pose.ang) * 14, 8, pose.ang - 1.2, pose.ang + 1.2);
    ctx.stroke();
    drawHand(pose.hx, pose.hy, pose.ang);
  }

  function drawArm() {
    var leftX;
    var rightX;
    var leftY;
    var rightY;
    var useLeft;
    if (mode === 'over') return;
    leftX = cssW * 0.2;
    rightX = cssW * 0.8;
    leftY = cssH * 0.78;
    rightY = cssH * 0.78;
    if (arm.on) {
      useLeft = Math.abs(arm.x - leftX) <= Math.abs(arm.x - rightX);
      if (useLeft) {
        leftX = arm.x;
        leftY = arm.y;
      } else {
        rightX = arm.x;
        rightY = arm.y;
      }
    }
    drawOneArm(cssW * 0.3, cssH + 36, leftX, leftY, -1);
    drawOneArm(cssW * 0.7, cssH + 36, rightX, rightY, 1);
  }

  function drawTrail() {
    var i;
    var p;
    var q;
    if (trail.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (i = 1; i < trail.length; i++) {
      p = trail[i - 1];
      q = trail[i];
      ctx.strokeStyle = 'rgba(255, 45, 149,' + Math.max(p.life, 0) * 3.2 + ')';
      ctx.lineWidth = 10 * Math.max(q.life, 0.05);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
  }

  function drawPopups() {
    var i;
    var p;
    if (!match) return;
    ctx.textAlign = 'center';
    for (i = 0; i < match.popups.length; i++) {
      p = match.popups[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      ctx.fillStyle = p.color === 'bad' ? '#ff5c7a' : '#ffc857';
      ctx.font = '800 22px Inter, sans-serif';
      ctx.fillText(p.text, p.x, p.y);
      if (p.combo >= 2) {
        ctx.font = '700 14px Orbitron, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText('x' + p.combo, p.x, p.y + 18);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawBanner() {
    if (!match || match.bannerLife <= 0) return;
    ctx.globalAlpha = Math.min(1, match.bannerLife * 1.6);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '800 ' + Math.max(36, Math.min(64, cssW * 0.08)) + 'px Orbitron, sans-serif';
    ctx.fillText(match.banner, cssW / 2, cssH * 0.36);
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillStyle = '#ffc857';
    ctx.fillText(match.round === 2 ? 'Faster. More junk in the air.' : 'Final round. Leave the phones alone.', cssW / 2, cssH * 0.36 + 36);
    ctx.globalAlpha = 1;
  }

  function drawIdle(time) {
    var i;
    var b;
    if (!idleBills.length) {
      for (i = 0; i < 5; i++) {
        idleBills.push({
          x: cssW * (0.2 + i * 0.15),
          y: cssH * (0.35 + (i % 2) * 0.12),
          type: ['1', '5', '20', '1', '100'][i],
          radius: 40,
          rot: i
        });
      }
    }
    for (i = 0; i < idleBills.length; i++) {
      b = idleBills[i];
      b.y = cssH * (0.34 + (i % 3) * 0.08) + Math.sin(time / 500 + i) * 10;
      b.rot += 0.01;
      drawBill(b);
    }
  }

  function draw(time) {
    var i;
    var p;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    if (shake > 0.4 && !reduced) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawClub(time);
    if (mode === 'play' && match) {
      for (i = 0; i < match.items.length; i++) {
        if (match.items[i].kind === 'junk') drawJunk(match.items[i]);
        else drawBill(match.items[i]);
      }
    } else if (mode === 'ready') {
      drawIdle(time);
    }
    for (i = particles.length - 1; i >= 0; i--) {
      p = particles[i];
      p.life -= 0.016;
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.vy += 400 * 0.016;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
      ctx.globalAlpha = 1;
    }
    for (i = trail.length - 1; i >= 0; i--) {
      trail[i].life -= 0.016;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
    drawTrail();
    drawArm();
    drawPopups();
    drawBanner();
    if (match && match.stun > 0) {
      ctx.fillStyle = 'rgba(255, 40, 70, 0.16)';
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.globalAlpha = Math.min(1, match.stun * 2);
      ctx.fillStyle = '#fff';
      ctx.font = '800 28px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FUMBLED', cssW / 2, cssH * 0.22);
      ctx.globalAlpha = 1;
    }
  }

  function syncHud() {
    var left;
    var m;
    var s;
    if (!match) return;
    cashEl.textContent = money(match.cash);
    left = Math.max(0, sim.DURATION - match.t);
    m = Math.floor(left / 60);
    s = Math.floor(left % 60);
    timerEl.textContent = m + ':' + String(s).padStart(2, '0');
    roundEl.textContent = 'Round ' + match.round;
    comboEl.textContent = match.combo >= 2 ? 'x' + match.combo : '';
  }

  function startGame() {
    unlockAudio();
    resize();
    match = sim.createMatch(cssW, cssH);
    mode = 'play';
    shake = 0;
    particles = [];
    trail = [];
    startOverlay.hidden = true;
    endOverlay.hidden = true;
    hud.hidden = false;
    muteBtn.hidden = false;
    copyNote.textContent = '';
    if (!muted) tone(330, 0.12, 'sine', 0.04, 520);
    syncHud();
  }

  function finish() {
    var best;
    var fresh;
    mode = 'over';
    hud.hidden = true;
    endOverlay.hidden = false;
    document.getElementById('endCash').textContent = money(match.cash);
    document.getElementById('endCombo').textContent = 'Best combo x' + Math.max(1, match.bestCombo);
    document.getElementById('endJunk').textContent = 'Junk grabbed ' + match.junkHits;
    best = readBest();
    fresh = match.cash > best;
    if (fresh) {
      best = match.cash;
      writeBest(best);
    }
    document.getElementById('endBest').textContent = fresh ? 'New best.' : ('Best: ' + money(best));
    if (!muted) tone(220, 0.28, 'triangle', 0.05, 110);
    showBest();
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    pointer = { x: e.offsetX, y: e.offsetY, t: performance.now() };
    arm.x = pointer.x;
    arm.y = pointer.y;
    arm.on = true;
    trail.push({ x: pointer.x, y: pointer.y, life: 0.16 });
  }

  function onPointerMove(e) {
    var x = e.offsetX;
    var y = e.offsetY;
    var now;
    var dt;
    var hits;
    var i;
    if (!pointer) {
      arm.x += (x - arm.x) * 0.2;
      arm.y += (y - arm.y) * 0.2;
      return;
    }
    now = performance.now();
    dt = (now - pointer.t) / 1000;
    if (mode === 'play' && match) {
      hits = sim.swipe(match, pointer.x, pointer.y, x, y, dt);
      for (i = 0; i < hits.length; i++) playHit(hits[i]);
      if (hits.length) syncHud();
    }
    trail.push({ x: x, y: y, life: 0.18 });
    if (trail.length > 18) trail.shift();
    arm.x = x;
    arm.y = y;
    pointer = { x: x, y: y, t: now };
  }

  function onPointerUp() {
    pointer = null;
  }

  function loop(ts) {
    var dt = Math.min(0.033, lastTs ? (ts - lastTs) / 1000 : 0.016);
    lastTs = ts;
    if (!document.hidden && mode === 'play' && match && !match.over) {
      sim.update(match, dt);
      syncHud();
      if (match.over) finish();
    }
    if (shake > 0) shake = Math.max(0, shake - dt * 28);
    if (!arm.on) {
      arm.x = cssW * 0.9 + Math.sin(ts / 700) * 12;
      arm.y = cssH * 0.74 + Math.cos(ts / 900) * 8;
    }
    draw(ts);
    requestAnimationFrame(loop);
  }

  function bootAge() {
    var gate = document.getElementById('ageGate');
    var denied = document.getElementById('ageDenied');
    var card = document.getElementById('ageCard');
    function unlock() {
      try { localStorage.setItem('sce_age_ok', '1'); } catch (e) { /* ignore */ }
      document.documentElement.classList.remove('age-locked');
      document.documentElement.classList.add('age-ok');
      gate.hidden = true;
    }
    if (document.documentElement.classList.contains('age-ok')) {
      gate.hidden = true;
      return;
    }
    gate.hidden = false;
    document.getElementById('ageEnter').addEventListener('click', unlock);
    document.getElementById('ageExit').addEventListener('click', function () {
      card.hidden = true;
      denied.hidden = false;
    });
  }

  document.getElementById('playBtn').addEventListener('click', startGame);
  document.getElementById('againBtn').addEventListener('click', startGame);
  muteBtn.addEventListener('click', function () {
    muted = !muted;
    muteBtn.textContent = muted ? 'Sound off' : 'Sound on';
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (!muted) unlockAudio();
  });
  muteBtn.textContent = muted ? 'Sound off' : 'Sound on';
  document.getElementById('copyBtn').addEventListener('click', function () {
    var text = 'I caught ' + money(match ? match.cash : 0) + ' in Stage Tips. https://stripclubempire.com/stage-tips/';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        copyNote.textContent = 'Copied.';
      }).catch(function () {
        copyNote.textContent = text;
      });
    } else {
      copyNote.textContent = text;
    }
  });

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', resize);

  bootAge();
  showBest();
  resize();
  requestAnimationFrame(loop);

  window.STAGE_TIPS_STEAM = STEAM;
})();
