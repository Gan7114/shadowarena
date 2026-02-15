import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";

const MAX_PLAYERS = 6;
const TICK_RATE = 30;
const TICK_DT = 1 / TICK_RATE;
const ARENA_RADIUS = 2300;
const BLACK_HOLE_START = 0;
const BLACK_HOLE_GROWTH_PER_SEC = 0;
const SHIP_RADIUS = 28;
const SHIP_MAX_HP = 100;
const ENERGY_START = 100;
const ENERGY_MAX = 140;
const ENERGY_REGEN = 8;

const PLASMA_COOLDOWN = 0.09;
const MISSILE_COOLDOWN = 0.85;
const WARP_COOLDOWN = 3.6;
const GRAVITY_SHIFT_COOLDOWN = 9.5;
const BLACK_HOLE_PULSE_COOLDOWN = 13;
const QUICK_TURN_COOLDOWN = 5.5;
const REFILL_COOLDOWN = 22;

const EVENT_MIN_SECONDS = 120;
const EVENT_MAX_SECONDS = 180;
const EVENT_DURATION_SECONDS = 22;

const TEAM_COLORS = ["#49d9ff", "#ff8452", "#7dff84", "#ff5ca8", "#9e8bff", "#ffd26f"];
const SHIP_SKIN_COUNT = 6;

let nextHumanId = 1;
let nextProjectileId = 1;
let nextAsteroidId = 1;
let nextCrystalId = 1;
let nextBotId = 1;

const state = {
  mode: "battle-royale",
  round: 1,
  roundPhase: "waiting",
  roundTimer: 0,
  roundEndsAt: 0,
  deathCounter: 0,
  blackHoleRadius: BLACK_HOLE_START,
  nextEventAt: randomRange(EVENT_MIN_SECONDS, EVENT_MAX_SECONDS),
  activeEvent: { type: "none", endsAt: 0 },
  players: new Map(),
  projectiles: [],
  asteroids: [],
  rainAsteroids: [],
  crystals: [],
  nebulaZones: [],
  distortionZones: [],
  lastSnapshotId: 0,
  pendingEvents: [],
};

const sockets = new Set();

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
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

function angleWrap(v) {
  let out = v;
  while (out > Math.PI) out -= Math.PI * 2;
  while (out < -Math.PI) out += Math.PI * 2;
  return out;
}

function getForward(yaw, pitch) {
  return normalize({
    x: Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch),
  });
}

function getRight(yaw) {
  return normalize({
    x: Math.cos(yaw),
    y: 0,
    z: -Math.sin(yaw),
  });
}

function orbitalSpawn(index, total) {
  const angle = (index / Math.max(1, total)) * Math.PI * 2 + randomRange(-0.22, 0.22);
  const radius = randomRange(1000, 1700);
  return {
    x: Math.cos(angle) * radius,
    y: randomRange(-240, 260),
    z: Math.sin(angle) * radius,
  };
}

function pickShipSkin(seed) {
  return Math.abs(Math.floor(seed)) % SHIP_SKIN_COUNT;
}

function createDefaultInput() {
  return {
    thrust: 0,
    strafe: 0,
    lift: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    boost: false,
    firePlasma: false,
    fireMissile: false,
    overchargeMissile: false,
    warp: "none",
    gravityShift: false,
    blackHolePulse: false,
    quickTurn: false,
    emergencyRefill: false,
    lockTarget: null,
  };
}

function sanitizeInput(input) {
  const raw = typeof input === "object" && input ? input : {};
  const warp = raw.warp === "stable" || raw.warp === "blind" ? raw.warp : "none";
  return {
    thrust: clamp(Number(raw.thrust) || 0, -1, 1),
    strafe: clamp(Number(raw.strafe) || 0, -1, 1),
    lift: clamp(Number(raw.lift) || 0, -1, 1),
    yaw: clamp(Number(raw.yaw) || 0, -1, 1),
    pitch: clamp(Number(raw.pitch) || 0, -1, 1),
    roll: clamp(Number(raw.roll) || 0, -1, 1),
    boost: Boolean(raw.boost),
    firePlasma: Boolean(raw.firePlasma),
    fireMissile: Boolean(raw.fireMissile),
    overchargeMissile: Boolean(raw.overchargeMissile),
    warp,
    gravityShift: Boolean(raw.gravityShift),
    blackHolePulse: Boolean(raw.blackHolePulse),
    quickTurn: Boolean(raw.quickTurn),
    emergencyRefill: Boolean(raw.emergencyRefill),
    lockTarget: Number.isFinite(raw.lockTarget) ? Number(raw.lockTarget) : null,
  };
}

function createPlayer({ id, name, color, bot, socket, team, skin }) {
  return {
    id,
    name,
    color,
    skin,
    bot,
    socket,
    team,
    alive: true,
    health: SHIP_MAX_HP,
    energy: ENERGY_START,
    kills: 0,
    deaths: 0,
    marked: false,
    deathOrder: 0,
    deathTime: 0,
    input: createDefaultInput(),
    position: vec3(0, 0, 0),
    velocity: vec3(0, 0, 0),
    yaw: randomRange(-Math.PI, Math.PI),
    pitch: randomRange(-0.22, 0.22),
    roll: 0,
    lockTarget: null,
    cooldowns: {
      plasma: 0,
      missile: 0,
      warp: 0,
      gravityShift: 0,
      blackHolePulse: 0,
      quickTurn: 0,
      refill: 0,
    },
    effects: {
      gravityShiftUntil: 0,
      blackHolePulseUntil: 0,
    },
    botState: {
      strafePhase: randomRange(0, Math.PI * 2),
      missileBurstAt: randomRange(0, 8),
    },
    lastHitBy: null,
  };
}

