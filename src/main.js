import "./styles.css";

const PLATE_W = 372;
const PLATE_H = 179;

/* ═══════════════════════════════════════════════════════════════
   DCPG - Découpage AI Studio

   Flow: PRESS START -> tape loads -> desktop. That is the whole site.

   The desktop is a detection bench. The sliders on the right actually drive
   the feed on the left: sensitivity gates which targets clear threshold,
   precision governs box jitter, face accuracy gates the face lock, depth sets
   the analysis grid. Nothing on that panel is a prop.

   Motion budget: MOTION_INTENSITY 8. Everything that moves is a state
   transition, storytelling, or a live readout. Nothing loops for decoration.
   ═══════════════════════════════════════════════════════════════ */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TAPE_DURATION = 2600; // must stay in step with the CSS keyframes
const CRT_OFF_DURATION = 600;

const $ = (id) => document.getElementById(id);

/* ── Canvas noise ─────────────────────────────────────────────── */

/** Noise wants to be low-res. That is what makes it read as signal rather
 *  than as a grey gradient. */
function drawStatic(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const w = Math.max(2, Math.floor(rect.width / 3));
  const h = Math.max(2, Math.floor(rect.height / 3));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = Math.random() > 0.3 ? 140 : 20;
  }
  ctx.putImageData(img, 0, 0);

  // Dropout band. Tape damage, not decoration.
  if (Math.random() > 0.55) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.4})`;
    ctx.fillRect(0, Math.random() * h, w, Math.random() * 6 + 1);
  }
}

/* ── Vector horizon wallpaper ─────────────────────────────────────
   The 1985 picture of what a computer would show you once computers got
   good: a perspective grid running to a horizon, a vector sun, a wireframe
   solid turning in space. Hairline cyan, no bloom, no synthwave magenta.
   ─────────────────────────────────────────────────────────────── */

const gridCanvas = $("gridCanvas");
let gridTime = 0;

function drawHorizon() {
  const rect = gridCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(rect.width * dpr);
  const h = Math.floor(rect.height * dpr);
  if (gridCanvas.width !== w || gridCanvas.height !== h) {
    gridCanvas.width = w;
    gridCanvas.height = h;
  }

  const ctx = gridCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = rect.width;
  const H = rect.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#080b0d";
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.46;

  // Vector sun: concentric arcs, the way a plotter would have drawn it.
  ctx.strokeStyle = "rgba(70,227,232,0.16)";
  ctx.lineWidth = 1;
  for (let r = 26; r < 130; r += 16) {
    ctx.beginPath();
    ctx.arc(W / 2, horizonY, r, Math.PI, 0);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(70,227,232,0.30)";
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(W, horizonY);
  ctx.stroke();

  // Ground plane in perspective. Rows scroll toward the viewer.
  ctx.strokeStyle = "rgba(70,227,232,0.13)";
  const rows = 18;
  const offset = (gridTime * 0.006) % 1;
  for (let i = 0; i < rows; i++) {
    const t = (i + offset) / rows;
    const y = horizonY + Math.pow(t, 2.4) * (H - horizonY);
    if (y > H) continue;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * (W / 8), H);
    ctx.lineTo(W / 2 + i * 6, horizonY);
    ctx.stroke();
  }

  // Wireframe cube, slowly turning above the horizon.
  const a = gridTime * 0.004;
  const S = Math.min(W, H) * 0.07;
  const verts = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const cx = W / 2;
  const cy = horizonY - H * 0.16;

  const projected = verts.map(([x, y, z]) => {
    let x1 = x * Math.cos(a) - z * Math.sin(a);
    let z1 = x * Math.sin(a) + z * Math.cos(a);
    const y1 = y * Math.cos(a * 0.6) - z1 * Math.sin(a * 0.6);
    z1 = y * Math.sin(a * 0.6) + z1 * Math.cos(a * 0.6);
    const p = 3.2 / (3.2 + z1);
    return [cx + x1 * S * p, cy + y1 * S * p];
  });

  ctx.strokeStyle = "rgba(70,227,232,0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const [i, j] of edges) {
    ctx.moveTo(projected[i][0], projected[i][1]);
    ctx.lineTo(projected[j][0], projected[j][1]);
  }
  ctx.stroke();

  gridTime++;
}

/* ── The detection bench ──────────────────────────────────────────
   Targets are authored in percentages of the viewport so the overlay
   survives any window size. Each one drifts along its own slow path, which
   is what a tracker locked onto a moving object looks like.
   ─────────────────────────────────────────────────────────────── */

const sceneViewport = $("sceneViewport");
const sceneFrame = $("sceneFrame");
const sceneBoxes = $("sceneBoxes");
const sceneTrails = $("sceneTrails");
const sceneState = $("sceneState");
const sceneClock = $("sceneClock");
const statusLed = $("statusLed");

const trailCtx = sceneTrails.getContext("2d");

const DEFAULTS = { sensitivity: 64, precision: 72, face: 80, relight: 0 };

const CONTROLS = {
  sensitivity: $("ctrlSensitivity"),
  precision: $("ctrlPrecision"),
  face: $("ctrlFace"),
  relight: $("ctrlRelight"),
};

const scenePlate = $("scenePlate");
const relightHint = $("relightHint");

/* Standing targets: every one is genuinely in the plate, measured off it and
 * checked by rendering the boxes back over the image. Nothing sits on empty
 * road. person, car, traffic light, fire hydrant and bench are all real COCO
 * classes, so this is roughly what a detector would return for this frame.
 *
 * kind "subject" = a person, "object" = everything else. That is the exact
 * distinction the studio sells, so the demo makes the pitch without a caption.
 *
 * x/y/w/h are percentages of the plate, top-left origin. */
const STATIC_TARGETS = [
  { id: "CAR 1001",   kind: "object",  x:  2.4, y: 81.0, w: 9.0, h: 12.5 },
  { id: "PERSON 203", kind: "subject", x: 77.2, y: 53.5, w: 2.8, h: 10.5 },
  { id: "PERSON 204", kind: "subject", x: 79.8, y: 57.5, w: 3.0, h: 15.0 },
  { id: "PERSON 205", kind: "subject", x: 90.2, y: 60.0, w: 2.6, h: 12.5 },
  { id: "LIGHT 07",   kind: "object",  x: 18.0, y: 36.0, w: 3.0, h:  9.0 },
  { id: "LIGHT 08",   kind: "object",  x: 56.0, y: 32.0, w: 2.6, h:  8.5 },
  { id: "HYDRANT 12", kind: "object",  x: 20.4, y: 52.0, w: 3.0, h:  6.5 },
  { id: "BENCH 04",   kind: "object",  x: 62.8, y: 32.5, w: 4.6, h:  5.5 },
  { id: "POSTBOX 11", kind: "object",  x: 18.2, y: 84.0, w: 3.4, h:  9.5 },
  { id: "BOX 09",     kind: "object",  x: 95.0, y: 73.0, w: 4.2, h:  8.0 },
  { id: "SIGN 02",    kind: "object",  x:  9.2, y: 17.5, w: 7.6, h: 19.0 },
  { id: "TREE 05",    kind: "object",  x: 17.6, y:  4.5, w: 8.6, h: 12.0 },
];

const ENTITIES = STATIC_TARGETS.map((t) => ({ ...t }));
const trails = new Map();

let feedRunning = false;
let feedFrames = 0;
let ledResetTimer = null;

/* ── The camera ──────────────────────────────────────────────────
   The plate is a still frame, and a tracker locked onto something that never
   moves proves nothing. Rather than draw fake traffic into hand-drawn art whose
   perspective is not mathematically consistent (measured: the crosswalk bars
   disagree on a vanishing point by 12-30px, and the junction corners and the
   parked car disagree on the road axis by 20 degrees), the CAMERA moves.

   Every real object in the frame then moves relative to the lens, the tracker
   has to chase them, and Motion Tracking Precision has something to be precise
   about. It is also the honest demo: Camera is one of the four axes the studio
   sells.

   The move only advances while the controls are being worked, so the page is
   not an idle loop.
   ─────────────────────────────────────────────────────────────── */

const cam = { t: 0, zoom: 1, x: 0, y: 0 };

// Amplitudes chosen so the plate always covers the frame: zoom stays above
// 1 / (1 - 2 * maxPan), so no bare edge is ever exposed.
const PAN_X = 0.075;
const PAN_Y = 0.038;
const ZOOM_MID = 1.3;
const ZOOM_AMP = 0.09;

function advanceCamera(dt) {
  cam.t += dt;
  cam.zoom = ZOOM_MID + ZOOM_AMP * Math.sin(cam.t * 0.42);
  cam.x = PAN_X * Math.sin(cam.t * 0.27);
  cam.y = PAN_Y * Math.sin(cam.t * 0.19 + 1.2);
}

function paintCamera() {
  scenePlate.style.transform =
    `scale(${cam.zoom.toFixed(4)}) translate(${(-cam.x * 100).toFixed(3)}%, ${(-cam.y * 100).toFixed(3)}%)`;
}

/* ── Relight ─────────────────────────────────────────────────────
   Day to night on the same plate: a multiply grade over the art, plus the
   practicals that would actually be burning once the sun is down (the signals,
   the street lamp, the shop windows). The lighting lives inside the plate
   wrapper, so it rides the camera with the picture rather than sliding over it.

   Night is not free. A detector loses confidence in the dark, so every target
   pays a penalty, and holding the same set of boxes at midnight means pushing
   Object Detection Sensitivity up to compensate. Two controls that actually
   argue with each other.
   ─────────────────────────────────────────────────────────────── */

const NIGHT_CONFIDENCE_COST = 24; // points of confidence lost at full dark
const NIGHT_FACE_COST = 22;       // faces get harder to lock, faster

function nightAmount() {
  return readControls().relight / 100;
}

function applyRelight() {
  const n = nightAmount();
  sceneFrame.style.setProperty("--night", n.toFixed(3));
  relightHint.textContent = n < 0.2 ? "Day" : n < 0.45 ? "Dusk" : n < 0.8 ? "Evening" : "Night";
}

/** Where the thing appears right now, in frame percentages, once the camera has
 *  had its way with it. Same maths the CSS transform applies to the plate. */
function truthBox(e) {
  const z = cam.zoom;
  return {
    x: 50 + (e.x - 50 - cam.x * 100) * z,
    y: 50 + (e.y - 50 - cam.y * 100) * z,
    w: e.w * z,
    h: e.h * z,
  };
}

/** Re-rolled by Apply Controls. Confidence is what the sensitivity slider gates
 *  against, which is what stops that slider from being decoration. */
function rollConfidences() {
  for (const e of ENTITIES) {
    e.confidence = 34 + Math.random() * 65; // never a suspiciously round number
  }
}
rollConfidences();

function readControls() {
  return {
    sensitivity: Number(CONTROLS.sensitivity.value),
    precision: Number(CONTROLS.precision.value),
    face: Number(CONTROLS.face.value),
    relight: Number(CONTROLS.relight.value),
  };
}

/** The plate is 2.08:1. Letterbox it rather than crop it, and give the overlay
 *  the image's exact box so a target at 77% sits at 77% of the picture. */
function fitSceneFrame() {
  const vp = sceneViewport.getBoundingClientRect();
  if (!vp.width || !vp.height) return;

  const ratio = PLATE_W / PLATE_H;
  let w = vp.width;
  let h = w / ratio;
  if (h > vp.height) {
    h = vp.height;
    w = h * ratio;
  }
  sceneFrame.style.width = `${Math.round(w)}px`;
  sceneFrame.style.height = `${Math.round(h)}px`;
  sceneFrame.style.setProperty("--scan-travel", `${Math.round(h)}px`);
}

function buildBoxes(animateIn = false) {
  const { sensitivity, face } = readControls();
  const night = nightAmount();
  const threshold = 100 - sensitivity;

  // What the model actually believes, once the light is taken away from it.
  for (const e of ENTITIES) e.effective = e.confidence - night * NIGHT_CONFIDENCE_COST;

  const visible = ENTITIES.filter((e) => e.effective >= threshold);
  // Whichever target we are most sure of is the one the deck holds.
  const tracked = visible.reduce((best, e) => (!best || e.effective > best.effective ? e : best), null);

  sceneBoxes.innerHTML = "";

  visible.forEach((e, i) => {
    const box = document.createElement("div");
    box.className = "det-box" + (e === tracked ? " det-box--tracking" : "");
    // Staggering on every slider input would strobe, so only on a fresh pass.
    box.style.animationDelay = animateIn && !prefersReducedMotion ? `${i * 55}ms` : "0ms";
    if (!animateIn) box.style.animation = "none";

    const label = document.createElement("span");
    label.className = "det-label";
    label.innerHTML = `<b>${e.id}</b>[${e === tracked ? "TRACKING" : "DETECTED"}]`;
    box.appendChild(label);

    // A face lock only makes sense on a subject, and only when the model is
    // confident enough to claim one. In the dark it needs to be more confident.
    if (e.kind === "subject" && face >= 60 + night * NIGHT_FACE_COST) {
      const faceBox = document.createElement("span");
      faceBox.className = "det-face";
      box.appendChild(faceBox);
    }

    sceneBoxes.appendChild(box);
    e.el = box;

    // Snap the tracker onto the target rather than flying it in from 0,0.
    const t = truthBox(e);
    e.tx = t.x;
    e.ty = t.y;
    e.tw = t.w;
    e.th = t.h;
  });

  for (const e of ENTITIES) if (!visible.includes(e)) e.el = null;

  paintBoxes();
}

/* ── The tracker ─────────────────────────────────────────────────
   This is where Motion Tracking Precision earns its place on the panel. The
   box is NOT the object's true position. It is an estimate that chases the
   truth, and the slider sets how hard it chases:

     high precision -> the box stays welded to the object
     low precision  -> it lags behind the camera move, overshoots, and wobbles

   On a frozen frame that difference is invisible, which is why the camera had
   to start moving before this control could mean anything at all.
   ─────────────────────────────────────────────────────────────── */

function updateTracker(dt) {
  const { precision } = readControls();
  const p = precision / 100;

  // How much of the gap to the truth we close this frame.
  const follow = 1 - Math.pow(1 - (0.02 + p * 0.55), dt * 60);
  const wobble = (1 - p) * 1.6;

  for (const e of ENTITIES) {
    if (!e.el) continue;

    const t = truthBox(e);
    const jx = (Math.random() - 0.5) * wobble;
    const jy = (Math.random() - 0.5) * wobble * 0.6;

    e.tx += (t.x + jx - e.tx) * follow;
    e.ty += (t.y + jy - e.ty) * follow;
    e.tw += (t.w - e.tw) * follow;
    e.th += (t.h - e.th) * follow;

    // Trail the tracker's own estimate, not the truth. A sloppy tracker draws a
    // sloppy path, which is exactly the thing worth showing.
    let pts = trails.get(e.id);
    if (!pts) trails.set(e.id, (pts = []));
    if (feedFrames % 2 === 0) {
      pts.push({ x: e.tx + e.tw / 2, y: e.ty + e.th / 2 });
      if (pts.length > 40) pts.shift();
    }
  }

  paintBoxes();
}

function paintBoxes() {
  for (const e of ENTITIES) {
    if (!e.el) continue;
    e.el.style.left = `${e.tx}%`;
    e.el.style.top = `${e.ty}%`;
    e.el.style.width = `${e.tw}%`;
    e.el.style.height = `${e.th}%`;
  }
}

function paintTrails() {
  const w = sceneTrails.clientWidth;
  const h = sceneTrails.clientHeight;
  if (!w || !h) return;
  if (sceneTrails.width !== w || sceneTrails.height !== h) {
    sceneTrails.width = w;
    sceneTrails.height = h;
  }

  trailCtx.clearRect(0, 0, w, h);
  if (!feedRunning) return;

  for (const pts of trails.values()) {
    if (pts.length < 2) continue;
    for (let i = 1; i < pts.length; i++) {
      trailCtx.strokeStyle = `rgba(70,227,232,${((i / pts.length) * 0.5).toFixed(3)})`;
      trailCtx.lineWidth = 1;
      trailCtx.beginPath();
      trailCtx.moveTo((pts[i - 1].x / 100) * w, (pts[i - 1].y / 100) * h);
      trailCtx.lineTo((pts[i].x / 100) * w, (pts[i].y / 100) * h);
      trailCtx.stroke();
    }
  }
}

function setLed(state, text) {
  clearTimeout(ledResetTimer);
  statusLed.dataset.state = state;
  statusLed.textContent = text;
}

function paintHud() {
  const secs = Math.floor(feedFrames / 60);
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  sceneClock.textContent = `REC ${hh}:${mm}:${ss}`;
}

/* ── Engagement ──────────────────────────────────────────────────
   The camera only rolls while you are working the panel. Left alone the bench
   holds its frame: no idle animation loop, and the boxes settle onto their
   targets so the still reads cleanly. Touch a control and the shot moves.
   ─────────────────────────────────────────────────────────────── */

const COAST_MS = 900;   // the move eases on past the last input rather than snapping to a halt
const SETTLE_MS = 700;  // then the tracker is given time to land before we stop rendering

let driveUntil = 0;

function engage() {
  if (prefersReducedMotion) return;
  driveUntil = performance.now() + COAST_MS;
  startLayer("scene");
}

/** One frame of the bench. */
function stepScene(dt) {
  const now = performance.now();
  const rolling = now < driveUntil;

  if (rolling) {
    advanceCamera(dt);
    paintCamera();
  }

  if (feedRunning) {
    if (rolling) feedFrames++;
    updateTracker(dt);
    paintTrails();
    if (feedFrames % 15 === 0) paintHud();
  }

  sceneState.textContent = rolling ? "FEED LIVE" : feedRunning ? "FEED HELD" : "FEED IDLE";
  sceneFrame.classList.toggle("is-live", rolling && feedRunning);

  // Once the shot has stopped and the tracker has caught up, stop burning frames.
  if (now > driveUntil + SETTLE_MS) stopLayer("scene");
}

function startFeed() {
  feedRunning = true;
  btnFeed.textContent = "Stop AI Feed";
  setLed("live", "LIVE");
  sceneBoxes.hidden = false;
  buildBoxes(true); // targets resolve one after another, the way a detector does
  paintTrails();
}

function stopFeed() {
  feedRunning = false;
  btnFeed.textContent = "Start AI Feed";
  sceneState.textContent = "FEED IDLE";
  setLed("idle", "IDLE");
  sceneFrame.classList.remove("is-live");
  // The camera still answers the controls. What stops is the detection.
  sceneBoxes.hidden = true;
  trails.clear();
  paintTrails();
}

const btnFeed = $("btnFeed");
const btnApply = $("btnApply");
const btnReset = $("btnReset");

btnFeed.addEventListener("click", () => {
  feedRunning ? stopFeed() : startFeed();
  engage();
});

btnApply.addEventListener("click", () => {
  rollConfidences();
  buildBoxes(true); // a fresh detection pass, so the boxes re-resolve
  engage();
  setLed("applied", "APPLIED");
  ledResetTimer = setTimeout(() => setLed(feedRunning ? "live" : "idle", feedRunning ? "LIVE" : "IDLE"), 1300);
});

btnReset.addEventListener("click", () => {
  for (const [key, input] of Object.entries(CONTROLS)) input.value = DEFAULTS[key];
  rollConfidences();
  applyRelight();
  buildBoxes(true);
  engage();
});

// Sliders apply live. Making the user press Apply before a slider does anything
// would be a worse product than the one this page is claiming to sell.
CONTROLS.sensitivity.addEventListener("input", () => {
  buildBoxes(false);
  engage();
});
CONTROLS.face.addEventListener("input", () => {
  buildBoxes(false);
  engage();
});
// Relighting changes what the model can see, so the boxes are re-resolved
// against the new light, not just tinted.
CONTROLS.relight.addEventListener("input", () => {
  applyRelight();
  buildBoxes(false);
  engage();
});
// Precision has no build step: the tracker reads it fresh every frame. Dragging
// it rolls the camera and you watch the boxes come loose in real time, which is
// the entire reason the camera moves at all.
CONTROLS.precision.addEventListener("input", engage);

/* ── One render loop ──────────────────────────────────────────────
   Separate rAF loops per canvas repainted the screen several times a frame.
   One loop, and the noise runs at a third of the framerate because real tape
   noise is not 60fps anyway.
   ─────────────────────────────────────────────────────────────── */

const active = new Set();
let rafId = null;
let tick = 0;
let lastTs = 0;

const transNoise = $("transNoiseCanvas");
const vhsNoise = $("vhsNoiseCanvas");
const reelNoise = $("reelNoiseCanvas");

function loop(ts) {
  // Clamped, so a backgrounded tab does not teleport every car on return.
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 1 / 60;
  lastTs = ts;

  const noiseFrame = tick % 3 === 0;

  if (active.has("trans") && noiseFrame) drawStatic(transNoise);
  if (active.has("vhs") && noiseFrame) drawStatic(vhsNoise);
  if (active.has("reel") && noiseFrame) drawStatic(reelNoise);
  if (active.has("scene")) stepScene(dt);
  if (active.has("horizon")) drawHorizon();

  tick++;
  rafId = active.size ? requestAnimationFrame(loop) : null;
  if (rafId === null) lastTs = 0;
}

function startLayer(name) {
  active.add(name);
  if (rafId === null) {
    lastTs = 0;
    rafId = requestAnimationFrame(loop);
  }
}

function stopLayer(name) {
  active.delete(name);
  if (!active.size && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
    lastTs = 0;
  }
}

// Never render to a canvas nobody is looking at.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
    lastTs = 0;
  } else if (!document.hidden && active.size && rafId === null) {
    lastTs = 0;
    rafId = requestAnimationFrame(loop);
  }
});

/* ── Boot readout ─────────────────────────────────────────────── */

const bootReadout = $("bootReadout");

const BOOT_LINES = [
  "DÉCOUPAGE SYSTEM v2.6",
  "TAPE DETECTED .......... DCPG-01",
  "SUBJECT TRACK .......... LOCKED",
  "OBJECT TRACK ........... LOCKED",
  "CAMERA SOLVE ........... OK",
  "READY.",
];

let bootTimers = [];

function runBootReadout() {
  clearBootReadout();
  bootReadout.textContent = "";
  const perLine = TAPE_DURATION / (BOOT_LINES.length + 1);
  BOOT_LINES.forEach((line, i) => {
    bootTimers.push(
      setTimeout(() => {
        bootReadout.textContent += (i ? "\n" : "") + line;
      }, perLine * i + 260)
    );
  });
}

function clearBootReadout() {
  bootTimers.forEach(clearTimeout);
  bootTimers = [];
}

/* ── Stage transitions ────────────────────────────────────────── */

const startBtn = $("startBtn");
const homeContent = $("homeContent");
const vhsTransition = $("vhsTransition");
const companyContent = $("companyContent");
const vhsStage = $("vhsStage");
const colorBars = vhsTransition.querySelector(".color-bars-bg");
const tapeReels = [$("reel1"), $("reel2")];

function showPage(el) {
  document.querySelectorAll(".tv-page").forEach((p) => p.classList.remove("active"));
  el.classList.add("active");
}

function enterDesktop() {
  stopLayer("trans");
  clearBootReadout();

  vhsStage.hidden = true;
  vhsStage.classList.remove("loading");
  tapeReels.forEach((r) => r.classList.remove("spinning"));

  showPage(companyContent);

  startLayer("vhs");
  if (!prefersReducedMotion) startLayer("horizon");
  else drawHorizon(); // a single static frame, so the wallpaper is not just black

  // The bench needs a laid-out viewport before any percentage means anything.
  requestAnimationFrame(() => {
    fitSceneFrame();
    applyRelight();
    paintCamera();
    paintHud();
    startFeed(); // detection on, camera held. It moves when you touch a control.
    sceneState.textContent = "FEED HELD";
  });

  startClock();
}

let started = false;

startBtn.addEventListener("click", () => {
  if (started) return;
  started = true;
  startBtn.disabled = true;

  // Reduced motion: no CRT collapse, no flying cassette. Straight in.
  if (prefersReducedMotion) {
    enterDesktop();
    return;
  }

  homeContent.classList.add("tv-turn-off-crt");

  setTimeout(() => {
    homeContent.classList.remove("active", "tv-turn-off-crt");
    showPage(vhsTransition);

    startLayer("trans");
    colorBars.classList.add("grayscale-anim");
    runBootReadout();

    vhsStage.hidden = false;
    // Next frame, so the browser has the element laid out before the keyframes
    // start. Without this the tape occasionally pops in mid-flight.
    requestAnimationFrame(() => {
      vhsStage.classList.add("loading");
      tapeReels.forEach((r) => r.classList.add("spinning"));
    });

    setTimeout(enterDesktop, TAPE_DURATION);
  }, CRT_OFF_DURATION);
});

/* ── Window manager ───────────────────────────────────────────── */

const win95Window = $("win95Window");
const win95Title = $("win95Title");
const views = document.querySelectorAll(".view-section");
const taskbarTasks = $("taskbarTasks");
const startMenu = $("startMenu");
const taskbarStart = $("taskbarStart");

const DESKTOP_TITLE = "DCPG_SYSTEM.EXE";
let currentView = "viewDesktop";

function renderTaskbar(title) {
  taskbarTasks.innerHTML = "";
  const task = document.createElement("div");
  task.className = "taskbar-task";
  task.textContent = title;
  taskbarTasks.appendChild(task);
}

function applyView(targetId, title) {
  views.forEach((v) => v.classList.toggle("active", v.id === targetId));
  win95Title.textContent = title;
  win95Window.classList.toggle("maximized", targetId !== "viewDesktop");
  currentView = targetId;
  renderTaskbar(title);

  if (targetId === "viewReel") primeReel();

  // Nobody is watching the junction from inside ABOUT.TXT.
  if (targetId !== "viewDesktop") {
    stopLayer("scene");
  } else {
    // The window resizes between desktop and maximised, so the frame has to be
    // re-measured before any overlay percentage can be trusted.
    requestAnimationFrame(() => {
      fitSceneFrame();
      paintBoxes();
      paintTrails();
    });
  }
}

function switchView(targetId, title) {
  if (targetId === currentView) return;
  closeStartMenu();

  if (prefersReducedMotion) {
    applyView(targetId, title);
    return;
  }

  win95Window.classList.remove("element-turn-on");
  win95Window.classList.add("element-turn-off");

  setTimeout(() => {
    applyView(targetId, title);
    win95Window.classList.remove("element-turn-off");
    win95Window.classList.add("element-turn-on");
  }, 340); // matches crtElementOff
}

document.querySelectorAll(".desktop-icon, .desk-cta, .start-menu-list button").forEach((el) => {
  el.addEventListener("click", () => switchView(el.dataset.target, el.dataset.title));
});

document.querySelectorAll(".back-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchView("viewDesktop", DESKTOP_TITLE));
});

// The close button on a window you cannot really close should still do
// something honest: it goes back to the desktop.
document.querySelectorAll(".win95-btn-small").forEach((btn) => {
  btn.addEventListener("click", () => switchView("viewDesktop", DESKTOP_TITLE));
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!startMenu.hidden) closeStartMenu();
  else if (currentView !== "viewDesktop") switchView("viewDesktop", DESKTOP_TITLE);
});

/* ── Start menu ───────────────────────────────────────────────── */

function openStartMenu() {
  startMenu.hidden = false;
  taskbarStart.setAttribute("aria-expanded", "true");
}
function closeStartMenu() {
  startMenu.hidden = true;
  taskbarStart.setAttribute("aria-expanded", "false");
}

taskbarStart.addEventListener("click", (e) => {
  e.stopPropagation();
  startMenu.hidden ? openStartMenu() : closeStartMenu();
});

document.addEventListener("click", (e) => {
  if (!startMenu.hidden && !startMenu.contains(e.target)) closeStartMenu();
});

/* ── Taskbar clock ────────────────────────────────────────────── */

const taskbarClock = $("taskbarClock");
let clockTimer = null;

function startClock() {
  if (clockTimer !== null) return;
  const paint = () => {
    taskbarClock.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  paint();
  clockTimer = setInterval(paint, 30000);
}

/* ── The reel ─────────────────────────────────────────────────────
   public/reel.mp4 does not exist yet. Rather than hardcode a dead
   placeholder, the player probes for the file: drop the film in and this
   starts working with no code change. If it is missing, we show no-signal.
   ─────────────────────────────────────────────────────────────── */

const reelVideo = $("reelVideo");
const reelNoSignal = $("reelNoSignal");
let reelProbed = false;

function fallbackToNoSignal() {
  reelVideo.hidden = true;
  reelNoSignal.hidden = false;
  startLayer("reel");
}

function primeReel() {
  if (reelProbed) return;
  reelProbed = true;

  reelVideo.addEventListener("error", fallbackToNoSignal, { once: true, capture: true });
  reelVideo.addEventListener(
    "loadedmetadata",
    () => {
      reelVideo.hidden = false;
      reelNoSignal.hidden = true;
      stopLayer("reel");
    },
    { once: true }
  );

  reelVideo.load();

  // Safety net: some servers answer a missing file with an HTML body, which
  // the media element does not always report as an error.
  setTimeout(() => {
    if (reelVideo.readyState === 0) fallbackToNoSignal();
  }, 1600);
}

/* ── Init ─────────────────────────────────────────────────────── */

renderTaskbar(DESKTOP_TITLE);

window.addEventListener("resize", () => {
  if (currentView !== "viewDesktop") return;
  fitSceneFrame();
  paintBoxes();
});
