const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const menuOverlay = document.getElementById("menu-overlay");
const startBtn = document.getElementById("start-btn");
const nameInput = document.getElementById("name-input");
const modeSelect = document.getElementById("mode-select");
const statusText = document.getElementById("status-text");
const hudTop = document.getElementById("hud-top");
const hudBottom = document.getElementById("hud-bottom");

const state = {
  socket: null,
  connected: false,
  joined: false,
  playerId: null,
  cameraMode: "TPP",
  mode: "battle-royale",
  latestSnapshot: null,
  previousSnapshot: null,
  inputHeld: new Set(),
  mouse: { left: false, right: false },
  oneShot: {
    warp: "none",
    gravityShift: false,
    blackHolePulse: false,
    quickTurn: false,
    emergencyRefill: false,
  },
  lockTargetId: null,
  pointerLook: {
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
    yaw: 0,
    pitch: 0,
    decay: 0,
  },
  inputSendAccumulator: 0,
  localTime: 0,
  cameraShake: 0,
  flashes: [],
  messages: [],
  particles: [],
  killFeed: [],
  eventBanner: null,
  hitMarkerTimer: 0,
  lastDamageDir: null,
  fpsFrames: [],
  fpsDisplay: 0,
  fpsAccum: 0,
  prevHealth: 100,
  stars: createStars(700, { radiusMin: 3200, radiusMax: 11200, sizeMin: 0.45, sizeMax: 1.4, warmChance: 0.08 }),
  nearStars: createStars(320, { radiusMin: 1500, radiusMax: 5600, sizeMin: 0.7, sizeMax: 2.1, warmChance: 0.14 }),
  spaceBackdrop: null,
  asteroidProfiles: new Map(),
  shipModel: null,
};

const SHIP_MODEL_URL = "./assets/shadowfighter.obj";
const SHIP_MODEL_SCALE = 0.2;
const SHIP_ANCHORS = {
  nose: { x: 0, y: 4, z: 188 },
  tail: { x: 0, y: 6, z: -190 },
  label: { x: 0, y: 38, z: 18 },
  engineLeft: { x: -18, y: 2, z: -168 },
  engineRight: { x: 18, y: 2, z: -168 },
};

const SHIP_VARIANTS = [
  {
    name: "interceptor",
    wingSpan: 0.18,
    wingSweep: 0.2,
    tailStretch: 0.06,
    finScale: -0.06,
    bodyLift: 0.02,
    noseStretch: 0.04,
    hull: "#c7d3de",
    wing: "#adb8c9",
    tail: "#9eaec0",
    canopy: "#465f79",
    nose: "#2f3742",
    accent: "#ff7e66",
    trail: "#8fe2ff",
  },
  {
    name: "raptor",
    wingSpan: -0.1,
    wingSweep: -0.22,
    tailStretch: 0.15,
    finScale: 0.12,
    bodyLift: -0.02,
    noseStretch: 0.08,
    hull: "#d3d9e5",
    wing: "#bec8d6",
    tail: "#a8b7ca",
    canopy: "#4f6283",
    nose: "#303642",
    accent: "#79d5ff",
    trail: "#7fd7ff",
  },
  {
    name: "vanguard",
    wingSpan: 0.25,
    wingSweep: 0.08,
    tailStretch: -0.06,
    finScale: -0.08,
    bodyLift: 0.06,
    noseStretch: -0.04,
    hull: "#c9cfdb",
    wing: "#b5c0ce",
    tail: "#a6b1bf",
    canopy: "#546b88",
    nose: "#343c46",
    accent: "#ffd06b",
    trail: "#9de0ff",
  },
  {
    name: "nova",
    wingSpan: -0.16,
    wingSweep: 0.28,
    tailStretch: 0.1,
    finScale: 0.18,
    bodyLift: -0.03,
    noseStretch: 0.03,
    hull: "#d2dae5",
    wing: "#bec9d7",
    tail: "#afbdcb",
    canopy: "#4f6781",
    nose: "#2d3540",
    accent: "#b691ff",
    trail: "#7ecbff",
  },
  {
    name: "falcon",
    wingSpan: 0.08,
    wingSweep: -0.14,
    tailStretch: -0.02,
    finScale: 0.04,
    bodyLift: 0.01,
    noseStretch: 0.06,
    hull: "#cad4df",
    wing: "#b6c3d2",
    tail: "#aab6c6",
    canopy: "#4b6179",
    nose: "#323b46",
    accent: "#73ff9a",
    trail: "#8ad8ff",
  },
  {
    name: "comet",
    wingSpan: 0.05,
    wingSweep: 0.14,
    tailStretch: 0.06,
    finScale: 0.06,
    bodyLift: -0.01,
    noseStretch: -0.05,
    hull: "#cfd6df",
    wing: "#bcc8d4",
    tail: "#a9b8c5",
    canopy: "#4d667f",
    nose: "#323944",
    accent: "#ff8fd5",
    trail: "#9ddcff",
  },
];

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function formatNum(v, digits = 1) {
  return Number(v || 0).toFixed(digits);
}

function vec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function length(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v) {
  const len = length(v);
  if (len <= 1e-6) return { x: 0, y: 0, z: 0 };
  return scale(v, 1 / len);
}

function distance(a, b) {
  return length(sub(a, b));
}

function getForward(yaw, pitch) {
  return normalize({
    x: Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch),
  });
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function fract(v) {
  return v - Math.floor(v);
}

function seeded(seed) {
  return fract(Math.sin(seed * 127.13 + 311.71) * 43758.5453);
}

// --- PARTICLE SYSTEM ---
function spawnExplosion(position, color, count = 45) {
  const rgb = hexToRgb(color || "#ff9341");
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * Math.PI;
    const speed = randomRange(80, 380);
    state.particles.push({
      position: { ...position },
      velocity: { x: Math.cos(angle) * Math.cos(elevation) * speed, y: Math.sin(elevation) * speed, z: Math.sin(angle) * Math.cos(elevation) * speed },
      color: rgb, alpha: 1, size: randomRange(1.5, 5), life: randomRange(0.4, 1.4), maxLife: 1.4, type: "explosion",
    });
  }
  // Add a bright flash ring
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    state.particles.push({
      position: { ...position },
      velocity: { x: Math.cos(a) * 420, y: randomRange(-40, 40), z: Math.sin(a) * 420 },
      color: { r: 255, g: 255, b: 220 }, alpha: 1, size: randomRange(2, 4), life: 0.3, maxLife: 0.3, type: "flash",
    });
  }
}

function spawnHitSparks(position, count = 14) {
  for (let i = 0; i < count; i++) {
    const speed = randomRange(60, 240);
    const dir = normalize(vec3(randomRange(-1,1), randomRange(-1,1), randomRange(-1,1)));
    state.particles.push({
      position: { ...position },
      velocity: scale(dir, speed),
      color: { r: 255, g: 220, b: 120 }, alpha: 1, size: randomRange(1, 2.5), life: randomRange(0.12, 0.35), maxLife: 0.35, type: "spark",
    });
  }
}

function spawnWarpFlash(from, to) {
  for (let i = 0; i < 24; i++) {
    const t = i / 24;
    state.particles.push({
      position: { x: lerp(from.x, to.x, t) + randomRange(-18, 18), y: lerp(from.y, to.y, t) + randomRange(-18, 18), z: lerp(from.z, to.z, t) + randomRange(-18, 18) },
      velocity: vec3(randomRange(-30,30), randomRange(-30,30), randomRange(-30,30)),
      color: { r: 140, g: 220, b: 255 }, alpha: 1, size: randomRange(2, 5), life: randomRange(0.3, 0.7), maxLife: 0.7, type: "warp",
    });
  }
}

function spawnGravityPulseRing(position) {
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    state.particles.push({
      position: { ...position },
      velocity: { x: Math.cos(angle) * 200, y: randomRange(-25, 25), z: Math.sin(angle) * 200 },
      color: { r: 160, g: 80, b: 255 }, alpha: 0.85, size: randomRange(2, 4.5), life: 1.6, maxLife: 1.6, type: "pulse",
    });
  }
}

function formatEventName(type) {
  return type.split("-").map(v => v[0].toUpperCase() + v.slice(1)).join(" ").toUpperCase();
}