function getHumanCount() {
  let count = 0;
  for (const p of state.players.values()) {
    if (!p.bot) count += 1;
  }
  return count;
}

function getActiveFighters() {
  const fighters = [];
  for (const p of state.players.values()) {
    fighters.push(p);
  }
  if (state.mode === "ranked-duel") {
    fighters.sort((a, b) => a.id - b.id);
    return fighters.slice(0, 2);
  }
  return fighters.slice(0, MAX_PLAYERS);
}

function resetPlayerForRound(player, spawnIndex, total) {
  player.alive = true;
  player.health = SHIP_MAX_HP;
  player.energy = ENERGY_START;
  player.marked = false;
  player.deathOrder = 0;
  player.deathTime = 0;
  player.lastHitBy = null;
  player.input = createDefaultInput();
  player.cooldowns.plasma = 0;
  player.cooldowns.missile = 0;
  player.cooldowns.warp = 0;
  player.cooldowns.gravityShift = 0;
  player.cooldowns.blackHolePulse = 0;
  player.cooldowns.quickTurn = 0;
  player.cooldowns.refill = 0;
  player.effects.gravityShiftUntil = 0;
  player.effects.blackHolePulseUntil = 0;
  player.lockTarget = null;
  const spawn = orbitalSpawn(spawnIndex, total);
  player.position = vec3(spawn.x, spawn.y, spawn.z);
  player.velocity = vec3(0, 0, 0);
  player.yaw = randomRange(-Math.PI, Math.PI);
  player.pitch = randomRange(-0.18, 0.18);
  player.roll = 0;
}

function rebuildArena() {
  state.asteroids = [];
  for (let i = 0; i < 26; i += 1) {
    let placed = null;
    const radius = randomRange(18, 58);
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const radial = randomRange(760, ARENA_RADIUS - 180);
      const theta = randomRange(0, Math.PI * 2);
      const phi = randomRange(-0.48, 0.48);
      const candidatePos = {
        x: Math.cos(theta) * Math.cos(phi) * radial,
        y: Math.sin(phi) * radial * 0.44,
        z: Math.sin(theta) * Math.cos(phi) * radial,
      };

      const separated = state.asteroids.every((other) => distance(candidatePos, other.position) > other.radius + radius + 210);
      if (!separated) continue;

      placed = {
        id: nextAsteroidId++,
        radius,
        position: candidatePos,
        velocity: vec3(randomRange(-24, 24), randomRange(-8, 8), randomRange(-24, 24)),
      };
      break;
    }

    if (placed) state.asteroids.push(placed);
  }

  state.nebulaZones = [
    { id: 1, position: vec3(-760, -80, 720), radius: 260 },
    { id: 2, position: vec3(860, 160, -560), radius: 280 },
  ];

  state.distortionZones = [
    { id: 1, position: vec3(300, -60, 300), radius: 140, strength: 95 },
    { id: 2, position: vec3(-520, 120, -360), radius: 150, strength: 105 },
  ];

  state.crystals = [];
}

function spawnCrystal() {
  const angle = randomRange(0, Math.PI * 2);
  const radius = randomRange(420, 1900);
  const crystal = {
    id: nextCrystalId++,
    position: {
      x: Math.cos(angle) * radius,
      y: randomRange(-260, 260),
      z: Math.sin(angle) * radius,
    },
    radius: randomRange(12, 20),
    energy: randomInt(20, 35),
    respawnAt: 0,
    active: true,
  };
  state.crystals.push(crystal);
}

function ensureBots() {
  const fighters = getActiveFighters();
  let botCount = fighters.filter((p) => p.bot).length;
  while (fighters.length + botCount < MAX_PLAYERS) {
    const id = 1000 + nextBotId;
    const bot = createPlayer({
      id,
      name: `BOT-${nextBotId}`,
      color: TEAM_COLORS[(id + 2) % TEAM_COLORS.length],
      bot: true,
      socket: null,
      team: (nextBotId % 2) + 1,
      skin: pickShipSkin(nextBotId + id * 0.37),
    });
    nextBotId += 1;
    state.players.set(bot.id, bot);
    botCount += 1;
  }

  const humans = getHumanCount();
  if (humans === 0) {
    // Keep one bot alive for attract mode.
    return;
  }

  // Keep exactly enough bots for a 6-fighter lobby while humans are present.
  const desiredBots = Math.max(0, MAX_PLAYERS - humans);
  const existingBots = [...state.players.values()].filter((p) => p.bot);
  if (existingBots.length > desiredBots) {
    const toRemove = existingBots.length - desiredBots;
    for (let i = 0; i < toRemove; i += 1) {
      const bot = existingBots[i];
      state.players.delete(bot.id);
    }
  } else if (existingBots.length < desiredBots) {
    const toAdd = desiredBots - existingBots.length;
    for (let i = 0; i < toAdd; i += 1) {
      const id = 1000 + nextBotId;
      const bot = createPlayer({
        id,
        name: `BOT-${nextBotId}`,
        color: TEAM_COLORS[(id + 1) % TEAM_COLORS.length],
        bot: true,
        socket: null,
        team: (nextBotId % 2) + 1,
        skin: pickShipSkin(nextBotId + id * 0.41),
      });
      nextBotId += 1;
      state.players.set(bot.id, bot);
    }
  }
}

function getRoundParticipants() {
  const fighters = getActiveFighters();
  return fighters.filter((p) => !p.bot || getHumanCount() > 0);
}

