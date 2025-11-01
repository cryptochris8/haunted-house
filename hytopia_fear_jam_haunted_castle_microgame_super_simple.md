# README.md — Haunted Castle: "Five‑Minute Fright"

A lightweight, ready‑to‑drop Hytopia mini‑game built for the **FEAR Game Jam**.

---

## 🎯 Concept
Collect **3 glowing keys** scattered throughout a haunted castle and escape before the **Warden** (a roaming ghost) finds you. You have 5 minutes to survive.

- 🔑 Find keys → unlock the gate → run to the drawbridge.
- 👻 Avoid the ghost — get caught 3 times and you’re done.
- ⏱️ Simple timer, simple scares, all atmosphere.

---

## 🗂️ Project Structure
```
haunted-castle/
│
├── README.md                # This file
├── config/
│   └── game.json            # Game configuration settings
├── scripts/
│   ├── GameManager.ts       # Handles keys, timer, win/loss
│   ├── GhostAI.ts           # Controls ghost patrol + chase
│   ├── KeyPickup.ts         # Allows player to collect keys
│   ├── GateLock.ts          # Unlocks the portcullis after 3 keys
│   └── AmbientFX.ts         # Optional random scary effects
├── assets/                  # Place Hytopia spooky props here
├── ui/                      # Optional HUD or icon files
│   └── hud.png
└── game.json                # Optional duplicate config reference
```

---

## ⚙️ Configuration — `config/game.json`
```json
{
  "roundSeconds": 300,
  "totalKeys": 3,
  "ghost": {
    "walkSpeed": 1.4,
    "chaseSpeed": 2.6,
    "sightRange": 12.0,
    "loseRange": 18.0,
    "stunSeconds": 2.0
  },
  "player": {
    "lives": 3,
    "slowOnFear": 0.75,
    "fearVignette": true
  },
  "rngEvents": {
    "minGapSec": 12,
    "maxGapSec": 25
  }
}
```

---

## 🧩 How to Use
1. **Import your castle map** into Hytopia Creator.
2. **Drop scripts** into your `scripts/` folder.
3. **Add components** to entities:
   - Keys → `KeyPickup`
   - Gate → `GateLock`
   - Ghost → `GhostAI`
   - Main Controller → `GameManager` (+ optional `AmbientFX`)
4. **Tag waypoints** for ghost patrol.
5. **Add trigger** named `win_zone` on drawbridge.
6. **Test** by collecting keys and unlocking the gate.

---

## 🧙 Script Descriptions
- **GameManager.ts** — Core loop: timer, UI, win/lose logic.
- **KeyPickup.ts** — Makes glowing keys collectible.
- **GateLock.ts** — Unlocks and animates the gate when all keys are found.
- **GhostAI.ts** — Basic patrol/chase logic; emits `playerCaught` event.
- **AmbientFX.ts** — Optional flickers, whispers, thunder, door slams.

---

## 🕹️ Controls
| Action | Key |
|--------|-----|
| Move   | WASD |
| Interact | E |
| Sprint | Shift |
| Escape | Exit menu |

---

## 🎨 Asset Suggestions
Use built‑in **spooky props** like:
- Torches, fog planes, cobwebs, skulls, coffins, chandeliers.
- Portraits, thunder, candles with flicker animations.
- Ghost models, fog volumes, and sound ambience from the Hytopia pack.

---

## 🧠 Tips
- Reduce lighting for atmosphere.
- Use fog and narrow corridors to create tension.
- Add random ambient sounds for extra fear factor.

---

## 🏁 Submission Checklist
- [x] Title: **Five‑Minute Fright (Haunted Castle)**
- [x] Description: *Collect three keys and escape the haunted castle before the ghost finds you.*
- [x] Playable in ≤ 5 minutes.
- [x] Uses only Hytopia’s built‑in assets.
- [x] Runs at 60 FPS.

---

## 💡 Credits
- **Design & Code:** Chris Campbell
- **Concept & Documentation:** GPT‑5 Collaboration
- **Built For:** Hytopia FEAR Game Jam 2025

---

## 🔮 Next Steps
- Add ambient whispers, flickering candles, or a sanity mechanic.
- Submit screenshots showing gate, keys, ghost chase, and escape.

---

## 🏰 Summary
A fully playable, super‑simple haunted micro‑game ready for the jam. Drag in your assets, paste in the scripts, and you’re live!