function processServerEvents(events) {
  if (!events || !Array.isArray(events)) return;
  for (const evt of events) {
    if (evt.type === "explosion") {
      spawnExplosion(evt.position, evt.color, 50);
      state.cameraShake = Math.max(state.cameraShake, 6);
    }
    if (evt.type === "hit") {
      spawnHitSparks(evt.position);
      if (evt.attackerId === state.playerId) {
        state.hitMarkerTimer = 0.35;
      }
      if (evt.targetId === state.playerId) {
        state.cameraShake = Math.max(state.cameraShake, evt.damage * 0.12);
        // Damage direction
        const snap = state.latestSnapshot;
        const me = snap ? snap.players.find(p => p.id === state.playerId) : null;
        if (me) {
          const dx = evt.position.x - me.position.x;
          const dz = evt.position.z - me.position.z;
          state.lastDamageDir = { angle: Math.atan2(dx, dz), ttl: 1.2 };
        }
      }
    }
    if (evt.type === "warp") {
      spawnWarpFlash(evt.from, evt.to);
    }
    if (evt.type === "ability" && evt.ability === "blackHolePulse") {
      spawnGravityPulseRing(evt.position);
    }
    if (evt.type === "kill") {
      state.killFeed.push({ killer: evt.killerName, victim: evt.victimName, ttl: 5 });
      if (state.killFeed.length > 6) state.killFeed.shift();
      if (evt.killerId === state.playerId) {
        state.cameraShake = Math.max(state.cameraShake, 10);
      }
    }
    if (evt.type === "eventStart") {
      state.eventBanner = { text: formatEventName(evt.eventType), ttl: 3.5 };
    }
    if (evt.type === "roundStart") {
      state.eventBanner = { text: `ROUND ${evt.round} — FIGHT`, ttl: 3 };
    }
    if (evt.type === "roundEnd") {
      state.eventBanner = { text: "ROUND OVER", ttl: 4 };
    }
  }
}

function hexToRgb(hex) {
  const clean = String(hex || "").trim().replace("#", "");
  if (clean.length !== 6) return { r: 170, g: 198, b: 220 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function blendRgb(a, b, t) {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

function shadeRgb(rgb, brightness) {
  return {
    r: Math.round(clamp(rgb.r * brightness, 0, 255)),
    g: Math.round(clamp(rgb.g * brightness, 0, 255)),
    b: Math.round(clamp(rgb.b * brightness, 0, 255)),
  };
}

function rgbToCss(rgb, alpha = 1) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getShipVariant(player) {
  const raw = Number.isFinite(player?.skin) ? Number(player.skin) : Math.abs(Number(player?.id || 0));
  const index = ((Math.floor(raw) % SHIP_VARIANTS.length) + SHIP_VARIANTS.length) % SHIP_VARIANTS.length;
  return SHIP_VARIANTS[index];
}

function parseObjModel(text) {
  const vertices = [];
  const triangles = [];
  let group = "default";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("g ")) {
      const next = line.slice(2).trim();
      group = next || "default";
      continue;
    }

    if (line.startsWith("v ")) {
      const parts = line
        .slice(2)
        .trim()
        .split(/\s+/)
        .map(Number);
      if (parts.length < 3 || !parts.every(Number.isFinite)) continue;
      vertices.push({ x: parts[0], y: parts[1], z: parts[2] });
      continue;
    }

    if (!line.startsWith("f ")) continue;
    const parts = line.slice(2).trim().split(/\s+/);
    if (parts.length < 3) continue;

    const indices = [];
    for (const part of parts) {
      const token = part.split("/")[0];
      if (!token) continue;
      const raw = parseInt(token, 10);
      if (!Number.isFinite(raw) || raw === 0) continue;
      const index = raw < 0 ? vertices.length + raw : raw - 1;
      if (index < 0 || index >= vertices.length) continue;
      indices.push(index);
    }
    if (indices.length < 3) continue;

    for (let i = 1; i < indices.length - 1; i += 1) {
      triangles.push({
        a: indices[0],
        b: indices[i],
        c: indices[i + 1],
        group,
      });
    }
  }

  return { vertices, triangles };
}

function getShipFaceBaseColor(group, player) {
  const dead = { r: 76, g: 86, b: 106 };
  if (!player.alive) return dead;

  const variant = getShipVariant(player);
  const team = hexToRgb(player.color || variant.accent);
  const hull = blendRgb(hexToRgb(variant.hull), team, 0.45);
  const wing = blendRgb(hexToRgb(variant.wing), team, 0.66);
  const tail = blendRgb(hexToRgb(variant.tail), team, 0.56);
  const accent = blendRgb(hexToRgb(variant.accent), team, 0.64);
  const canopy = blendRgb(hexToRgb(variant.canopy), team, 0.22);
  const materials = {
    hull,
    wing_left: wing,
    wing_right: wing,
    tail,
    canopy,
    nose: hexToRgb(variant.nose),
    engine: blendRgb({ r: 214, g: 226, b: 236 }, accent, 0.2),
    accent,
    default: blendRgb(hull, accent, 0.36),
  };
  return materials[group] || materials.default;
}

function createStars(count, options = {}) {
  const radiusMin = options.radiusMin || 1800;
  const radiusMax = options.radiusMax || 9000;
  const sizeMin = options.sizeMin || 0.6;
  const sizeMax = options.sizeMax || 2.2;
  const warmChance = options.warmChance ?? 0.12;
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    const radius = randomRange(radiusMin, radiusMax);
    const theta = randomRange(0, Math.PI * 2);
    const phi = randomRange(-Math.PI * 0.5, Math.PI * 0.5);
    const tint = Math.random();
    stars.push({
      x: Math.cos(theta) * Math.cos(phi) * radius,
      y: Math.sin(phi) * radius,
      z: Math.sin(theta) * Math.cos(phi) * radius,
      size: randomRange(sizeMin, sizeMax),
      color:
        tint < 1 - warmChance
          ? tint < 0.58
            ? "#e9f3ff"
            : "#a9d8ff"
          : "#ffd8a8",
      twinkle: randomRange(0.8, 2.2),
    });
  }
  return stars;
}

function createSpaceBackdrop(width, height) {
  const back = document.createElement("canvas");
  back.width = Math.max(1, width);
  back.height = Math.max(1, height);
  const bctx = back.getContext("2d");
  if (!bctx) return null;

  const base = bctx.createLinearGradient(0, 0, 0, back.height);
  base.addColorStop(0, "#030710");
  base.addColorStop(0.42, "#050d1d");
  base.addColorStop(1, "#02050a");
  bctx.fillStyle = base;
  bctx.fillRect(0, 0, back.width, back.height);

  bctx.save();
  bctx.translate(back.width * 0.5, back.height * 0.52);
  bctx.rotate(-0.33);
  const band = bctx.createLinearGradient(-back.width, 0, back.width, 0);
  band.addColorStop(0, "rgba(0,0,0,0)");
  band.addColorStop(0.25, "rgba(94, 132, 218, 0)");
  band.addColorStop(0.5, "rgba(165, 208, 255, 0)");
  band.addColorStop(0.68, "rgba(190, 136, 228, 0)");
  band.addColorStop(1, "rgba(0,0,0,0)");
  bctx.fillStyle = band;
  bctx.fillRect(-back.width, -back.height * 0.1, back.width * 2, back.height * 0.2);
  bctx.restore();

  for (let i = 0; i < 20; i += 1) {
    const cx = randomRange(0, back.width);
    const cy = randomRange(back.height * 0.08, back.height * 0.92);
    const radius = randomRange(back.width * 0.05, back.width * 0.2);
    const glow = bctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius);
    const tint = i % 4;
    if (tint === 0) glow.addColorStop(0, "rgba(92, 176, 255, 0.11)");
    if (tint === 1) glow.addColorStop(0, "rgba(152, 120, 255, 0.09)");
    if (tint === 2) glow.addColorStop(0, "rgba(255, 145, 120, 0.07)");
    if (tint === 3) glow.addColorStop(0, "rgba(124, 190, 255, 0.08)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    bctx.fillStyle = glow;
    bctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  bctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < 18; i += 1) {
    const lane = bctx.createLinearGradient(0, 0, back.width, back.height);
    lane.addColorStop(0, "rgba(8, 10, 14, 0)");
    lane.addColorStop(randomRange(0.2, 0.8), `rgba(4, 6, 10, ${randomRange(0.08, 0.2)})`);
    lane.addColorStop(1, "rgba(8, 10, 14, 0)");
    bctx.fillStyle = lane;
    bctx.save();
    bctx.translate(randomRange(-back.width * 0.2, back.width * 0.2), randomRange(-back.height * 0.1, back.height * 0.1));
    bctx.rotate(randomRange(-0.55, 0.35));
    bctx.fillRect(-back.width, randomRange(0, back.height), back.width * 3, randomRange(18, 56));
    bctx.restore();
  }
  bctx.globalCompositeOperation = "source-over";

  const starCounts = [1300, 740, 260];
  const starSizes = [0.7, 1.1, 1.8];
  const starAlpha = [0.32, 0.46, 0.68];
  for (let layer = 0; layer < starCounts.length; layer += 1) {
    for (let i = 0; i < starCounts[layer]; i += 1) {
      const x = randomRange(0, back.width);
      const y = randomRange(0, back.height);
      const r = starSizes[layer] * randomRange(0.6, 1.22);
      const c = Math.random();
      if (c < 0.72) bctx.fillStyle = `rgba(222, 238, 255, ${starAlpha[layer]})`;
      else if (c < 0.88) bctx.fillStyle = `rgba(154, 202, 255, ${starAlpha[layer]})`;
      else bctx.fillStyle = `rgba(255, 216, 178, ${starAlpha[layer]})`;
      bctx.beginPath();
      bctx.arc(x, y, r, 0, Math.PI * 2);
      bctx.fill();
    }
  }

  return back;
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    state.spaceBackdrop = createSpaceBackdrop(w, h);
  }
}