function startRound() {
  ensureBots();

  const participants = getRoundParticipants();
  if (participants.length < 2) {
    state.roundPhase = "waiting";
    return;
  }

  state.roundPhase = "active";
  state.roundTimer = 0;
  state.blackHoleRadius = BLACK_HOLE_START;
  state.activeEvent = { type: "none", endsAt: 0 };
  state.nextEventAt = randomRange(EVENT_MIN_SECONDS, EVENT_MAX_SECONDS);
  state.deathCounter = 0;
  state.projectiles = [];
  state.rainAsteroids = [];
  rebuildArena();

  participants.forEach((p, index) => {
    resetPlayerForRound(p, index, participants.length);
  });

  for (let i = 0; i < 5; i += 1) spawnCrystal();
  state.pendingEvents.push({ type: "roundStart", round: state.round });
}

function getAliveParticipants() {
  return getRoundParticipants().filter((p) => p.alive);
}

function currentEventModifiers() {
  const type = state.activeEvent.type;
  return {
    plasmaDamageMul: type === "solar-storm" ? 1.5 : 1,
    missileTrackingDisabled: type === "solar-storm",
    heavyShips: type === "gravity-flux",
    radarDisabled: type === "nebula-surge",
    asteroidRain: type === "asteroid-rain",
  };
}

function startEvent() {
  const events = ["solar-storm", "asteroid-rain", "gravity-flux", "nebula-surge"];
  const type = events[randomInt(0, events.length - 1)];
  state.activeEvent = {
    type,
    endsAt: state.roundTimer + EVENT_DURATION_SECONDS,
  };
  state.pendingEvents.push({ type: "eventStart", eventType: type });
}

function endEvent() {
  state.activeEvent = { type: "none", endsAt: 0 };
  state.nextEventAt = state.roundTimer + randomRange(EVENT_MIN_SECONDS, EVENT_MAX_SECONDS);
  state.rainAsteroids = [];
}

function applyDamage(target, amount, attackerId) {
  if (!target.alive) return;
  target.health = clamp(target.health - amount, 0, SHIP_MAX_HP);
  target.lastHitBy = attackerId ?? target.lastHitBy;
  if (target.health <= 0) {
    eliminate(target, attackerId);
  }
}

function eliminate(player, attackerId) {
  if (!player.alive) return;
  player.alive = false;
  player.deaths += 1;
  state.deathCounter += 1;
  player.deathOrder = state.deathCounter;
  player.deathTime = state.roundTimer;
  player.velocity = vec3(0, 0, 0);

  state.pendingEvents.push({ type: "explosion", position: { ...player.position }, radius: 60, color: player.color });

  if (attackerId && attackerId !== player.id) {
    const killer = state.players.get(attackerId);
    if (killer && killer.alive) {
      killer.kills += 1;
      killer.energy = clamp(killer.energy + 28, 0, ENERGY_MAX);
      killer.marked = killer.kills >= 2;
      state.pendingEvents.push({ type: "kill", killerId: attackerId, killerName: killer.name, victimId: player.id, victimName: player.name, position: { ...player.position } });
    }
  }

  const alive = getAliveParticipants();
  if (alive.length <= 1) {
    endRound();
  } else if (state.mode === "team-war") {
    const teamsAlive = new Set(alive.map((p) => p.team));
    if (teamsAlive.size <= 1) {
      endRound();
    }
  }
}

function endRound() {
  if (state.roundPhase !== "active") return;
  state.roundPhase = "ended";
  state.roundEndsAt = state.roundTimer + 8;

  const participants = getRoundParticipants();
  const ranking = [...participants].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (b.kills !== a.kills) return b.kills - a.kills;
    if (b.health !== a.health) return b.health - a.health;
    return b.deathTime - a.deathTime;
  });

  state.pendingEvents.push({ type: "roundEnd", round: state.round });
}

function maybeRestartRound() {
  if (state.roundPhase === "waiting") {
    if (getRoundParticipants().length >= 2) {
      startRound();
    }
    return;
  }
  if (state.roundPhase === "ended" && state.roundTimer >= state.roundEndsAt) {
    state.round += 1;
    startRound();
  }
}

