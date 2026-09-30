(function () {
  "use strict";

  var reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------------------
  // Scene: a low-resolution pixel-art night skyline over water, scaled up with
  // `image-rendering: pixelated`. Throttled to a low frame rate to stay calm and
  // cheap; browsers stop requestAnimationFrame in hidden tabs on their own.
  // ---------------------------------------------------------------------------
  var canvas = document.getElementById("scene");
  var g = canvas.getContext("2d");
  var FPS = 14;
  var W, H, horizon, stars, buildings, skyRows, lastFrame = 0;

  // Seeded PRNG (mulberry32) so the skyline is the same on every visit.
  function seeded(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildScene() {
    var vw = innerWidth, vh = innerHeight;
    var px = Math.max(3, Math.round(Math.min(vw, vh * 1.6) / 200));
    W = Math.ceil(vw / px);
    H = Math.ceil(vh / px);
    canvas.width = W;
    canvas.height = H;

    var r = seeded(7);
    horizon = Math.floor(H * 0.68);

    stars = [];
    var starCount = Math.floor((W * horizon) / 420);
    for (var i = 0; i < starCount; i++) {
      stars.push({ x: (r() * W) | 0, y: (r() * horizon * 0.85) | 0, phase: r() * 6.28, speed: 0.3 + r() * 0.8, warm: r() < 0.15 });
    }

    buildings = [];
    var x = -2;
    while (x < W) {
      var w = 4 + ((r() * 9) | 0);
      var h = Math.floor(H * (0.05 + r() * 0.12) + (r() < 0.12 ? H * 0.08 : 0));
      var b = { x: x, w: w, h: h, windows: [] };
      for (var wx = x + 1; wx < x + w - 1; wx += 2) {
        for (var wy = horizon - h + 2; wy < horizon - 1; wy += 3) {
          if (r() < 0.55) b.windows.push({ x: wx, y: wy, offset: r() * 1000, period: 40 + r() * 90, on: r() < 0.35, tone: r() });
        }
      }
      buildings.push(b);
      x += w + (r() < 0.3 ? 1 + ((r() * 2) | 0) : 0);
    }

    skyRows = [];
    for (var y = 0; y < horizon; y++) {
      var t = y / horizon;
      skyRows.push("rgb(" + ((8 + t * 26) | 0) + "," + ((13 + t * 28) | 0) + "," + ((36 + t * 44) | 0) + ")");
    }
  }

  // Each window flips on/off once per its own slow period.
  function windowLit(win, s) {
    if (reducedMotion) return win.on;
    return (Math.floor((s + win.offset) / win.period) % 2 === 0) === win.on;
  }

  function draw(ms) {
    var s = ms / 1000;
    var y, i, k, m;

    for (y = 0; y < horizon; y++) {
      g.fillStyle = skyRows[y];
      g.fillRect(0, y, W, 1);
    }

    for (i = 0; i < stars.length; i++) {
      var st = stars[i];
      var a = reducedMotion ? 0.6 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s * st.speed + st.phase));
      g.fillStyle = "rgba(" + (st.warm ? "255,240,210" : "200,215,255") + "," + a.toFixed(2) + ")";
      g.fillRect(st.x, st.y, 1, 1);
    }

    // Moon with a faint stepped halo.
    var mx = (W * 0.78) | 0, my = (horizon * 0.22) | 0;
    g.fillStyle = "#e8e3cf";
    g.fillRect(mx, my, 3, 3);
    g.fillRect(mx - 1, my + 1, 5, 1);
    g.fillRect(mx + 1, my - 1, 1, 5);
    g.fillStyle = "rgba(232,227,207,.05)";
    g.fillRect(mx - 3, my - 2, 9, 7);
    g.fillRect(mx - 2, my - 3, 7, 9);

    for (k = 0; k < buildings.length; k++) {
      var b = buildings[k];
      g.fillStyle = "#070b1c";
      g.fillRect(b.x, horizon - b.h, b.w, b.h);
      g.fillStyle = "#0d1530";
      g.fillRect(b.x, horizon - b.h, b.w, 1);
      for (m = 0; m < b.windows.length; m++) {
        var win = b.windows[m];
        if (!windowLit(win, s)) continue;
        g.fillStyle = win.tone > 0.7 ? "#ffdf9e" : "#f2b765";
        g.fillRect(win.x, win.y, 1, 1);
      }
    }

    g.fillStyle = "#060918";
    g.fillRect(0, horizon, W, 1);

    // Water.
    var waterH = H - horizon - 1;
    for (y = 0; y < waterH; y++) {
      var d = y / waterH;
      g.fillStyle = "rgb(" + ((6 + d * 4) | 0) + "," + ((10 + d * 6) | 0) + "," + ((26 + d * 10) | 0) + ")";
      g.fillRect(0, horizon + 1 + y, W, 1);
    }

    // Lit windows reflected in the water, wobbling gently.
    for (k = 0; k < buildings.length; k++) {
      var bb = buildings[k];
      for (m = 0; m < bb.windows.length; m++) {
        var ww = bb.windows[m];
        if (!windowLit(ww, s)) continue;
        var dy = horizon - ww.y;
        if (dy > waterH - 1) continue;
        for (var q = 0; q < 3; q++) {
          var ry = horizon + dy + q * 2;
          if (ry >= H) break;
          var shift = reducedMotion ? 0 : Math.round(Math.sin(s * 0.9 + ry * 0.7 + ww.x * 0.3) * 1.2);
          var alpha = (0.42 - (dy / waterH) * 0.3) * (q ? 0.6 : 1);
          g.fillStyle = "rgba(242,183,101," + Math.max(alpha, 0.04).toFixed(2) + ")";
          g.fillRect(ww.x + shift, ry, 1, 1);
        }
      }
    }

    // Drifting ripple lines.
    for (y = 2; y < waterH; y += 3) {
      var xo = reducedMotion ? 0 : Math.floor(s * 2 + y * 5) % W;
      g.fillStyle = "rgba(120,150,210,.07)";
      g.fillRect((xo * 3 + y * 11) % W, horizon + 1 + y, 5 + (y % 4), 1);
      g.fillRect((xo * 2 + y * 29) % W, horizon + 1 + y, 4, 1);
    }

    // Moon reflection.
    for (y = 0; y < waterH; y += 2) {
      var sway = reducedMotion ? 0 : Math.round(Math.sin(s * 0.7 + y) * 1.5);
      g.fillStyle = "rgba(232,227,207," + (0.2 - (y / waterH) * 0.15).toFixed(2) + ")";
      g.fillRect(mx + sway, horizon + 2 + y, 2, 1);
    }
  }

  function frame(ms) {
    requestAnimationFrame(frame);
    if (ms - lastFrame < 1000 / FPS) return;
    lastFrame = ms;
    draw(ms);
  }

  var resizeTimer;
  addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      buildScene();
      draw(performance.now());
    }, 120);
  });

  buildScene();
  draw(0);
  if (!reducedMotion) requestAnimationFrame(frame);

  // ---------------------------------------------------------------------------
  // Player: one button, a continuous looping playlist, no track choice.
  // ---------------------------------------------------------------------------
  var tracks = window.TRACKS || [];
  var ui = document.getElementById("ui");
  var button = document.getElementById("toggle");
  var trackEl = document.getElementById("track");
  var titleEl = document.getElementById("title");
  var composerEl = document.getElementById("composer");

  var audio = new Audio();
  audio.preload = "none";
  var useMp3 = audio.canPlayType("audio/mpeg") !== "";

  var index = 0;
  var wantPlay = false;   // the visitor's intent
  var switching = false;  // true while we change tracks, so the resulting pause event is ignored
  var failures = 0;       // consecutive load errors
  var fadeTimer;

  function setPlayingUI(playing) {
    ui.classList.toggle("playing", playing);
    button.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  function showText(title, composer, animate) {
    clearTimeout(fadeTimer);
    if (!animate || reducedMotion) {
      titleEl.textContent = title;
      composerEl.textContent = composer ? "— " + composer : "";
      trackEl.classList.remove("fade");
      return;
    }
    trackEl.classList.add("fade");
    fadeTimer = setTimeout(function () {
      showText(title, composer, false);
    }, 1200);
  }

  function load(i, animate) {
    index = i;
    var t = tracks[i];
    audio.src = useMp3 ? t.mp3 : t.ogg;
    showText(t.title, t.composer, animate);
  }

  function startPlayback() {
    audio.play().catch(function (err) {
      // Load failures surface through the "error" event; only a refused play
      // (e.g. autoplay policy) needs handling here.
      if (err && err.name === "NotAllowedError") {
        wantPlay = false;
        switching = false;
        setPlayingUI(false);
      }
    });
  }

  function next() {
    load((index + 1) % tracks.length, true);
    if (wantPlay) {
      switching = true;
      startPlayback();
    }
  }

  button.addEventListener("click", function () {
    if (!tracks.length) return;
    if (wantPlay) {
      wantPlay = false;
      audio.pause();
      setPlayingUI(false);
      return;
    }
    wantPlay = true;
    ui.classList.add("started");
    setPlayingUI(true);
    if (!audio.src) load(index, false);
    else if (audio.error) load(index, false); // retry after "unavailable"
    startPlayback();
  });

  audio.addEventListener("playing", function () {
    failures = 0;
    switching = false;
  });

  audio.addEventListener("ended", next);

  audio.addEventListener("error", function () {
    failures++;
    if (failures >= tracks.length) {
      failures = 0;
      wantPlay = false;
      switching = false;
      audio.pause();
      setPlayingUI(false);
      showText("Music is unavailable right now.", "", true);
      return;
    }
    next();
  });

  // Keep the button honest when playback is paused or resumed outside the page
  // (hardware media keys, OS controls, headphones unplugged).
  audio.addEventListener("pause", function () {
    if (switching || audio.ended || audio.error || !wantPlay) return;
    wantPlay = false;
    setPlayingUI(false);
  });
  audio.addEventListener("play", function () {
    if (wantPlay) return;
    wantPlay = true;
    ui.classList.add("started");
    setPlayingUI(true);
  });

  // Exposed only so automated checks can inspect player state.
  window.__player = { audio: audio, tracks: tracks, get index() { return index; } };
})();