function setStatus(text, tone = "good") {
  statusText.textContent = text;
  statusText.className = `status ${tone === "warn" ? "warn" : "good"}`;
}

function addMessage(text, ttl = 2.6) {
  state.messages.push({ text, ttl });
  if (state.messages.length > 6) state.messages.shift();
}

async function loadShipModel() {
  try {
    const res = await fetch(SHIP_MODEL_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parsed = parseObjModel(text);
    if (!parsed.vertices.length || !parsed.triangles.length) {
      throw new Error("Model is empty");
    }
    state.shipModel = parsed;
    addMessage("Shadowfighter model loaded");
  } catch (err) {
    console.error("Failed to load ship model:", err);
    addMessage("Ship model load failed; using fallback mesh", 4);
  }
}

function showMenu(show) {
  menuOverlay.classList.toggle("visible", show);
}

function connectToServer() {
  if (state.socket) {
    try {
      state.socket.close();
    } catch {
      // noop
    }
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${window.location.host}/ws`);
  state.socket = ws;
  state.connected = false;
  state.joined = false;
  state.latestSnapshot = null;
  state.previousSnapshot = null;
  state.playerId = null;

  setStatus("Connecting to simulation server...");

  ws.addEventListener("open", () => {
    state.connected = true;
    state.mode = modeSelect.value;
    ws.send(
      JSON.stringify({
        type: "join",
        name: (nameInput.value || "Pilot").trim() || "Pilot",
        mode: state.mode,
      }),
    );
    setStatus("Connected. Joining lobby...");
  });

  ws.addEventListener("message", (evt) => {
    let parsed;
    try {
      parsed = JSON.parse(evt.data);
    } catch {
      return;
    }

    if (parsed.type === "joined") {
      state.joined = true;
      state.playerId = parsed.id;
      state.mode = parsed.mode;
      showMenu(false);
      addMessage(`Joined as Pilot #${parsed.id}`);
      setStatus("Live in arena.");
      return;
    }

    if (parsed.type === "snapshot") {
      state.previousSnapshot = state.latestSnapshot;
      state.latestSnapshot = parsed;
      if (!state.playerId && parsed.you) {
        state.playerId = parsed.you.id;
      }
      processServerEvents(parsed.events);
      return;
    }

    if (parsed.type === "error") {
      setStatus(parsed.message || "Server error", "warn");
      addMessage(parsed.message || "Server error", 3.6);
    }
  });

  ws.addEventListener("close", () => {
    state.connected = false;
    state.joined = false;
    setStatus("Disconnected. Relaunch to reconnect.", "warn");
    showMenu(true);
  });

  ws.addEventListener("error", () => {
    setStatus("Network error. Check server status.", "warn");
  });
}

function buildInputPayload() {
  const held = state.inputHeld;
  const thrust = (held.has("KeyW") ? 1 : 0) + (held.has("KeyS") ? -1 : 0);
  const strafe = (held.has("KeyD") ? 1 : 0) + (held.has("KeyA") ? -1 : 0);
  const lift = (held.has("KeyR") ? 1 : 0) + (held.has("KeyG") ? -1 : 0);
  const keyYaw = (held.has("ArrowRight") ? 1 : 0) + (held.has("ArrowLeft") ? -1 : 0);
  const keyPitch = (held.has("ArrowUp") ? 1 : 0) + (held.has("ArrowDown") ? -1 : 0);
  const yaw = clamp(keyYaw + state.pointerLook.yaw, -1, 1);
  const pitch = clamp(keyPitch + state.pointerLook.pitch, -1, 1);
  const roll = (held.has("KeyE") ? 1 : 0) + (held.has("KeyQ") ? -1 : 0);

  const payload = {
    thrust,
    strafe,
    lift,
    yaw,
    pitch,
    roll,
    boost: held.has("ShiftLeft") || held.has("ShiftRight"),
    firePlasma: state.mouse.left || held.has("KeyJ"),
    fireMissile: state.mouse.right || held.has("KeyK"),
    overchargeMissile: held.has("KeyO") || held.has("KeyL"),
    warp: state.oneShot.warp,
    gravityShift: state.oneShot.gravityShift,
    blackHolePulse: state.oneShot.blackHolePulse,
    quickTurn: state.oneShot.quickTurn,
    emergencyRefill: state.oneShot.emergencyRefill,
    lockTarget: state.lockTargetId,
  };

  state.oneShot.warp = "none";
  state.oneShot.gravityShift = false;
  state.oneShot.blackHolePulse = false;
  state.oneShot.quickTurn = false;
  state.oneShot.emergencyRefill = false;

  return payload;
}

function sendInput() {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN || !state.joined) return;
  state.socket.send(
    JSON.stringify({
      type: "input",
      input: buildInputPayload(),
    }),
  );
}

function findLocalPlayer(snapshot) {
  if (!snapshot || !state.playerId) return null;
  return snapshot.players.find((p) => p.id === state.playerId) || null;
}

function findPlayerById(snapshot, id) {
  if (!snapshot || !Number.isFinite(id)) return null;
  return snapshot.players.find((p) => p.id === id) || null;
}

function getCameraTarget(snapshot) {
  const me = findLocalPlayer(snapshot);
  if (me && me.alive) return me;
  if (!snapshot) return null;

  if (Number.isFinite(state.lockTargetId)) {
    const locked = findPlayerById(snapshot, state.lockTargetId);
    if (locked && locked.alive) return locked;
  }

  return snapshot.players.find((p) => p.alive) || me || null;
}

function retargetNearest() {
  const snapshot = state.latestSnapshot;
  const me = findLocalPlayer(snapshot);
  if (!snapshot || !me || !me.alive) return;

  let best = null;
  let bestDist = Infinity;

  for (const player of snapshot.players) {
    if (player.id === me.id || !player.alive) continue;
    if (snapshot.mode === "team-war" && player.team === me.team) continue;

    const dist = distance(me.position, player.position);
    if (dist < bestDist) {
      best = player;
      bestDist = dist;
    }
  }

  if (best) {
    state.lockTargetId = best.id;
    addMessage(`Lock-on set to ${best.name}`);
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      addMessage("Fullscreen denied by browser", 2);
    });
  } else {
    document.exitFullscreen().catch(() => {
      // noop
    });
  }
}

function applyLookDelta(dx, dy, sensitivity = 0.013, decay = 0.2) {
  state.pointerLook.yaw = clamp(state.pointerLook.yaw + dx * sensitivity, -1, 1);
  state.pointerLook.pitch = clamp(state.pointerLook.pitch - dy * sensitivity, -1, 1);
  state.pointerLook.decay = Math.max(state.pointerLook.decay, decay);
}