function processPlayerActions(player, dt, modifiers) {
  if (!player.alive) return;

  player.energy = clamp(player.energy + ENERGY_REGEN * dt, 0, ENERGY_MAX);

  for (const key of Object.keys(player.cooldowns)) {
    player.cooldowns[key] = Math.max(0, player.cooldowns[key] - dt);
  }

  if (player.effects.gravityShiftUntil > 0) {
    player.effects.gravityShiftUntil = Math.max(0, player.effects.gravityShiftUntil - dt);
  }
  if (player.effects.blackHolePulseUntil > 0) {
    player.effects.blackHolePulseUntil = Math.max(0, player.effects.blackHolePulseUntil - dt);
  }

  const turnSpeed = modifiers.heavyShips ? 2.2 : 3.4;
  const rollSpeed = modifiers.heavyShips ? 3.2 : 4.9;

  player.yaw = angleWrap(player.yaw + player.input.yaw * turnSpeed * dt);
  player.pitch = clamp(player.pitch + player.input.pitch * turnSpeed * dt, -1.1, 1.1);
  player.roll = angleWrap(player.roll + player.input.roll * rollSpeed * dt);

  if (player.input.quickTurn && player.cooldowns.quickTurn <= 0) {
    player.yaw = angleWrap(player.yaw + Math.PI);
    player.cooldowns.quickTurn = QUICK_TURN_COOLDOWN;
  }

  const forward = getForward(player.yaw, player.pitch);
  const right = getRight(player.yaw);
  const up = vec3(0, 1, 0);

  let accel = vec3(0, 0, 0);
  accel = add(accel, scale(forward, player.input.thrust));
  accel = add(accel, scale(right, player.input.strafe));
  accel = add(accel, scale(up, player.input.lift));
  accel = normalize(accel);

  let boostMul = 1;
  if (player.input.boost && player.energy > 0) {
    boostMul = 2.1;
    player.energy = clamp(player.energy - 15 * dt, 0, ENERGY_MAX);
  }

  if (modifiers.heavyShips) {
    boostMul *= 0.78;
  }

  const baseAccel = 920;
  player.velocity = add(player.velocity, scale(accel, baseAccel * boostMul * dt));

  player.velocity = scale(player.velocity, modifiers.heavyShips ? 0.981 : 0.989);

  const maxSpeed = (modifiers.heavyShips ? 520 : 760) * boostMul;
  const speed = length(player.velocity);
  if (speed > maxSpeed) {
    player.velocity = scale(normalize(player.velocity), maxSpeed);
  }

  player.position = add(player.position, scale(player.velocity, dt));

  const distFromCenter = length(player.position);

  if (distFromCenter > ARENA_RADIUS) {
    applyDamage(player, 10 * dt, null);
    const inward = normalize(scale(player.position, -1));
    player.velocity = add(player.velocity, scale(inward, 190 * dt));
    if (distFromCenter > ARENA_RADIUS + 180) {
      const outward = normalize(player.position);
      player.position = scale(outward, ARENA_RADIUS + 110);
      player.velocity = scale(add(player.velocity, scale(inward, 260)), 0.7);
    }
  }

  for (const asteroid of state.asteroids) {
    const hitDist = asteroid.radius + SHIP_RADIUS;
    const d = distance(player.position, asteroid.position);
    if (d < hitDist) {
      const push = normalize(sub(player.position, asteroid.position));
      player.position = add(asteroid.position, scale(push, hitDist + 2));
      player.velocity = add(player.velocity, scale(push, 170));
      applyDamage(player, 26 * dt, null);
    }
  }

  for (const rain of state.rainAsteroids) {
    const hitDist = rain.radius + SHIP_RADIUS;
    if (distance(player.position, rain.position) < hitDist) {
      applyDamage(player, 40, null);
      rain.ttl = 0;
    }
  }

  for (const crystal of state.crystals) {
    if (!crystal.active) {
      if (state.roundTimer >= crystal.respawnAt) {
        crystal.active = true;
        crystal.position = orbitalSpawn(randomRange(0, 1), 1);
        crystal.position.y = randomRange(-240, 240);
      }
      continue;
    }

    const pickupDist = crystal.radius + SHIP_RADIUS;
    if (distance(player.position, crystal.position) < pickupDist) {
      player.energy = clamp(player.energy + crystal.energy, 0, ENERGY_MAX);
      crystal.active = false;
      crystal.respawnAt = state.roundTimer + randomRange(9, 16);
    }
  }

  if (player.input.warp !== "none" && player.cooldowns.warp <= 0 && player.energy >= 25) {
    player.energy -= 25;
    player.cooldowns.warp = WARP_COOLDOWN;
    const warpFrom = { ...player.position };

    if (player.input.warp === "stable") {
      const jump = scale(forward, 300);
      player.position = add(player.position, jump);
    } else {
      const randomDir = normalize(vec3(randomRange(-1, 1), randomRange(-0.7, 0.7), randomRange(-1, 1)));
      player.position = add(player.position, scale(randomDir, 260));
    }
    state.pendingEvents.push({ type: "warp", playerId: player.id, from: warpFrom, to: { ...player.position } });

    for (const proj of state.projectiles) {
      if (proj.type === "missile" && proj.targetId === player.id) {
        proj.targetId = null;
      }
    }
  }

  if (player.input.gravityShift && player.cooldowns.gravityShift <= 0 && player.energy >= 40) {
    player.energy -= 40;
    player.cooldowns.gravityShift = GRAVITY_SHIFT_COOLDOWN;
    player.effects.gravityShiftUntil = 4.5;
    state.pendingEvents.push({ type: "ability", ability: "gravityShift", playerId: player.id, position: { ...player.position } });
  }

  if (player.input.blackHolePulse && player.cooldowns.blackHolePulse <= 0 && player.energy >= 35) {
    player.energy -= 35;
    player.cooldowns.blackHolePulse = BLACK_HOLE_PULSE_COOLDOWN;
    player.effects.blackHolePulseUntil = 3.4;
    state.pendingEvents.push({ type: "ability", ability: "blackHolePulse", playerId: player.id, position: { ...player.position } });
  }

  if (player.input.emergencyRefill && player.cooldowns.refill <= 0) {
    player.energy = clamp(player.energy + 65, 0, ENERGY_MAX);
    player.cooldowns.refill = REFILL_COOLDOWN;
  }

  player.lockTarget = Number.isFinite(player.input.lockTarget) ? player.input.lockTarget : player.lockTarget;

  if (player.input.firePlasma && player.cooldowns.plasma <= 0) {
    player.cooldowns.plasma = PLASMA_COOLDOWN;
    spawnPlasma(player, forward, modifiers);
  }

  const wantsOvercharge = Boolean(player.input.overchargeMissile);
  const missileEnergyCost = wantsOvercharge ? 35 : 15;
  if (player.input.fireMissile && player.cooldowns.missile <= 0 && player.energy >= missileEnergyCost) {
    player.energy -= missileEnergyCost;
    player.cooldowns.missile = MISSILE_COOLDOWN;
    spawnMissile(player, forward, modifiers, wantsOvercharge);
  }

  player.marked = player.kills >= 2;
}

function getValidTarget(ownerId, targetId) {
  if (!Number.isFinite(targetId)) return null;
  const target = state.players.get(targetId);
  if (!target || !target.alive || target.id === ownerId) return null;
  return target;
}

function spawnPlasma(player, forward, modifiers) {
  const projectile = {
    id: nextProjectileId++,
    type: "plasma",
    ownerId: player.id,
    targetId: null,
    overcharged: false,
    position: add(player.position, scale(forward, 45)),
    velocity: add(scale(forward, 1760), scale(player.velocity, 0.55)),
    damage: 8 * modifiers.plasmaDamageMul,
    ttl: 1.05,
    radius: 4.2,
    turnRate: 0,
  };
  state.projectiles.push(projectile);
}

