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
  var backdrop = document.createElement("canvas"); // static layers, drawn once per resize
  var bg = backdrop.getContext("2d");
  var FPS = 10;
  var FADE = 4; // seconds a window takes to switch on or off
  var W, H, horizon, waterH, moonX, moonY, stars, buildings, lastFrame = 0;

  // Scene time runs slower while paused, so pausing feels like the scene settling.
  var sim = 0, energy = 0.35, energyTarget = 0.35;

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
    canvas.width = backdrop.width = W;
    canvas.height = backdrop.height = H;

    var r = seeded(7);
    horizon = Math.floor(H * 0.68);
    waterH = H - horizon - 1;
    moonX = (W * 0.78) | 0;
    moonY = (horizon * 0.22) | 0;

    stars = [];
    var starCount = Math.floor((W * horizon) / 420);
    for (var i = 0; i < starCount; i++) {
      stars.push({ x: (r() * W) | 0, y: (r() * horizon * 0.85) | 0, phase: r() * 6.28, speed: 0.08 + r() * 0.25, warm: r() < 0.15 });
    }

    buildings = [];
    var x = -2;
    while (x < W) {
      var w = 4 + ((r() * 9) | 0);
      var h = Math.floor(H * (0.05 + r() * 0.12) + (r() < 0.12 ? H * 0.08 : 0));
      var b = { x: x, w: w, h: h, windows: [] };
      for (var wx = x + 1; wx < x + w - 1; wx += 2) {
        for (var wy = horizon - h + 2; wy < horizon - 1; wy += 3) {
          if (r() < 0.4) {
            b.windows.push({ x: wx, y: wy, offset: r() * 1000, period: 90 + r() * 240, on: r() < 0.35, color: r() > 0.7 ? "#ffdf9e" : "#f2b765" });
          }
        }
      }
      buildings.push(b);
      x += w + (r() < 0.3 ? 1 + ((r() * 2) | 0) : 0);
    }

    paintBackdrop();
  }

  function paintBackdrop() {
    var y, d;
    for (y = 0; y < horizon; y++) {
      d = y / horizon;
      bg.fillStyle = "rgb(" + ((8 + d * 26) | 0) + "," + ((13 + d * 28) | 0) + "," + ((36 + d * 44) | 0) + ")";
      bg.fillRect(0, y, W, 1);
    }

    // Moon with a faint stepped halo.
    bg.fillStyle = "#e8e3cf";
    bg.fillRect(moonX, moonY, 3, 3);
    bg.fillRect(moonX - 1, moonY + 1, 5, 1);
    bg.fillRect(moonX + 1, moonY - 1, 1, 5);
    bg.fillStyle = "rgba(232,227,207,.05)";
    bg.fillRect(moonX - 3, moonY - 2, 9, 7);
    bg.fillRect(moonX - 2, moonY - 3, 7, 9);

    for (var k = 0; k < buildings.length; k++) {
      var b = buildings[k];
      bg.fillStyle = "#070b1c";
      bg.fillRect(b.x, horizon - b.h, b.w, b.h);
      bg.fillStyle = "#0d1530";
      bg.fillRect(b.x, horizon - b.h, b.w, 1);
    }

    bg.fillStyle = "#060918";
    bg.fillRect(0, horizon, W, 1);

    for (y = 0; y < waterH; y++) {
      d = y / waterH;
      bg.fillStyle = "rgb(" + ((6 + d * 4) | 0) + "," + ((10 + d * 6) | 0) + "," + ((26 + d * 10) | 0) + ")";
      bg.fillRect(0, horizon + 1 + y, W, 1);
    }
  }

  // Each window flips on/off once per its own slow period, fading over FADE seconds.
  function windowLight(win, t) {
    if (reducedMotion) return win.on ? 1 : 0;
    var u = t + win.offset;
    var lit = (Math.floor(u / win.period) % 2 === 0) === win.on;
    var sinceFlip = u % win.period;
    if (sinceFlip >= FADE) return lit ? 1 : 0;
    var p = sinceFlip / FADE;
    return lit ? p : 1 - p;
  }

  function draw() {
    var t = sim;
    var y, i, k, m;

    g.globalAlpha = 1;
    g.drawImage(backdrop, 0, 0);

    for (i = 0; i < stars.length; i++) {
      var st = stars[i];
      var a = reducedMotion ? 0.7 : 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * st.speed + st.phase));
      g.globalAlpha = Math.round(a * 20) / 20;
      g.fillStyle = st.warm ? "#fff0d2" : "#c8d7ff";
      g.fillRect(st.x, st.y, 1, 1);
    }

    for (k = 0; k < buildings.length; k++) {
      var b = buildings[k];
      for (m = 0; m < b.windows.length; m++) {
        var win = b.windows[m];
        var light = windowLight(win, t);
        if (light <= 0) continue;
        g.fillStyle = win.color;

        g.globalAlpha = light;
        g.fillRect(win.x, win.y, 1, 1);

        // Reflection in the water, wobbling gently.
        var dy = horizon - win.y;
        if (dy > waterH - 1) continue;
        g.fillStyle = "#f2b765";
        for (var q = 0; q < 3; q++) {
          var ry = horizon + dy + q * 2;
          if (ry >= H) break;
          var shift = reducedMotion ? 0 : Math.round(Math.sin(t * 0.25 + ry * 0.35 + win.x * 0.3) * 0.8);
          g.globalAlpha = light * Math.max((0.42 - (dy / waterH) * 0.3) * (q ? 0.6 : 1), 0.04);
          g.fillRect(win.x + shift, ry, 1, 1);
        }
      }
    }

    // Drifting ripple lines.
    g.globalAlpha = 0.07;
    g.fillStyle = "#7896d2";
    for (y = 2; y < waterH; y += 3) {
      var xo = reducedMotion ? 0 : Math.floor(t * 0.6 + y * 5) % W;
      g.fillRect((xo * 3 + y * 11) % W, horizon + 1 + y, 5 + (y % 4), 1);
      g.fillRect((xo * 2 + y * 29) % W, horizon + 1 + y, 4, 1);
    }

    // Moon reflection.
    g.fillStyle = "#e8e3cf";
    for (y = 0; y < waterH; y += 2) {
      var sway = reducedMotion ? 0 : Math.round(Math.sin(t * 0.2 + y * 0.5));
      g.globalAlpha = 0.2 - (y / waterH) * 0.15;
      g.fillRect(moonX + sway, horizon + 2 + y, 2, 1);
    }
    g.globalAlpha = 1;
  }

  var rafId = 0;
  function frame(ms) {
    rafId = requestAnimationFrame(frame);
    if (ms - lastFrame < 1000 / FPS) return;
    var dt = lastFrame ? Math.min((ms - lastFrame) / 1000, 0.25) : 0;
    lastFrame = ms;
    energy += (energyTarget - energy) * 0.02;
    sim += dt * energy;
    draw();
  }

  function startLoop() {
    if (reducedMotion || rafId) return;
    lastFrame = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopLoop();
    else startLoop();
  });

  var resizeTimer;
  addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      buildScene();
      draw();
    }, 120);
  });

  sim = 30; // start mid-cycle so some windows are already lit
  buildScene();
  draw();
  startLoop();

  // ---------------------------------------------------------------------------
  // Player: one button, a continuous looping playlist, no track choice.
  // ---------------------------------------------------------------------------
  var tracks = window.TRACKS || [];
  var ui = document.getElementById("ui");
  var button = document.getElementById("toggle");
  var trackEl = document.getElementById("track");
  var titleEl = document.getElementById("title");
  var composerEl = document.getElementById("composer");
  var statusEl = document.getElementById("status");

  var audio = new Audio();
  audio.preload = "none";
  var useMp3 = audio.canPlayType("audio/mpeg") !== "";
  var media = "mediaSession" in navigator ? navigator.mediaSession : null;

  var index = 0;
  var wantPlay = false;   // the visitor's intent
  var switching = false;  // true while we change tracks, so the resulting pause event is ignored
  var failures = 0;       // consecutive load errors
  var fadeTimer;

  function setPlayingUI(playing) {
    ui.classList.toggle("playing", playing);
    button.setAttribute("aria-pressed", playing ? "true" : "false");
    energyTarget = playing ? 1 : 0.35;
    if (!playing) ui.classList.remove("loading");
    if (media) media.playbackState = playing ? "playing" : "paused";
  }

  function showText(title, composer, animate) {
    clearTimeout(fadeTimer);
    if (!animate || reducedMotion) {
      titleEl.textContent = title;
      composerEl.textContent = composer;
      trackEl.classList.remove("fade");
      return;
    }
    trackEl.classList.add("fade");
    fadeTimer = setTimeout(function () {
      showText(title, composer, false);
    }, 2200); // matches the CSS opacity transition
  }

  function load(i, animate) {
    index = i;
    var t = tracks[i];
    audio.src = useMp3 ? t.mp3 : t.ogg;
    showText(t.title, t.composer, animate);
    statusEl.textContent = "";
    if (media && window.MediaMetadata) {
      media.metadata = new MediaMetadata({ title: t.title, artist: t.composer });
    }
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

  function play() {
    if (!tracks.length || wantPlay) return;
    wantPlay = true;
    ui.classList.add("started");
    setPlayingUI(true);
    if (!audio.src || audio.error) load(index, false); // first play, or retry after "unavailable"
    startPlayback();
  }

  function pause() {
    if (!wantPlay) return;
    wantPlay = false;
    audio.pause();
    setPlayingUI(false);
  }

  function toggle() {
    if (wantPlay) pause();
    else play();
  }

  button.addEventListener("click", toggle);

  // Space toggles from anywhere; a focused button already handles it natively.
  document.addEventListener("keydown", function (e) {
    if (e.key !== " " || e.repeat || e.target.closest("button")) return;
    e.preventDefault();
    toggle();
  });

  if (media) {
    media.setActionHandler("play", play);
    media.setActionHandler("pause", pause);
  }

  audio.addEventListener("waiting", function () {
    if (wantPlay) ui.classList.add("loading");
  });

  audio.addEventListener("playing", function () {
    failures = 0;
    switching = false;
    ui.classList.remove("loading");
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
      statusEl.textContent = "Music is unavailable right now.";
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

  // The first piece doubles as a quiet invitation before anything plays.
  if (tracks.length) showText(tracks[0].title, tracks[0].composer, false);

  // Exposed only so automated checks can inspect player state.
  window.__player = { audio: audio, tracks: tracks, get index() { return index; } };
})();