function setupInput() {
  canvas.tabIndex = 0;
  canvas.style.touchAction = "none";

  window.addEventListener("keydown", (evt) => {
    if (evt.repeat) return;
    const code = evt.code;

    if (code === "KeyF") {
      evt.preventDefault();
      toggleFullscreen();
      return;
    }

    if (code === "Space") {
      evt.preventDefault();
      state.oneShot.quickTurn = true;
    }

    if (code === "KeyZ") {
      state.oneShot.warp = "blind";
    }

    if (code === "KeyX") {
      state.oneShot.warp = "stable";
    }

    if (code === "KeyC") {
      state.oneShot.gravityShift = true;
    }

    if (code === "KeyH") {
      state.oneShot.blackHolePulse = true;
    }

    if (code === "KeyV") {
      state.cameraMode = state.cameraMode === "TPP" ? "FPP" : "TPP";
      addMessage(`Camera: ${state.cameraMode}`);
      if (state.cameraMode === "FPP") {
        addMessage("FPP active: drag or two-finger pan on trackpad to look");
      }
    }

    if (code === "KeyB") {
      state.oneShot.emergencyRefill = true;
    }

    if (code === "KeyT") {
      retargetNearest();
    }

    state.inputHeld.add(code);
  });

  window.addEventListener("keyup", (evt) => {
    state.inputHeld.delete(evt.code);
  });

  canvas.addEventListener("pointerdown", (evt) => {
    if (evt.button === 0) state.mouse.left = true;
    if (evt.button === 2) state.mouse.right = true;
    state.pointerLook.active = true;
    state.pointerLook.pointerId = evt.pointerId;
    state.pointerLook.x = evt.clientX;
    state.pointerLook.y = evt.clientY;
    canvas.focus();
    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(evt.pointerId);
      } catch {
        // noop
      }
    }
  });

  canvas.addEventListener("pointermove", (evt) => {
    if (!state.pointerLook.active) return;
    if (state.pointerLook.pointerId !== null && evt.pointerId !== state.pointerLook.pointerId) return;
    const dx = evt.clientX - state.pointerLook.x;
    const dy = evt.clientY - state.pointerLook.y;
    state.pointerLook.x = evt.clientX;
    state.pointerLook.y = evt.clientY;
    applyLookDelta(dx, dy, 0.013, 0.2);
  });

  const releasePointer = (evt) => {
    if (evt.button === 0) state.mouse.left = false;
    if (evt.button === 2) state.mouse.right = false;
    if (state.pointerLook.pointerId !== null && evt.pointerId !== state.pointerLook.pointerId) return;
    state.pointerLook.active = false;
    state.pointerLook.pointerId = null;
  };

  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("lostpointercapture", () => {
    state.pointerLook.active = false;
    state.pointerLook.pointerId = null;
  });

  // Two-finger trackpad scroll/pan also steers view.
  canvas.addEventListener(
    "wheel",
    (evt) => {
      evt.preventDefault();
      const scale = evt.deltaMode === 1 ? 2.6 : 0.12;
      applyLookDelta(evt.deltaX * scale, evt.deltaY * scale, 0.0135, 0.25);
      canvas.focus();
    },
    { passive: false },
  );

  canvas.addEventListener("contextmenu", (evt) => evt.preventDefault());
}

function getCamera(snapshot, t) {
  const focus = getCameraTarget(snapshot);
  if (focus && focus.alive) {
    const forward = getForward(focus.yaw, focus.pitch);
    if (state.cameraMode === "FPP") {
      const cockpit = transformShipLocalPoint(focus, { x: 0, y: 15, z: 56 });
      const nose = transformShipLocalPoint(focus, { x: 0, y: 12, z: 124 });
      const lookDir = normalize(sub(nose, cockpit));
      if (state.cameraShake > 0.1) {
        cockpit.x += (Math.random() - 0.5) * state.cameraShake * 2;
        cockpit.y += (Math.random() - 0.5) * state.cameraShake * 2;
      }
      return {
        pos: cockpit,
        yaw: Math.atan2(lookDir.x, lookDir.z),
        pitch: Math.atan2(lookDir.y, Math.max(0.001, Math.hypot(lookDir.x, lookDir.z))),
        fov: canvas.height * 0.96,
      };
    }

    const chaseOffset = scale(forward, -360);
    const base = add(focus.position, chaseOffset);
    const pos = add(base, { x: 0, y: 140, z: 0 });
    if (state.cameraShake > 0.1) {
      pos.x += (Math.random() - 0.5) * state.cameraShake * 2;
      pos.y += (Math.random() - 0.5) * state.cameraShake * 2;
    }
    return {
      pos,
      yaw: focus.yaw,
      pitch: focus.pitch * 0.72,
      fov: canvas.height * 0.95,
    };
  }

  const orbitR = 2800;
  const angle = t * 0.11;
  const pos = {
    x: Math.cos(angle) * orbitR,
    y: 620 + Math.sin(t * 0.17) * 160,
    z: Math.sin(angle) * orbitR,
  };
  return {
    pos,
    yaw: Math.atan2(-pos.x, -pos.z),
    pitch: -0.2,
    fov: canvas.height * 0.88,
  };
}

function worldToCamera(point, camera) {
  const rel = sub(point, camera.pos);
  const cosY = Math.cos(camera.yaw);
  const sinY = Math.sin(camera.yaw);

  const x1 = rel.x * cosY - rel.z * sinY;
  const z1 = rel.x * sinY + rel.z * cosY;

  const cosP = Math.cos(camera.pitch);
  const sinP = Math.sin(camera.pitch);

  const y2 = rel.y * cosP - z1 * sinP;
  const z2 = rel.y * sinP + z1 * cosP;

  return { x: x1, y: y2, z: z2 };
}

function project(point, camera) {
  const cam = worldToCamera(point, camera);
  if (cam.z <= 4) return null;
  const scaleFactor = camera.fov / cam.z;
  return {
    x: canvas.width * 0.5 + cam.x * scaleFactor,
    y: canvas.height * 0.5 - cam.y * scaleFactor,
    depth: cam.z,
    scale: scaleFactor,
  };
}

function projectedRadius(center, radius, camera) {
  const c = project(center, camera);
  const edge = project({ x: center.x + radius, y: center.y, z: center.z }, camera);
  if (!c || !edge) return null;
  return {
    x: c.x,
    y: c.y,
    depth: c.depth,
    radius: Math.max(1, Math.abs(edge.x - c.x)),
  };
}