function spawnMissile(player, forward, modifiers, overcharge = false) {
  const missile = {
    id: nextProjectileId++,
    type: "missile",
    ownerId: player.id,
    targetId: null,
    overcharged: overcharge,
    position: add(player.position, scale(forward, 52)),
    velocity: add(scale(forward, overcharge ? 980 : 760), scale(player.velocity, 0.45)),
    damage: overcharge ? 48 : 34,
    ttl: overcharge ? 7.8 : 6.4,
    radius: 10,
    turnRate: overcharge ? 3.4 : 2.4,
  };

  const lock = getValidTarget(player.id, player.lockTarget);
  if (lock) {
    missile.targetId = lock.id;
  } else {
    let best = null;
    let bestScore = Infinity;
    const ownerForward = normalize(forward);
    for (const candidate of state.players.values()) {
      if (!candidate.alive || candidate.id === player.id) continue;
      const offset = sub(candidate.position, player.position);
      const dist = length(offset);
      if (dist > 1500) continue;
      const dir = normalize(offset);
      const forwardDot = dot(ownerForward, dir);
      if (forwardDot < 0.5) continue;
      const score = dist - forwardDot * 250;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    if (best) missile.targetId = best.id;
  }

  if (modifiers.missileTrackingDisabled) {
    missile.targetId = null;
  }

  state.projectiles.push(missile);
}

function updateAsteroids(dt) {
  const radialLimit = ARENA_RADIUS - 140;
  for (const asteroid of state.asteroids) {
    asteroid.position = add(asteroid.position, scale(asteroid.velocity, dt));

    const planar = vec3(asteroid.position.x, 0, asteroid.position.z);
    const planarLen = length(planar);
    if (planarLen > radialLimit) {
      const normal = scale(planar, 1 / Math.max(0.001, planarLen));
      asteroid.position.x = normal.x * radialLimit;
      asteroid.position.z = normal.z * radialLimit;
      const vn = dot(asteroid.velocity, normal);
      asteroid.velocity = sub(asteroid.velocity, scale(normal, 2 * vn));
      asteroid.velocity = scale(asteroid.velocity, 0.94);
    }

    if (asteroid.position.y > 280 || asteroid.position.y < -280) {
      asteroid.position.y = clamp(asteroid.position.y, -280, 280);
      asteroid.velocity.y *= -1;
    }
  }
}

function maybeSpawnAsteroidRain(dt, modifiers) {
  if (!modifiers.asteroidRain) return;

  if (state.rainAsteroids.length < 24 && Math.random() < dt * 7.5) {
    state.rainAsteroids.push({
      id: nextAsteroidId++,
      radius: randomRange(16, 34),
      position: vec3(randomRange(-2000, 2000), randomRange(580, 980), randomRange(-2000, 2000)),
      velocity: vec3(randomRange(-70, 70), randomRange(-620, -460), randomRange(-70, 70)),
      ttl: randomRange(3.6, 5.8),
    });
  }

  for (const rain of state.rainAsteroids) {
    rain.ttl -= dt;
    rain.position = add(rain.position, scale(rain.velocity, dt));
  }

  state.rainAsteroids = state.rainAsteroids.filter((a) => a.ttl > 0 && a.position.y > -500);
}

function applyBlackHolePulses(dt) {
  const pulseUsers = getRoundParticipants().filter((p) => p.alive && p.effects.blackHolePulseUntil > 0);
  if (pulseUsers.length === 0) return;

  for (const source of pulseUsers) {
    for (const target of getRoundParticipants()) {
      if (!target.alive || target.id === source.id) continue;
      const offset = sub(source.position, target.position);
      const dist = length(offset);
      if (dist <= 0.001 || dist > 340) continue;

      const pullDir = scale(offset, 1 / dist);
      const strength = (1 - dist / 340) * 210;
      target.velocity = add(target.velocity, scale(pullDir, strength * dt));
      if (dist < 120) {
        applyDamage(target, 7 * dt, source.id);
      }
    }

    for (const projectile of state.projectiles) {
      if (projectile.type !== "missile" || projectile.ownerId === source.id) continue;
      const offset = sub(source.position, projectile.position);
      const dist = length(offset);
      if (dist <= 0.001 || dist > 390) continue;
      const pullDir = scale(offset, 1 / dist);
      const strength = (1 - dist / 390) * 340;
      projectile.velocity = add(projectile.velocity, scale(pullDir, strength * dt));
      if (dist < 80) projectile.ttl = 0;
    }
  }
}

function applyDistortion(projectile, dt) {
  for (const zone of state.distortionZones) {
    const offset = sub(zone.position, projectile.position);
    const dist = length(offset);
    if (dist >= zone.radius) continue;

    const radial = normalize(offset);
    const tangent = normalize(cross(radial, vec3(0, 1, 0)));
    const pull = scale(radial, zone.strength * dt * 0.5);
    const swirl = scale(tangent, zone.strength * dt * 0.35);
    projectile.velocity = add(projectile.velocity, add(pull, swirl));
  }
}

function updateProjectiles(dt, modifiers) {
  for (const projectile of state.projectiles) {
    projectile.ttl -= dt;
    if (projectile.ttl <= 0) continue;

    if (projectile.type === "missile") {
      const speed = length(projectile.velocity);
      let desiredDir = normalize(projectile.velocity);

      if (!modifiers.missileTrackingDisabled && Number.isFinite(projectile.targetId)) {
        const target = state.players.get(projectile.targetId);
        if (target && target.alive) {
          desiredDir = normalize(sub(target.position, projectile.position));
        }
      }

      for (const player of state.players.values()) {
        if (!player.alive || player.id === projectile.ownerId) continue;
        if (player.effects.gravityShiftUntil <= 0) continue;
        const dist = distance(player.position, projectile.position);
        if (dist < 260) {
          desiredDir = normalize(sub(projectile.position, player.position));
          break;
        }
      }

      const currentDir = normalize(projectile.velocity);
      const turn = clamp(projectile.turnRate * dt, 0, 1);
      const blended = normalize(add(scale(currentDir, 1 - turn), scale(desiredDir, turn)));
      projectile.velocity = scale(blended, Math.max(speed, projectile.overcharged ? 940 : 700));
    }

    applyDistortion(projectile, dt);
    projectile.position = add(projectile.position, scale(projectile.velocity, dt));

    if (length(projectile.position) < state.blackHoleRadius) {
      projectile.ttl = 0;
      continue;
    }

    for (const asteroid of state.asteroids) {
      if (distance(projectile.position, asteroid.position) < asteroid.radius + projectile.radius) {
        projectile.ttl = 0;
        break;
      }
    }
    if (projectile.ttl <= 0) continue;

    for (const player of state.players.values()) {
      if (!player.alive || player.id === projectile.ownerId) continue;
      if (distance(projectile.position, player.position) <= SHIP_RADIUS + projectile.radius) {
        state.pendingEvents.push({ type: "hit", position: { ...projectile.position }, targetId: player.id, attackerId: projectile.ownerId, damage: projectile.damage, projectileType: projectile.type });
        applyDamage(player, projectile.damage, projectile.ownerId);
        projectile.ttl = 0;
        break;
      }
    }
  }

  state.projectiles = state.projectiles.filter((p) => p.ttl > 0);
}

function updateBots(dt) {
  const alivePlayers = getAliveParticipants();

  for (const bot of state.players.values()) {
    if (!bot.bot || !bot.alive) continue;

    const enemies = alivePlayers.filter((p) => p.id !== bot.id && (state.mode !== "team-war" || p.team !== bot.team));
    if (enemies.length === 0) {
      bot.input = createDefaultInput();
      continue;
    }

    let target = enemies[0];
    let bestDist = distance(bot.position, target.position);
    for (let i = 1; i < enemies.length; i += 1) {
      const d = distance(bot.position, enemies[i].position);
      if (d < bestDist) {
        target = enemies[i];
        bestDist = d;
      }
    }

    const toTarget = sub(target.position, bot.position);
    const desiredYaw = Math.atan2(toTarget.x, toTarget.z);
    const desiredPitch = Math.atan2(toTarget.y, Math.max(1, Math.sqrt(toTarget.x * toTarget.x + toTarget.z * toTarget.z)));

    const yawDiff = angleWrap(desiredYaw - bot.yaw);
    const pitchDiff = desiredPitch - bot.pitch;

    const input = createDefaultInput();
    const yawAbs = Math.abs(yawDiff);
    input.thrust = bestDist < 220 ? 0.66 : 1;
    input.yaw = clamp(yawDiff * 1.6, -1, 1);
    input.pitch = clamp(pitchDiff * 1.8, -1, 1);
    if (Math.random() < dt * 0.7) {
      bot.botState.strafePhase += randomRange(-0.7, 0.7);
    }
    const jink = Math.sin(state.roundTimer * 0.67 + bot.botState.strafePhase) * (yawAbs < 0.2 ? 0.12 : 0.06);
    input.strafe = yawAbs > 0.18 ? clamp(yawDiff * 0.32, -0.42, 0.42) : jink;
    input.lift = clamp((target.position.y - bot.position.y) / 340, -1, 1);
    input.boost = bestDist > 420 || yawAbs > 0.7;
    input.firePlasma = yawAbs < 0.13 && Math.abs(pitchDiff) < 0.11 && bestDist < 1400;
    input.lockTarget = target.id;

    if (bestDist < 900 && state.roundTimer >= bot.botState.missileBurstAt) {
      input.fireMissile = true;
      input.overchargeMissile = Math.random() < 0.4;
      bot.botState.missileBurstAt = state.roundTimer + randomRange(2.4, 4.8);
    }

    const incomingMissile = state.projectiles.some((p) => p.type === "missile" && p.targetId === bot.id);
    if (incomingMissile && bot.energy >= 25) {
      input.warp = Math.random() < 0.5 ? "stable" : "blind";
    }
    if (incomingMissile && bot.energy >= 40 && bot.cooldowns.gravityShift <= 0) {
      input.gravityShift = true;
    }

    if (bestDist < 260 && bot.energy >= 35 && bot.cooldowns.blackHolePulse <= 0 && Math.random() < 0.22) {
      input.blackHolePulse = true;
    }

    if (Math.abs(yawDiff) > 2.5 && bot.cooldowns.quickTurn <= 0) {
      input.quickTurn = true;
    }

    for (const asteroid of state.asteroids) {
      const dist = distance(bot.position, asteroid.position);
      const dangerDist = asteroid.radius + SHIP_RADIUS + 80;
      if (dist < dangerDist) {
        const away = normalize(sub(bot.position, asteroid.position));
        const awayYaw = Math.atan2(away.x, away.z);
        const yawToAway = angleWrap(awayYaw - bot.yaw);
        input.strafe = clamp(input.strafe + Math.sign(yawToAway) * 0.6, -1, 1);
        input.lift = clamp(input.lift + (away.y > 0 ? 0.4 : -0.4), -1, 1);
      }
    }

    bot.input = input;
  }
}

function updateGame(dt) {
  maybeRestartRound();

  if (state.roundPhase !== "active") {
    state.roundTimer += dt;
    return;
  }

  state.roundTimer += dt;
  state.blackHoleRadius = Math.min(ARENA_RADIUS - 260, BLACK_HOLE_START + state.roundTimer * BLACK_HOLE_GROWTH_PER_SEC);

  if (state.activeEvent.type === "none" && state.roundTimer >= state.nextEventAt) {
    startEvent();
  }
  if (state.activeEvent.type !== "none" && state.roundTimer >= state.activeEvent.endsAt) {
    endEvent();
  }

  const modifiers = currentEventModifiers();

  updateAsteroids(dt);
  maybeSpawnAsteroidRain(dt, modifiers);
  updateBots(dt);

  for (const player of getRoundParticipants()) {
    processPlayerActions(player, dt, modifiers);
  }

  applyBlackHolePulses(dt);
  updateProjectiles(dt, modifiers);
}

function buildLeaderboard() {
  return [...getRoundParticipants()]
    .sort((a, b) => {
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.health - a.health;
    })
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      name: p.name,
      kills: p.kills,
      alive: p.alive,
      health: Number(p.health.toFixed(1)),
      marked: p.marked,
      team: p.team,
      bot: p.bot,
    }));
}

