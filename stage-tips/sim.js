/* Stage Tips rules. No DOM. Browser + node. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StageTipsSim = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DURATION = 90;
  var COMBO_WINDOW = 1.35;
  var COMBO_CAP = 8;

  var MONEY = [
    { kind: 'money', id: '1', value: 1, penalty: 0, stun: 0, radius: 46 },
    { kind: 'money', id: '5', value: 5, penalty: 0, stun: 0, radius: 46 },
    { kind: 'money', id: '20', value: 20, penalty: 0, stun: 0, radius: 50 },
    { kind: 'money', id: '100', value: 100, penalty: 0, stun: 0, radius: 52 }
  ];

  var JUNK = [
    { kind: 'junk', id: 'beer', value: 0, penalty: 15, stun: 0, radius: 34, weight: 50 },
    { kind: 'junk', id: 'heel', value: 0, penalty: 40, stun: 0, radius: 34, weight: 30 },
    { kind: 'junk', id: 'phone', value: 0, penalty: 25, stun: 0.45, radius: 32, weight: 20 }
  ];

  function distPointSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    var len2 = dx * dx + dy * dy;
    if (len2 < 0.0001) return Math.hypot(px - ax, py - ay);
    var t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  function alongSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    var len2 = dx * dx + dy * dy;
    if (len2 < 0.0001) return 0;
    return ((px - ax) * dx + (py - ay) * dy) / len2;
  }

  function roundAt(t) {
    if (t < 30) return 1;
    if (t < 60) return 2;
    return 3;
  }

  function roundTuning(round) {
    if (round === 1) return { spawn: 0.58, junk: 0.06, speed: 1, money: [62, 28, 10, 0] };
    if (round === 2) return { spawn: 0.38, junk: 0.16, speed: 1.22, money: [40, 32, 20, 8] };
    return { spawn: 0.26, junk: 0.28, speed: 1.48, money: [26, 28, 28, 18] };
  }

  function maxAir(round) {
    if (round === 1) return 7;
    if (round === 2) return 11;
    return 14;
  }

  function pickWeighted(rng, weights) {
    var total = 0;
    var i;
    for (i = 0; i < weights.length; i++) total += weights[i];
    if (total <= 0) return 0;
    var r = rng() * total;
    for (i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }

  function createMatch(w, h, rng) {
    return {
      w: w,
      h: h,
      t: 0,
      cash: 0,
      combo: 0,
      bestCombo: 0,
      junkHits: 0,
      catches: 0,
      lastCatch: -10,
      items: [],
      spawnAcc: 0.2,
      stun: 0,
      over: false,
      round: 1,
      banner: '',
      bannerLife: 0,
      tutorialLeft: 4,
      popups: [],
      rng: rng || Math.random,
      nextId: 1
    };
  }

  function chooseSpec(match) {
    var tune = roundTuning(match.round);
    if (match.tutorialLeft > 0) {
      match.tutorialLeft -= 1;
      return MONEY[match.rng() < 0.65 ? 0 : 1];
    }
    if (match.rng() < tune.junk) {
      return JUNK[pickWeighted(match.rng, JUNK.map(function (j) { return j.weight; }))];
    }
    return MONEY[pickWeighted(match.rng, tune.money)];
  }

  function spawnOne(match) {
    var tune = roundTuning(match.round);
    var rng = match.rng;
    var spec = chooseSpec(match);
    var x;
    var y;
    var vx;
    var vy;
    var roll = rng();
    if (roll < 0.78) {
      x = match.w * (0.12 + rng() * 0.76);
      y = match.h * (0.84 + rng() * 0.08);
      vx = (rng() - 0.5) * 280 * tune.speed;
      vy = -(700 + rng() * 360) * tune.speed;
    } else if (roll < 0.89) {
      x = -36;
      y = match.h * (0.5 + rng() * 0.28);
      vx = (400 + rng() * 200) * tune.speed;
      vy = -(460 + rng() * 240) * tune.speed;
    } else {
      x = match.w + 36;
      y = match.h * (0.5 + rng() * 0.28);
      vx = -(400 + rng() * 200) * tune.speed;
      vy = -(460 + rng() * 240) * tune.speed;
    }
    match.items.push({
      id: match.nextId++,
      kind: spec.kind,
      type: spec.id,
      value: spec.value,
      penalty: spec.penalty,
      stun: spec.stun,
      radius: spec.radius,
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      rot: rng() * Math.PI * 2,
      vr: (rng() - 0.5) * 5,
      alive: true
    });
  }

  function flyingCount(match) {
    var n = 0;
    var i;
    for (i = 0; i < match.items.length; i++) if (match.items[i].alive) n += 1;
    return n;
  }

  function resolveHit(match, it) {
    var loss;
    var mult;
    var gain;
    if (it.kind === 'junk') {
      match.combo = 0;
      match.junkHits += 1;
      loss = Math.min(match.cash, it.penalty);
      match.cash -= loss;
      if (it.stun) match.stun = Math.max(match.stun, it.stun);
      match.popups.push({
        x: it.x,
        y: it.y,
        text: loss ? '-$' + loss : 'MISS',
        color: 'bad',
        life: 0.85
      });
      return { type: 'junk', id: it.type, loss: loss, stun: it.stun || 0, x: it.x, y: it.y };
    }
    mult = Math.min(COMBO_CAP, match.combo + 1);
    match.combo = mult;
    if (mult > match.bestCombo) match.bestCombo = mult;
    match.lastCatch = match.t;
    match.catches += 1;
    gain = it.value * mult;
    match.cash += gain;
    match.popups.push({
      x: it.x,
      y: it.y,
      text: '+$' + gain,
      color: 'good',
      life: 0.7,
      combo: mult
    });
    return { type: 'money', id: it.type, gain: gain, combo: mult, x: it.x, y: it.y };
  }

  function update(match, dt) {
    var tune;
    var g;
    var i;
    var it;
    var nextRound;
    if (match.over) return;
    dt = Math.max(0, Math.min(dt, 0.05));
    match.t += dt;
    if (match.t >= DURATION) {
      match.t = DURATION;
      match.over = true;
    }
    nextRound = roundAt(match.t);
    if (nextRound !== match.round) {
      match.round = nextRound;
      match.banner = 'Round ' + nextRound;
      match.bannerLife = 1.15;
      match.spawnAcc = -0.28;
    }
    if (match.bannerLife > 0) match.bannerLife = Math.max(0, match.bannerLife - dt);
    if (match.stun > 0) match.stun = Math.max(0, match.stun - dt);
    if (match.combo > 0 && match.t - match.lastCatch > COMBO_WINDOW) match.combo = 0;

    if (!match.over) {
      tune = roundTuning(match.round);
      match.spawnAcc += dt;
      while (match.spawnAcc >= tune.spawn && flyingCount(match) < maxAir(match.round)) {
        match.spawnAcc -= tune.spawn;
        spawnOne(match);
      }
    }

    g = 1320;
    for (i = 0; i < match.items.length; i++) {
      it = match.items[i];
      if (!it.alive) continue;
      it.vy += g * dt;
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.rot += it.vr * dt;
      if (it.y > match.h + 100 || it.x < -140 || it.x > match.w + 140 || it.y < -160) {
        it.alive = false;
      }
    }
    match.items = match.items.filter(function (item) { return item.alive; });

    for (i = 0; i < match.popups.length; i++) {
      match.popups[i].life -= dt;
      match.popups[i].y -= 36 * dt;
    }
    match.popups = match.popups.filter(function (p) { return p.life > 0; });
  }

  function swipe(match, ax, ay, bx, by, dt) {
    var dist;
    var speed;
    var hits;
    var i;
    var it;
    var d;
    var slop;
    var resolved;
    if (!match || match.over || match.stun > 0) return [];
    dist = Math.hypot(bx - ax, by - ay);
    speed = dist / Math.max(dt || 0.016, 0.008);
    if (dist < 12) return [];
    if (speed < 460 && dist < 34) return [];
    hits = [];
    for (i = 0; i < match.items.length; i++) {
      it = match.items[i];
      if (!it.alive) continue;
      if (it.y > match.h * 0.9 && it.vy < 0) continue;
      d = distPointSeg(it.x, it.y, ax, ay, bx, by);
      slop = it.kind === 'money' ? 12 : 4;
      if (d <= it.radius + slop) {
        hits.push({ it: it, along: alongSeg(it.x, it.y, ax, ay, bx, by) });
      }
    }
    hits.sort(function (a, b) { return a.along - b.along; });
    resolved = [];
    for (i = 0; i < hits.length; i++) {
      hits[i].it.alive = false;
      resolved.push(resolveHit(match, hits[i].it));
    }
    if (resolved.length) {
      match.items = match.items.filter(function (item) { return item.alive; });
    }
    return resolved;
  }

  return {
    DURATION: DURATION,
    MONEY: MONEY,
    JUNK: JUNK,
    distPointSeg: distPointSeg,
    roundAt: roundAt,
    roundTuning: roundTuning,
    createMatch: createMatch,
    update: update,
    swipe: swipe
  };
});