function drawBackground(camera, time) {
  if (!state.spaceBackdrop || state.spaceBackdrop.width !== canvas.width || state.spaceBackdrop.height !== canvas.height) {
    state.spaceBackdrop = createSpaceBackdrop(canvas.width, canvas.height);
  }

  if (state.spaceBackdrop) {
    const driftX = Math.sin(camera.yaw * 0.7 + time * 0.03) * 9;
    const driftY = Math.sin(camera.pitch * 0.9 - time * 0.025) * 7;
    ctx.drawImage(
      state.spaceBackdrop,
      -driftX,
      -driftY,
      canvas.width + Math.abs(driftX) * 2,
      canvas.height + Math.abs(driftY) * 2,
    );
  } else {
    const fallback = ctx.createLinearGradient(0, 0, 0, canvas.height);
    fallback.addColorStop(0, "#041022");
    fallback.addColorStop(1, "#02060f");
    ctx.fillStyle = fallback;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  for (const star of state.stars) {
    const twinkle = 0.75 + Math.sin(time * star.twinkle + star.x * 0.0007) * 0.25;
    const p = project(star, camera);
    if (!p) continue;
    if (p.x < -10 || p.x > canvas.width + 10 || p.y < -10 || p.y > canvas.height + 10) continue;
    const size = Math.max(0.35, star.size * Math.min(1.6, p.scale * 90) * 0.22);
    ctx.fillStyle = star.color;
    ctx.globalAlpha = 0.36 * twinkle;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const star of state.nearStars) {
    const twinkle = 0.64 + Math.sin(time * star.twinkle * 1.3 + star.z * 0.0004) * 0.36;
    const p = project(star, camera);
    if (!p) continue;
    if (p.x < -12 || p.x > canvas.width + 12 || p.y < -12 || p.y > canvas.height + 12) continue;
    const size = Math.max(0.5, star.size * Math.min(2.1, p.scale * 140) * 0.24);
    ctx.fillStyle = star.color;
    ctx.globalAlpha = 0.3 * twinkle;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawBlackHole(snapshot, camera, time) {
  const r = projectedRadius({ x: 0, y: 0, z: 0 }, snapshot.blackHoleRadius, camera);
  if (!r) return;

  const pulse = 1 + Math.sin(time * 3.4) * 0.08;
  const glow = ctx.createRadialGradient(r.x, r.y, r.radius * 0.2, r.x, r.y, r.radius * 2.8);
  glow.addColorStop(0, "rgba(0, 0, 0, 0.9)");
  glow.addColorStop(0.2, "rgba(5, 6, 20, 0.9)");
  glow.addColorStop(0.48, "rgba(0, 190, 255, 0.18)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(r.x, r.y, r.radius * 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0, 230, 255, 0.6)";
  ctx.lineWidth = Math.max(1.5, r.radius * 0.08);
  ctx.globalAlpha = 0.58;
  ctx.beginPath();
  ctx.arc(r.x, r.y, r.radius * pulse, time * 1.1, time * 1.1 + Math.PI * 1.65);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(0, 0, 0, 0.94)";
  ctx.beginPath();
  ctx.arc(r.x, r.y, r.radius * 0.93, 0, Math.PI * 2);
  ctx.fill();
}

function drawSphereObject(position, radius, camera, fill, stroke = null, alpha = 1) {
  const pr = projectedRadius(position, radius, camera);
  if (!pr) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
  ctx.fill();

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, pr.radius * 0.12);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function getAsteroidProfile(asteroidId) {
  if (state.asteroidProfiles.has(asteroidId)) {
    return state.asteroidProfiles.get(asteroidId);
  }

  const pointCount = 12 + Math.floor(seeded(asteroidId * 2.17) * 6);
  const radii = [];
  for (let i = 0; i < pointCount; i += 1) {
    const jag = 0.62 + seeded(asteroidId * 17.3 + i * 13.7) * 0.52;
    radii.push(jag);
  }

  const craterCount = 2 + Math.floor(seeded(asteroidId * 4.9) * 4);
  const craters = [];
  for (let i = 0; i < craterCount; i += 1) {
    craters.push({
      angle: seeded(asteroidId * 9.1 + i * 1.47) * Math.PI * 2,
      dist: 0.2 + seeded(asteroidId * 12.7 + i * 2.03) * 0.52,
      radius: 0.08 + seeded(asteroidId * 16.2 + i * 2.81) * 0.14,
    });
  }

  const profile = {
    spin: (seeded(asteroidId * 5.63) - 0.5) * 0.9,
    tone: seeded(asteroidId * 7.31),
    roughness: 0.74 + seeded(asteroidId * 8.13) * 0.24,
    radii,
    craters,
  };
  state.asteroidProfiles.set(asteroidId, profile);
  return profile;
}

function drawAsteroidRock(asteroid, camera, time) {
  const pr = projectedRadius(asteroid.position, asteroid.radius, camera);
  if (!pr) return;
  if (pr.radius > 96) return;

  const profile = getAsteroidProfile(asteroid.id);
  const points = [];
  const spin = time * profile.spin + asteroid.id * 0.31;
  const count = profile.radii.length;
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + spin;
    const variance = profile.radii[i] * profile.roughness;
    const r = pr.radius * variance;
    points.push({ x: pr.x + Math.cos(a) * r, y: pr.y + Math.sin(a) * r });
  }

  const dark = blendRgb({ r: 68, g: 76, b: 90 }, { r: 82, g: 95, b: 112 }, profile.tone);
  const light = blendRgb({ r: 125, g: 138, b: 156 }, { r: 170, g: 160, b: 145 }, profile.tone * 0.4);
  const g = ctx.createRadialGradient(
    pr.x - pr.radius * 0.34,
    pr.y - pr.radius * 0.28,
    pr.radius * 0.06,
    pr.x,
    pr.y,
    pr.radius * 1.16,
  );
  g.addColorStop(0, rgbToCss(light, 0.9));
  g.addColorStop(0.68, rgbToCss(dark, 0.95));
  g.addColorStop(1, "rgba(38, 43, 52, 0.98)");

  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  for (const crater of profile.craters) {
    const cx = pr.x + Math.cos(crater.angle + spin * 0.3) * pr.radius * crater.dist;
    const cy = pr.y + Math.sin(crater.angle + spin * 0.3) * pr.radius * crater.dist;
    const rr = pr.radius * crater.radius;
    const cg = ctx.createRadialGradient(cx - rr * 0.24, cy - rr * 0.2, rr * 0.1, cx, cy, rr);
    cg.addColorStop(0, "rgba(145, 156, 171, 0.24)");
    cg.addColorStop(0.5, "rgba(72, 80, 92, 0.38)");
    cg.addColorStop(1, "rgba(33, 37, 46, 0.46)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(218, 231, 255, 0.24)";
  ctx.lineWidth = Math.max(0.8, pr.radius * 0.07);
  ctx.stroke();
}

function rotatePoint(pt, yaw, pitch, roll) {
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  let x = pt.x * cr - pt.y * sr;
  let y = pt.x * sr + pt.y * cr;
  let z = pt.z;

  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = y * cp - z * sp;
  const z2 = y * sp + z * cp;
  y = y2;
  z = z2;

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x2 = x * cy + z * sy;
  const z3 = -x * sy + z * cy;
  x = x2;
  z = z3;

  return { x, y, z };
}

function morphShipPoint(localPoint, variant) {
  const p = { ...localPoint };
  const wingWeight = clamp(Math.abs(p.x) / 120, 0, 1);
  const centerWeight = 1 - wingWeight;
  const tailWeight = clamp((-p.z - 28) / 210, 0, 1);
  const noseWeight = clamp((p.z - 48) / 180, 0, 1);

  p.x *= 1 + variant.wingSpan * wingWeight;
  const sweepSign = Math.abs(p.x) > 1 ? Math.sign(p.x) : 0;
  p.z += sweepSign * variant.wingSweep * wingWeight * 14;
  p.z *= 1 + variant.tailStretch * tailWeight + variant.noseStretch * noseWeight;
  p.y *= 1 + variant.finScale * clamp((p.y - 6) / 54, 0, 1);
  p.y += variant.bodyLift * centerWeight * 9;
  return p;
}

function transformShipLocalPoint(player, localPoint) {
  const variant = getShipVariant(player);
  const morphed = morphShipPoint(localPoint, variant);
  const scaled = scale(morphed, SHIP_MODEL_SCALE);
  const rotated = rotatePoint(scaled, player.yaw, player.pitch, player.roll);
  return add(player.position, rotated);
}

function drawFallbackShip(player, camera, isLocal) {
  const variant = getShipVariant(player);
  const fallback = [
    { x: 0, y: 0, z: 120 },
    { x: -94, y: 4, z: -46 },
    { x: 94, y: 4, z: -46 },
    { x: 0, y: 16, z: -88 },
  ].map((p) => transformShipLocalPoint(player, p));

  const projected = fallback.map((p) => project(p, camera));
  if (projected.some((p) => !p)) return;

  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  ctx.lineTo(projected[1].x, projected[1].y);
  ctx.lineTo(projected[3].x, projected[3].y);
  ctx.lineTo(projected[2].x, projected[2].y);
  ctx.closePath();
  ctx.fillStyle = player.alive ? variant.accent : "#4d5b72";
  ctx.globalAlpha = player.alive ? 0.78 : 0.45;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(195, 235, 255, 0.78)";
  ctx.lineWidth = isLocal ? 2 : 1.2;
  ctx.stroke();
}

function drawShip(player, camera, isLocal) {
  if (!state.shipModel) {
    drawFallbackShip(player, camera, isLocal);
    return;
  }

  const variant = getShipVariant(player);
  const model = state.shipModel;
  const worldVertices = model.vertices.map((v) => transformShipLocalPoint(player, v));
  const projectedVertices = worldVertices.map((v) => project(v, camera));

  const lightA = normalize({ x: 0.48, y: 0.74, z: 0.44 });
  const lightB = normalize({ x: -0.62, y: 0.25, z: -0.55 });
  const drawFaces = [];

  for (const tri of model.triangles) {
    const va = worldVertices[tri.a];
    const vb = worldVertices[tri.b];
    const vc = worldVertices[tri.c];
    const pa = projectedVertices[tri.a];
    const pb = projectedVertices[tri.b];
    const pc = projectedVertices[tri.c];
    if (!pa || !pb || !pc) continue;

    const normal = normalize(cross(sub(vb, va), sub(vc, va)));
    const center = scale(add(add(va, vb), vc), 1 / 3);
    const toCamera = normalize(sub(camera.pos, center));
    const facing = dot(normal, toCamera);
    if (facing <= 0.02) continue;

    const diffuse =
      Math.max(0, dot(normal, lightA)) * 0.72 +
      Math.max(0, dot(normal, lightB)) * 0.26;
    const brightness = clamp(0.23 + diffuse, 0.18, 1.2);

    const edgeAB = Math.hypot(pa.x - pb.x, pa.y - pb.y);
    const edgeBC = Math.hypot(pb.x - pc.x, pb.y - pc.y);
    const edgeCA = Math.hypot(pc.x - pa.x, pc.y - pa.y);
    const maxEdge = Math.max(edgeAB, edgeBC, edgeCA);
    const depthSpan = Math.max(pa.depth, pb.depth, pc.depth) - Math.min(pa.depth, pb.depth, pc.depth);
    if (maxEdge > Math.max(canvas.width, canvas.height) * 0.82 || depthSpan > 960) continue;

    let base = getShipFaceBaseColor(tri.group, player);
    if (player.marked && player.alive && tri.group !== "canopy") {
      base = blendRgb(base, { r: 255, g: 90, b: 118 }, 0.24);
    }
    const fill = shadeRgb(base, brightness);
    const stroke = shadeRgb(base, Math.min(1.25, brightness + 0.24));

    drawFaces.push({
      depth: (pa.depth + pb.depth + pc.depth) / 3,
      points: [pa, pb, pc],
      fillStyle: rgbToCss(fill, player.alive ? 0.9 : 0.55),
      strokeStyle: rgbToCss(stroke, isLocal ? 0.9 : 0.68),
    });
  }

  drawFaces.sort((a, b) => b.depth - a.depth);
  for (const face of drawFaces) {
    ctx.beginPath();
    ctx.moveTo(face.points[0].x, face.points[0].y);
    ctx.lineTo(face.points[1].x, face.points[1].y);
    ctx.lineTo(face.points[2].x, face.points[2].y);
    ctx.closePath();
    ctx.fillStyle = face.fillStyle;
    ctx.fill();
    ctx.strokeStyle = face.strokeStyle;
    ctx.lineWidth = isLocal ? 1.45 : 0.95;
    ctx.stroke();
  }

  const nosePoint = transformShipLocalPoint(player, SHIP_ANCHORS.nose);
  const tailPoint = transformShipLocalPoint(player, SHIP_ANCHORS.tail);
  const engineLeft = transformShipLocalPoint(player, SHIP_ANCHORS.engineLeft);
  const engineRight = transformShipLocalPoint(player, SHIP_ANCHORS.engineRight);
  const forward = normalize(sub(nosePoint, tailPoint));
  const trailTint = blendRgb(hexToRgb(variant.trail), hexToRgb(player.color || variant.accent), 0.28);
  const trailHot = shadeRgb(trailTint, 1.18);
  const renderTrail = (enginePoint) => {
    const trailEnd = add(enginePoint, scale(forward, -180));
    const trailA = project(enginePoint, camera);
    const trailB = project(trailEnd, camera);
    if (!trailA || !trailB) return;
    const grad = ctx.createLinearGradient(trailA.x, trailA.y, trailB.x, trailB.y);
    grad.addColorStop(0, rgbToCss(trailHot, 0.98));
    grad.addColorStop(0.42, rgbToCss(trailTint, 0.58));
    grad.addColorStop(1, rgbToCss(trailTint, 0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = isLocal ? 4.2 : 2.6;
    ctx.beginPath();
    ctx.moveTo(trailA.x, trailA.y);
    ctx.lineTo(trailB.x, trailB.y);
    ctx.stroke();
  };

  renderTrail(engineLeft);
  renderTrail(engineRight);

  const labelAnchor = project(transformShipLocalPoint(player, SHIP_ANCHORS.label), camera);
  if (labelAnchor) {
    ctx.font = `${Math.max(12, canvas.width * 0.012)}px Orbitron, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = player.marked ? "#ff6b88" : variant.accent;
    ctx.globalAlpha = player.alive ? 0.92 : 0.55;
    ctx.fillText(`${player.name}${player.bot ? " [BOT]" : ""}`, labelAnchor.x, labelAnchor.y);
    ctx.globalAlpha = 1;
  }
}

function drawWorld(snapshot, camera, t) {
  drawBackground(camera, t);

  for (const asteroid of snapshot.asteroids) {
    drawAsteroidRock(asteroid, camera, t);
  }

  for (const rain of snapshot.rainAsteroids) {
    drawSphereObject(rain.position, rain.radius, camera, "rgba(255, 160, 90, 0.58)", null, 1);
  }

  const projectileColor = {
    plasma: "rgba(82, 234, 255, 0.95)",
    missile: "rgba(255, 171, 82, 0.98)",
  };

  for (const projectile of snapshot.projectiles) {
    const vel = projectile.velocity || { x: 0, y: 0, z: 1 };
    const dir = normalize(vel);
    const trailLen = projectile.type === "missile" ? 28 : 20;
    const tail = {
      x: projectile.position.x - dir.x * trailLen,
      y: projectile.position.y - dir.y * trailLen,
      z: projectile.position.z - dir.z * trailLen,
    };
    const headP = project(projectile.position, camera);
    const tailP = project(tail, camera);
    if (!headP || !tailP) continue;

    const grad = ctx.createLinearGradient(headP.x, headP.y, tailP.x, tailP.y);
    grad.addColorStop(0, projectileColor[projectile.type] || "rgba(255,255,255,0.95)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = projectile.type === "missile" ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(headP.x, headP.y);
    ctx.lineTo(tailP.x, tailP.y);
    ctx.stroke();

    ctx.fillStyle = projectileColor[projectile.type] || "white";
    ctx.beginPath();
    ctx.arc(headP.x, headP.y, projectile.type === "missile" ? 2.5 : 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  const playersSorted = [...snapshot.players].sort((a, b) => {
    const aDepth = worldToCamera(a.position, camera).z;
    const bDepth = worldToCamera(b.position, camera).z;
    return bDepth - aDepth;
  });

  for (const player of playersSorted) {
    if (state.cameraMode === "FPP" && player.id === state.playerId) continue;
    drawShip(player, camera, player.id === state.playerId);
  }

  // Gravity pulse rings for active players
  for (const player of snapshot.players) {
    if (player.blackHolePulseActive) {
      const pr = projectedRadius(player.position, 340, camera);
      if (pr) {
        const pulse = 0.5 + Math.sin(t * 4) * 0.5;
        ctx.strokeStyle = `rgba(160, 80, 255, ${0.2 + pulse * 0.15})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius * (0.3 + pulse * 0.7), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius * (0.5 + pulse * 0.3), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(160, 80, 255, ${0.1 + pulse * 0.08})`;
        ctx.stroke();
      }
    }
    if (player.gravityShiftActive) {
      const pr = projectedRadius(player.position, 260, camera);
      if (pr) {
        ctx.strokeStyle = "rgba(80, 255, 180, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // Render crystals with glow
  for (const crystal of snapshot.crystals) {
    const pr = projectedRadius(crystal.position, crystal.radius, camera);
    if (!pr) continue;
    const pulse = 0.7 + Math.sin(t * 3 + crystal.id) * 0.3;
    const glow = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, pr.radius * 3);
    glow.addColorStop(0, `rgba(0, 255, 200, ${0.8 * pulse})`);
    glow.addColorStop(0.4, `rgba(0, 200, 255, ${0.3 * pulse})`);
    glow.addColorStop(1, "rgba(0, 200, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.radius * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(180, 255, 240, ${0.9 * pulse})`;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Render nebula zones
  for (const nz of snapshot.nebulaZones) {
    const pr = projectedRadius(nz.position, nz.radius, camera);
    if (!pr) continue;
    const ng = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, pr.radius);
    ng.addColorStop(0, "rgba(90, 40, 180, 0.12)");
    ng.addColorStop(0.6, "rgba(60, 100, 200, 0.08)");
    ng.addColorStop(1, "rgba(40, 60, 140, 0)");
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Render distortion zones
  for (const dz of snapshot.distortionZones) {
    const pr = projectedRadius(dz.position, dz.radius, camera);
    if (!pr) continue;
    const dg = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, pr.radius);
    dg.addColorStop(0, "rgba(255, 140, 40, 0.1)");
    dg.addColorStop(0.7, "rgba(255, 80, 20, 0.06)");
    dg.addColorStop(1, "rgba(255, 60, 10, 0)");
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw particles
  drawParticles(camera);

  drawCockpitOverlay(snapshot, t);
  drawReticleAndTarget(snapshot, camera);
  drawMinimap(snapshot);
}

function drawParticles(camera) {
  for (const p of state.particles) {
    const proj = project(p.position, camera);
    if (!proj) continue;
    const size = Math.max(0.5, p.size * Math.min(2.5, proj.scale * 60) * 0.22);
    ctx.globalAlpha = p.alpha * 0.92;
    ctx.fillStyle = rgbToCss(p.color);
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
    ctx.fill();
    if ((p.type === "explosion" || p.type === "flash") && p.alpha > 0.25) {
      ctx.globalAlpha = p.alpha * 0.25;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, size * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.type === "warp" && p.alpha > 0.3) {
      ctx.globalAlpha = p.alpha * 0.18;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, size * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawHitMarker() {
  if (state.hitMarkerTimer <= 0) return;
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const alpha = Math.min(1, state.hitMarkerTimer * 3);
  const size = 12 + (1 - alpha) * 6;
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - size, cy - size); ctx.lineTo(cx - size * 0.35, cy - size * 0.35);
  ctx.moveTo(cx + size, cy - size); ctx.lineTo(cx + size * 0.35, cy - size * 0.35);
  ctx.moveTo(cx - size, cy + size); ctx.lineTo(cx - size * 0.35, cy + size * 0.35);
  ctx.moveTo(cx + size, cy + size); ctx.lineTo(cx + size * 0.35, cy + size * 0.35);
  ctx.stroke();
}

function drawLowHealthWarning(snapshot) {
  const me = findLocalPlayer(snapshot);
  if (!me || !me.alive || me.health >= 30) return;
  const intensity = 1 - (me.health / 30);
  const pulse = 0.5 + Math.sin(state.localTime * 6) * 0.5;
  const alpha = intensity * 0.3 * pulse;
  const grad = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.5, canvas.height * 0.15, canvas.width * 0.5, canvas.height * 0.5, canvas.height * 0.7);
  grad.addColorStop(0, "rgba(255, 0, 0, 0)");
  grad.addColorStop(1, `rgba(255, 0, 0, ${alpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawDamageDirection(snapshot) {
  if (!state.lastDamageDir || state.lastDamageDir.ttl <= 0) return;
  const me = findLocalPlayer(snapshot);
  if (!me) return;
  const alpha = Math.min(1, state.lastDamageDir.ttl * 1.5);
  const relAngle = state.lastDamageDir.angle - me.yaw;
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const dist = Math.min(canvas.width, canvas.height) * 0.38;
  const px = cx + Math.sin(relAngle) * dist;
  const py = cy - Math.cos(relAngle) * dist;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(relAngle);
  ctx.fillStyle = `rgba(255, 50, 50, ${alpha * 0.7})`;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(-8, 6);
  ctx.lineTo(8, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawKillFeed() {
  if (!state.killFeed.length) return;
  const x = canvas.width - 24;
  let y = canvas.height * 0.28;
  ctx.textAlign = "right";
  ctx.font = `${Math.max(11, canvas.width * 0.0095)}px Orbitron, sans-serif`;
  for (const entry of state.killFeed) {
    const alpha = Math.min(1, entry.ttl * 0.5);
    ctx.fillStyle = `rgba(255, 100, 80, ${alpha * 0.95})`;
    ctx.fillText(`${entry.killer}`, x - ctx.measureText(` eliminated ${entry.victim}`).width, y);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
    ctx.fillText(` eliminated `, x - ctx.measureText(entry.victim).width, y);
    ctx.fillStyle = `rgba(150, 220, 255, ${alpha * 0.9})`;
    ctx.fillText(entry.victim, x, y);
    y += 20;
  }
  ctx.textAlign = "left";
}

function drawEventBanner() {
  if (!state.eventBanner || state.eventBanner.ttl <= 0) return;
  const alpha = Math.min(1, state.eventBanner.ttl);
  const scl = 1 + (1 - alpha) * 0.15;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = `${Math.max(24, canvas.width * 0.03) * scl}px Orbitron, sans-serif`;
  ctx.shadowColor = "rgba(255, 180, 60, 0.6)";
  ctx.shadowBlur = 25;
  ctx.fillStyle = `rgba(255, 230, 140, ${alpha})`;
  ctx.fillText(state.eventBanner.text, canvas.width * 0.5, canvas.height * 0.22);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawRoundOverlay(snapshot) {
  if (!snapshot || snapshot.roundPhase === "active") return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  const cx = canvas.width * 0.5;
  if (snapshot.roundPhase === "waiting") {
    ctx.font = `${canvas.width * 0.025}px Orbitron, sans-serif`;
    ctx.fillStyle = "rgba(200, 230, 255, 0.9)";
    ctx.fillText("WAITING FOR FIGHTERS", cx, canvas.height * 0.4);
    ctx.font = `${canvas.width * 0.013}px Rajdhani, sans-serif`;
    ctx.fillStyle = "rgba(200, 230, 255, 0.55)";
    ctx.fillText("Minimum 2 players required", cx, canvas.height * 0.46);
  }
  if (snapshot.roundPhase === "ended") {
    const winner = snapshot.leaderboard[0];
    ctx.save();
    ctx.font = `${canvas.width * 0.032}px Orbitron, sans-serif`;
    ctx.fillStyle = "#ffd06b";
    ctx.shadowColor = "rgba(255, 200, 60, 0.5)";
    ctx.shadowBlur = 30;
    ctx.fillText("ROUND OVER", cx, canvas.height * 0.3);
    ctx.shadowBlur = 0;
    ctx.restore();
    if (winner) {
      ctx.font = `${canvas.width * 0.02}px Orbitron, sans-serif`;
      ctx.fillStyle = "#9cff57";
      ctx.fillText(`Winner: ${winner.name}  (${winner.kills} kills)`, cx, canvas.height * 0.38);
    }
    const podium = snapshot.leaderboard.slice(0, 3);
    const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
    ctx.font = `${canvas.width * 0.013}px Rajdhani, sans-serif`;
    ctx.fillStyle = "rgba(200, 230, 255, 0.8)";
    podium.forEach((p, i) => {
      ctx.fillText(`${medals[i]} ${p.name} — ${p.kills} Kills`, cx, canvas.height * 0.45 + i * canvas.height * 0.04);
    });
    ctx.fillStyle = "rgba(200, 230, 255, 0.45)";
    ctx.fillText("Next round starting soon...", cx, canvas.height * 0.6);
  }
  ctx.textAlign = "left";
}

function drawFpsCounter() {
  ctx.fillStyle = "rgba(150, 200, 255, 0.5)";
  ctx.font = `${Math.max(10, canvas.width * 0.008)}px Rajdhani, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(`${state.fpsDisplay} FPS`, canvas.width - 12, canvas.height - 10);
  ctx.textAlign = "left";
}

function drawCockpitOverlay(snapshot, time) {
  if (state.cameraMode !== "FPP") return;
  const me = findLocalPlayer(snapshot);
  if (!me || !me.alive) return;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const bob = Math.sin(time * 3.4 + me.velocity.z * 0.01) * 4;

  ctx.save();

  const vignette = ctx.createRadialGradient(cx, cy, h * 0.14, cx, cy, h * 0.86);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, "rgba(2,8,18,0.18)");
  vignette.addColorStop(1, "rgba(1,5,12,0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(140, 216, 255, 0.25)";
  ctx.lineWidth = Math.max(1.6, w * 0.0018);
  ctx.beginPath();
  ctx.moveTo(w * 0.17, h * 0.06 + bob);
  ctx.lineTo(w * 0.36, h * 0.52 + bob);
  ctx.lineTo(w * 0.41, h * 0.98);
  ctx.moveTo(w * 0.83, h * 0.06 + bob);
  ctx.lineTo(w * 0.64, h * 0.52 + bob);
  ctx.lineTo(w * 0.59, h * 0.98);
  ctx.stroke();

  ctx.fillStyle = "rgba(8, 20, 34, 0.68)";
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.84);
  ctx.lineTo(w * 0.33, h * 0.73);
  ctx.lineTo(w * 0.67, h * 0.73);
  ctx.lineTo(w * 0.82, h * 0.84);
  ctx.lineTo(w * 0.78, h);
  ctx.lineTo(w * 0.22, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(80, 190, 255, 0.18)";
  ctx.beginPath();
  ctx.moveTo(w * 0.46, h * 0.74 + bob * 0.35);
  ctx.lineTo(cx, h * 0.64 + bob * 0.2);
  ctx.lineTo(w * 0.54, h * 0.74 + bob * 0.35);
  ctx.lineTo(w * 0.525, h * 0.92);
  ctx.lineTo(w * 0.475, h * 0.92);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(98, 206, 255, 0.34)";
  ctx.lineWidth = Math.max(1, w * 0.0012);
  ctx.beginPath();
  ctx.moveTo(w * 0.29, h * 0.79);
  ctx.lineTo(w * 0.71, h * 0.79);
  ctx.stroke();

  ctx.fillStyle = "rgba(151, 227, 255, 0.54)";
  ctx.font = `${Math.max(11, w * 0.0088)}px Orbitron, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("COCKPIT VIEW", cx, h * 0.765);

  ctx.restore();
}

function drawReticleAndTarget(snapshot, camera) {
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;

  ctx.strokeStyle = "rgba(0, 233, 255, 0.85)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx - 5, cy);
  ctx.moveTo(cx + 5, cy);
  ctx.lineTo(cx + 16, cy);
  ctx.moveTo(cx, cy - 16);
  ctx.lineTo(cx, cy - 5);
  ctx.moveTo(cx, cy + 5);
  ctx.lineTo(cx, cy + 16);
  ctx.stroke();

  const source = getCameraTarget(snapshot);
  if (!source || !Number.isFinite(state.lockTargetId)) return;

  const target = findPlayerById(snapshot, state.lockTargetId);
  if (!target || !target.alive) return;

  const targetProjected = project(target.position, camera);
  if (!targetProjected) return;

  const boxSize = clamp(90 / Math.max(targetProjected.depth * 0.02, 1), 18, 42);
  ctx.strokeStyle = "rgba(255, 133, 77, 0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(targetProjected.x - boxSize * 0.5, targetProjected.y - boxSize * 0.5, boxSize, boxSize);

  const dist = distance(source.position, target.position);
  ctx.fillStyle = "rgba(255, 180, 140, 0.95)";
  ctx.font = `${Math.max(12, canvas.width * 0.01)}px Orbitron, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${target.name} ${Math.round(dist)}m`, targetProjected.x, targetProjected.y - boxSize * 0.7);
}

function drawMinimap(snapshot) {
  const radius = Math.min(canvas.width, canvas.height) * 0.095;
  const x = canvas.width - radius - 22;
  const y = radius + 22;

  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = "rgba(0, 18, 36, 0.62)";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(99, 205, 255, 0.75)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (snapshot.radarDisabled) {
    ctx.fillStyle = "#ff5f7d";
    ctx.font = `${Math.max(11, canvas.width * 0.009)}px Orbitron, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("RADAR OFFLINE", x, y + 4);
    ctx.restore();
    return;
  }

  const me = findLocalPlayer(snapshot);
  if (!me) {
    ctx.restore();
    return;
  }

  const mapRange = snapshot.arenaRadius;
  const toMini = (p) => {
    return {
      x: x + (p.position.x / mapRange) * radius,
      y: y + (p.position.z / mapRange) * radius,
    };
  };

  for (const player of snapshot.players) {
    if (!player.alive) continue;
    const p = toMini(player);
    const isMe = player.id === me.id;
    ctx.fillStyle = isMe ? "#9cff57" : player.marked ? "#ff5f7d" : "#80d9ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, isMe ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function updateHud(snapshot) {
  const me = findLocalPlayer(snapshot);
  const spectating = me && !me.alive;
  const pulseCooldown = me ? me.cooldowns?.blackHolePulse ?? 0 : 0;
  const pulseState = !me
    ? "--"
    : me.blackHolePulseActive
      ? "ACTIVE"
      : pulseCooldown > 0
        ? `${formatNum(pulseCooldown, 1)}s`
        : "READY";

  const eventLabel =
    snapshot.event.type === "none"
      ? "None"
      : snapshot.event.type
          .split("-")
          .map((v) => v[0].toUpperCase() + v.slice(1))
          .join(" ");

  hudTop.innerHTML = `
    <div class="hud-panel hud-kv">
      <span>Mode</span><span>${snapshot.mode}</span>
      <span>Round</span><span>${snapshot.round} (${snapshot.roundPhase})</span>
      <span>Event</span><span class="${snapshot.event.type === "none" ? "" : "warn"}">${eventLabel} ${snapshot.event.remaining > 0 ? `(${formatNum(snapshot.event.remaining, 1)}s)` : ""}</span>
      <span>Arena Radius</span><span>${snapshot.arenaRadius}</span>
      <span>Ruleset</span><span>Free Play</span>
      <span>Costs</span><span>Disabled</span>
    </div>

    <div class="hud-panel hud-kv">
      <span>Health</span><span class="${me && me.health < 35 ? "warn" : "good"}">${me ? formatNum(me.health, 1) : "--"}</span>
      <span>Energy</span><span>${me ? formatNum(me.energy, 1) : "--"}</span>
      <span>Status</span><span>${me ? (me.alive ? "Combat Ready" : "Down") : "--"}</span>
      <span>K / D</span><span>${me ? `${me.kills} / ${me.deaths}` : "--"}</span>
      <span>Camera</span><span>${state.cameraMode}</span>
      <span>Lock</span><span>${state.lockTargetId ? `#${state.lockTargetId}` : "None"}</span>
      <span>Gravity Pulse (H)</span><span>${pulseState}</span>
      <span>Radar</span><span class="${snapshot.radarDisabled ? "warn" : "good"}">${snapshot.radarDisabled ? "Offline" : "Online"}</span>
    </div>
  `;

  const leaderboard = snapshot.leaderboard
    .map((row, idx) => `${idx + 1}. ${row.name}${row.alive ? "" : " (down)"} - ${row.kills} K`)
    .join("<br />");

  const feed = state.messages
    .map((m) => `<div>${m.text}</div>`)
    .slice(-4)
    .join("");

  hudBottom.innerHTML = `
    <div class="hud-panel">
      <strong>Leaderboard</strong><br />
      ${leaderboard || "No fighters"}
    </div>

    <div class="hud-panel">
      <strong>Tactical Feed</strong><br />
      ${spectating ? "<div class=\"warn\">You are down. Spectating live fighter view.</div>" : ""}
      ${feed || "Awaiting contact..."}
    </div>
  `;
}

function step(dt) {
  state.localTime += dt;
  state.cameraShake = Math.max(0, state.cameraShake - dt * 2.2);

  if (!state.pointerLook.active) {
    const relax = state.pointerLook.decay > 0 ? 0.9 : 0.8;
    state.pointerLook.yaw *= relax;
    state.pointerLook.pitch *= relax;
    state.pointerLook.decay = Math.max(0, state.pointerLook.decay - dt);
    if (Math.abs(state.pointerLook.yaw) < 0.01) state.pointerLook.yaw = 0;
    if (Math.abs(state.pointerLook.pitch) < 0.01) state.pointerLook.pitch = 0;
  }

  for (const msg of state.messages) {
    msg.ttl -= dt;
  }
  state.messages = state.messages.filter((m) => m.ttl > 0);

  state.inputSendAccumulator += dt;
  while (state.inputSendAccumulator >= 1 / 30) {
    sendInput();
    state.inputSendAccumulator -= 1 / 30;
  }
}

function drawFrame() {
  const snapshot = state.latestSnapshot;
  const t = state.localTime;

  if (!snapshot) {
    drawBackground(
      {
        pos: { x: 0, y: 300, z: -2000 },
        yaw: 0,
        pitch: -0.12,
        fov: canvas.height * 0.85,
      },
      t,
    );

    ctx.fillStyle = "rgba(230, 246, 255, 0.92)";
    ctx.font = `${Math.max(16, canvas.width * 0.015)}px Orbitron, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Launch fighter to connect to galaxy arena", canvas.width * 0.5, canvas.height * 0.55);
    return;
  }

  const camera = getCamera(snapshot, t);
  drawWorld(snapshot, camera, t);
  updateHud(snapshot);
}

function loop(timestamp) {
  if (!loop.last) loop.last = timestamp;
  const dt = Math.min(0.05, (timestamp - loop.last) / 1000);
  loop.last = timestamp;

  resizeCanvas();
  step(dt);
  drawFrame();
  requestAnimationFrame(loop);
}

function renderGameToText() {
  const snapshot = state.latestSnapshot;
  const me = findLocalPlayer(snapshot);

  const payload = {
    mode: snapshot ? snapshot.mode : "menu",
    phase: snapshot ? snapshot.roundPhase : "menu",
    camera_mode: state.cameraMode,
    coordinate_system: "origin=(0,0,0) at arena center; +x right, +y up, +z forward from map center",
    you: me
      ? {
          id: me.id,
          name: me.name,
          alive: me.alive,
          hp: Number(formatNum(me.health, 1)),
          energy: Number(formatNum(me.energy, 1)),
          kills: me.kills,
          deaths: me.deaths,
          position: me.position,
          velocity: me.velocity,
          lock_target: state.lockTargetId,
          gravity_pulse_active: Boolean(me.blackHolePulseActive),
          gravity_pulse_cd: Number(formatNum(me.cooldowns?.blackHolePulse || 0, 2)),
        }
      : null,
    arena_radius: snapshot ? snapshot.arenaRadius : 0,
    event: snapshot ? snapshot.event : { type: "none", remaining: 0 },
    radar_disabled: snapshot ? snapshot.radarDisabled : false,
    alive_players: snapshot ? snapshot.players.filter((p) => p.alive).length : 0,
    players: snapshot
      ? snapshot.players.map((p) => ({
          id: p.id,
          name: p.name,
          alive: p.alive,
          hp: p.health,
          energy: p.energy,
          marked: p.marked,
          gravity_pulse_active: Boolean(p.blackHolePulseActive),
          skin: p.skin,
          team: p.team,
          position: p.position,
        }))
      : [],
    projectiles_visible: snapshot ? snapshot.projectiles.length : 0,
    crystals_visible: snapshot ? snapshot.crystals.length : 0,
    top_leaderboard: snapshot ? snapshot.leaderboard : [],
  };

  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;

window.advanceTime = async (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) {
    step(1 / 60);
  }
  drawFrame();
};

startBtn.addEventListener("click", () => {
  connectToServer();
});

window.addEventListener("resize", resizeCanvas);
setupInput();
resizeCanvas();
loadShipModel();
if (new URLSearchParams(window.location.search).get("autostart") === "1") {
  connectToServer();
  showMenu(false);
}
requestAnimationFrame(loop);