function buildSnapshot(forPlayerId) {
  const you = state.players.get(forPlayerId);
  const payload = {
    type: "snapshot",
    snapshotId: ++state.lastSnapshotId,
    mode: state.mode,
    round: state.round,
    roundPhase: state.roundPhase,
    roundTimer: Number(state.roundTimer.toFixed(2)),
    blackHoleRadius: Number(state.blackHoleRadius.toFixed(2)),
    arenaRadius: ARENA_RADIUS,
    event: {
      type: state.activeEvent.type,
      remaining: state.activeEvent.type === "none" ? 0 : Number(Math.max(0, state.activeEvent.endsAt - state.roundTimer).toFixed(2)),
    },
    radarDisabled: state.activeEvent.type === "nebula-surge",
    players: getRoundParticipants().map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      skin: p.skin,
      bot: p.bot,
      team: p.team,
      alive: p.alive,
      health: Number(p.health.toFixed(1)),
      energy: Number(p.energy.toFixed(1)),
      kills: p.kills,
      deaths: p.deaths,
      marked: p.marked,
      lockTarget: p.lockTarget,
      gravityShiftActive: p.effects.gravityShiftUntil > 0,
      blackHolePulseActive: p.effects.blackHolePulseUntil > 0,
      cooldowns: {
        plasma: Number(p.cooldowns.plasma.toFixed(2)),
        missile: Number(p.cooldowns.missile.toFixed(2)),
        warp: Number(p.cooldowns.warp.toFixed(2)),
        gravityShift: Number(p.cooldowns.gravityShift.toFixed(2)),
        blackHolePulse: Number(p.cooldowns.blackHolePulse.toFixed(2)),
      },
      position: {
        x: Number(p.position.x.toFixed(2)),
        y: Number(p.position.y.toFixed(2)),
        z: Number(p.position.z.toFixed(2)),
      },
      velocity: {
        x: Number(p.velocity.x.toFixed(2)),
        y: Number(p.velocity.y.toFixed(2)),
        z: Number(p.velocity.z.toFixed(2)),
      },
      yaw: Number(p.yaw.toFixed(3)),
      pitch: Number(p.pitch.toFixed(3)),
      roll: Number(p.roll.toFixed(3)),
    })),
    projectiles: state.projectiles.slice(0, 180).map((p) => ({
      id: p.id,
      type: p.type,
      ownerId: p.ownerId,
      targetId: p.targetId,
      overcharged: p.overcharged,
      ttl: Number(p.ttl.toFixed(2)),
      velocity: {
        x: Number(p.velocity.x.toFixed(2)),
        y: Number(p.velocity.y.toFixed(2)),
        z: Number(p.velocity.z.toFixed(2)),
      },
      position: {
        x: Number(p.position.x.toFixed(2)),
        y: Number(p.position.y.toFixed(2)),
        z: Number(p.position.z.toFixed(2)),
      },
    })),
    asteroids: state.asteroids.map((a) => ({
      id: a.id,
      radius: Number(a.radius.toFixed(1)),
      position: {
        x: Number(a.position.x.toFixed(1)),
        y: Number(a.position.y.toFixed(1)),
        z: Number(a.position.z.toFixed(1)),
      },
    })),
    rainAsteroids: state.rainAsteroids.map((a) => ({
      id: a.id,
      radius: Number(a.radius.toFixed(1)),
      position: {
        x: Number(a.position.x.toFixed(1)),
        y: Number(a.position.y.toFixed(1)),
        z: Number(a.position.z.toFixed(1)),
      },
    })),
    crystals: state.crystals
      .filter((c) => c.active)
      .map((c) => ({
        id: c.id,
        radius: Number(c.radius.toFixed(1)),
        energy: c.energy,
        position: {
          x: Number(c.position.x.toFixed(1)),
          y: Number(c.position.y.toFixed(1)),
          z: Number(c.position.z.toFixed(1)),
        },
      })),
    nebulaZones: state.nebulaZones,
    distortionZones: state.distortionZones,
    events: state.pendingEvents.map(e => ({ ...e })),
    leaderboard: buildLeaderboard(),
    you: you
      ? {
          id: you.id,
          lockTarget: you.lockTarget,
        }
      : null,
  };
  return payload;
}

