# Shadowfighter

Server-authoritative 3D-styled multiplayer space fighter prototype for up to 6 concurrent fighters.

## What is implemented

- 6-fighter real-time PvP simulation (`battle-royale` primary mode) with bot fill.
- Server-authoritative movement, hit detection, projectiles, and combat actions.
- Futuristic cosmic arena with:
  - Open combat center (no black-hole hazard)
  - Floating asteroid belt collisions
  - Nebula fog zones
  - Gravity distortion zones that curve projectiles
  - Random galaxy events: solar storm, asteroid rain, gravity flux, nebula surge
- Weapons:
  - Plasma cannons (unlimited, precision, low damage)
  - Photon missiles (energy cost, optional higher-energy overcharge)
- Abilities:
  - Warp Dash (blind / stable, energy-based)
  - Gravity Shift (missile-curving defense)
- Resources:
  - Energy-only action system (all combat actions are free of monetary cost)
- HUD + minimap + lock-on + marked-player system.
- Real OBJ fighter mesh loaded from `public/assets/shadowfighter.obj` (hull/canopy/fins/engine groups) replacing the procedural ship.
- Deterministic automation hooks:
  - `window.render_game_to_text()`
  - `window.advanceTime(ms)`

## Run

```bash
npm run dev
```

Open:

- [http://127.0.0.1:5173](http://127.0.0.1:5173)

## Controls

- Move: `W/S` thrust, `A/D` strafe, `R/G` lift
- Aim: `Arrow keys` or trackpad drag, barrel roll `Q/E`
- Boost: `Shift`
- Plasma: `Left Mouse` or `J`
- Missile: `Right Mouse` (or two-finger click on trackpad) or `K`
- Missile overcharge: hold `O` or `L` + fire missile
- Warp Dash: `Z` blind, `X` stable
- Gravity Shift: `C`
- Gravity Pulse: `H` (energy ability that pulls nearby ships/missiles)
- Camera mode toggle: `V` (TPP/FPP)
- Quick turn: `Space`
- Lock nearest target: `T`
- Emergency energy refill: `B`
- Fullscreen: `F`

## Technical notes

- No external runtime dependencies.
- Custom WebSocket implementation on Node `http` upgrade path.
- Authoritative server tick: 30 Hz.
- Client renders a perspective-projected 3D scene on a single `<canvas>`.
- Central black-hole hazard is removed for cleaner dogfight flow.

## Current scope and next steps

This prototype delivers the requested core loop and systems in a lightweight stack.
For production quality and scale, next upgrades should include:

1. Dedicated session/lobby services and matchmaking.
2. Stronger anti-cheat telemetry and authoritative reconciliation tooling.
3. Interpolation/lag compensation improvements and packet compression.
4. Asset pipeline (true 3D models, VFX, animation states, audio mix).
5. Replay system, spectator cameras, ranked persistence, and tournament flow.