function encodeWsFrame(payload, opcode = 1) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const len = data.length;
  let header;

  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  return Buffer.concat([header, data]);
}

function decodeWsFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];

    const opcode = byte1 & 0x0f;
    const masked = (byte2 & 0x80) !== 0;
    let payloadLen = byte2 & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      const big = buffer.readBigUInt64BE(offset + 2);
      if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("Frame too large");
      }
      payloadLen = Number(big);
      headerLen = 10;
    }

    const maskLen = masked ? 4 : 0;
    const frameLen = headerLen + maskLen + payloadLen;
    if (offset + frameLen > buffer.length) break;

    const maskOffset = offset + headerLen;
    const payloadOffset = maskOffset + maskLen;
    let payload = Buffer.from(buffer.subarray(payloadOffset, payloadOffset + payloadLen));

    if (masked) {
      const mask = buffer.subarray(maskOffset, maskOffset + 4);
      for (let i = 0; i < payload.length; i += 1) {
        payload[i] ^= mask[i % 4];
      }
    }

    messages.push({ opcode, payload });
    offset += frameLen;
  }

  return {
    messages,
    remaining: buffer.subarray(offset),
  };
}

function send(socket, message) {
  if (!socket || socket.destroyed || !socket.writable) return;
  const payload = JSON.stringify(message);
  socket.write(encodeWsFrame(payload, 1));
}

function broadcast(message) {
  for (const socket of sockets) {
    send(socket, message);
  }
}

function handleClientMessage(socket, message) {
  if (!message || typeof message !== "object") return;

  if (message.type === "join") {
    if (socket.playerId) return;

    const humans = [...state.players.values()].filter((p) => !p.bot);
    if (humans.length >= MAX_PLAYERS) {
      send(socket, { type: "error", code: "LOBBY_FULL", message: "Lobby is full (6/6)." });
      return;
    }

    const id = nextHumanId++;
    const name = String(message.name || `Pilot-${id}`).slice(0, 18);
    const mode = String(message.mode || "battle-royale");
    if (["battle-royale", "team-war", "ranked-duel", "tournament"].includes(mode)) {
      state.mode = mode;
    }

    const player = createPlayer({
      id,
      name,
      color: TEAM_COLORS[id % TEAM_COLORS.length],
      bot: false,
      socket,
      team: (id % 2) + 1,
      skin: pickShipSkin(id * 1.13),
    });

    state.players.set(id, player);
    socket.playerId = id;

    ensureBots();
    if (state.roundPhase !== "active") {
      startRound();
    }

    send(socket, {
      type: "joined",
      id,
      maxPlayers: MAX_PLAYERS,
      mode: state.mode,
    });

    return;
  }

  if (!socket.playerId) return;

  const player = state.players.get(socket.playerId);
  if (!player) return;

  if (message.type === "input") {
    player.input = sanitizeInput(message.input);
  }
}

function handleSocketData(socket, data) {
  socket.wsBuffer = Buffer.concat([socket.wsBuffer, data]);

  let decoded;
  try {
    decoded = decodeWsFrames(socket.wsBuffer);
  } catch {
    socket.destroy();
    return;
  }

  socket.wsBuffer = decoded.remaining;

  for (const frame of decoded.messages) {
    if (frame.opcode === 0x8) {
      socket.end();
      return;
    }

    if (frame.opcode === 0x9) {
      socket.write(encodeWsFrame(frame.payload, 0xA));
      continue;
    }

    if (frame.opcode !== 0x1) continue;

    try {
      const parsed = JSON.parse(frame.payload.toString("utf8"));
      handleClientMessage(socket, parsed);
    } catch {
      // ignore malformed packet
    }
  }
}

function handleSocketClose(socket) {
  sockets.delete(socket);
  const playerId = socket.playerId;
  if (!playerId) return;

  const player = state.players.get(playerId);
  if (player) {
    state.players.delete(playerId);
  }

  ensureBots();

  const humans = getHumanCount();
  if (humans === 0) {
    state.roundPhase = "waiting";
  }
}

function serveStatic(req, res) {
  let pathname = "/";
  try {
    const parsed = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    pathname = parsed.pathname || "/";
  } catch {
    pathname = "/";
  }

  const reqPath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(reqPath).replace(/^\.\.(\/|\\|$)/, "");
  const filePath = path.join(PUBLIC_DIR, normalized);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
    };

    res.writeHead(200, {
      "content-type": types[ext] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  serveStatic(req, res);
});

server.on("upgrade", (req, socket) => {
  if (req.url !== "/ws") {
    socket.destroy();
    return;
  }

  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash("sha1")
    .update(String(key) + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");

  const headers = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptKey}`,
    "\r\n",
  ];

  socket.write(headers.join("\r\n"));
  socket.wsBuffer = Buffer.alloc(0);
  socket.playerId = null;
  sockets.add(socket);

  socket.on("data", (data) => handleSocketData(socket, data));
  socket.on("close", () => handleSocketClose(socket));
  socket.on("end", () => handleSocketClose(socket));
  socket.on("error", () => handleSocketClose(socket));

  send(socket, {
    type: "hello",
    modes: ["battle-royale", "team-war", "ranked-duel", "tournament"],
    maxPlayers: MAX_PLAYERS,
  });
});

setInterval(() => {
  updateGame(TICK_DT);
  for (const socket of sockets) {
    if (!socket.playerId) continue;
    send(socket, buildSnapshot(socket.playerId));
  }

  state.pendingEvents = [];

  if (state.lastSnapshotId % 45 === 0) {
    broadcast({
      type: "heartbeat",
      players: getRoundParticipants().length,
      humans: getHumanCount(),
      mode: state.mode,
      roundPhase: state.roundPhase,
    });
  }
}, 1000 / TICK_RATE);

ensureBots();
startRound();

let activePort = PORT;

function listenOn(port) {
  activePort = port;
  server.listen(activePort, HOST);
}

server.on("listening", () => {
  console.log(`Shadowfighter server running on http://${HOST}:${activePort}`);
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    const nextPort = activePort + 1;
    console.warn(`Port ${activePort} is in use, trying ${nextPort}...`);
    setTimeout(() => listenOn(nextPort), 100);
    return;
  }
  throw err;
});

listenOn(PORT);
