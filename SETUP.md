# Haunted Castle - Setup & Configuration Guide

## 🎉 Your Game is Ready to Test!

I've integrated all the game systems into your Haunted Castle project. Here's what's been done and what you need to do next.

## ✅ What's Complete

1. **Main Game File** (`index.ts`)
   - Full Hytopia SDK integration
   - Game state management
   - Timer system
   - Key collection logic
   - Ghost AI with patrol and chase behavior
   - Gate unlocking system
   - Win/lose conditions
   - Auto-restart functionality

2. **User Interface** (`assets/ui/index.html`)
   - Real-time HUD showing timer, keys collected, and lives
   - Game end screen (win/lose)
   - Mobile controls
   - Haunted castle theme with dark red styling

3. **Configuration** (`config/game.json`)
   - Game balance settings
   - Ghost AI parameters
   - Player settings

4. **TypeScript Config** Updated to support JSON imports

## ⚠️ Important: Positions Need Adjustment

The game is functional, but you need to **adjust the spawn positions** based on your actual castle layout:

### 1. Key Positions (index.ts lines 56-60)
```typescript
const KEY_POSITIONS: Vec3[] = [
  { x: 10, y: -15, z: 20 },  // Key 1 - Update these coordinates
  { x: -5, y: -10, z: 35 },  // Key 2 - Update these coordinates
  { x: 25, y: -20, z: 15 },  // Key 3 - Update these coordinates
];
```

**How to find good positions:**
1. Run the game server
2. Enable debug rendering (uncomment line 97 in index.ts)
3. Walk to locations where you want keys
4. Note the coordinates from the console/debug view
5. Update KEY_POSITIONS array

### 2. Ghost Waypoints (index.ts lines 66-72)
```typescript
const GHOST_WAYPOINTS: Vec3[] = [
  { x: 0, y: -15, z: 25 },   // Waypoint 1 - Update
  { x: 15, y: -15, z: 30 },  // Waypoint 2 - Update
  { x: 15, y: -15, z: 10 },  // Waypoint 3 - Update
  { x: -10, y: -15, z: 10 }, // Waypoint 4 - Update
  { x: -10, y: -15, z: 30 }, // Waypoint 5 - Update
];
```

**Tips for waypoints:**
- Create a patrol route through main areas
- Use 5-8 waypoints
- Make sure Y coordinate matches your floor level
- Test that ghost can reach all waypoints

### 3. Gate Position (index.ts line 78)
```typescript
const GATE_POSITION: Vec3 = { x: 0, y: -13, z: 5 };
```

Place this at your castle's main entrance/exit.

### 4. Win Zone Position (index.ts lines 84-85)
```typescript
const WIN_ZONE_POSITION: Vec3 = { x: 0, y: -12, z: 0 };
const WIN_ZONE_SIZE: Vec3 = { x: 3, y: 3, z: 3 };
```

Place this at the escape point (outside the castle gates).

### 5. Player Spawn Position (index.ts line 131)
```typescript
playerEntity.spawn(world, { x: 0, y: -10, z: -10 });
```

This is where players start. Put it at the castle entrance.

## 🚀 How to Run

```bash
# Start the game server
npx hytopia dev
```

## 🎮 Testing Checklist

1. **Map Loads**: Verify haunted-castle.json loads correctly
2. **Player Spawns**: Check spawn position is safe (not in a wall)
3. **Keys Visible**: All 3 keys should spawn and be reachable
4. **Key Pickup**: Walk into keys to collect them
5. **HUD Updates**: Timer counts down, key count increases
6. **Gate Opens**: After 3 keys, gate should despawn
7. **Ghost Patrols**: Ghost should move between waypoints
8. **Ghost Chases**: Ghost should chase when you get close
9. **Ghost Catches**: Ghost reduces lives when it catches you
10. **Win Condition**: Walking through win zone after collecting keys
11. **Lose Conditions**: Timer runs out OR 3 lives lost
12. **Auto Restart**: Game restarts 5 seconds after end

## 🐛 Troubleshooting

### Keys Not Appearing
- Check if models/key.gltf exists in your assets
- Try using a block entity instead:
  ```typescript
  blockTextureUri: 'blocks/gold-block.png',
  blockHalfExtents: { x: 0.3, y: 0.3, z: 0.3 },
  ```

### Ghost Not Appearing
- Check if models/ghost.gltf exists
- Try using a different model like 'models/npcs/skeleton.gltf'
- Or use a block entity for testing

### Position Finding Tip
Enable debug rendering and add this to see your current position:
```typescript
world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
  setInterval(() => {
    const entities = world.entityManager.getPlayerEntitiesByPlayer(player);
    if (entities.length > 0) {
      const pos = entities[0].position;
      console.log(`Player at: x:${pos.x.toFixed(1)}, y:${pos.y.toFixed(1)}, z:${pos.z.toFixed(1)}`);
    }
  }, 1000);
});
```

## 🎨 Asset Requirements

The game expects these assets (use placeholders if missing):

### Models
- `models/key.gltf` - Collectible key (or use block entity)
- `models/ghost.gltf` - The Warden enemy (or use skeleton model)

### Audio
- `audio/music/hytopia-main.mp3` - Background music
- `audio/sfx/pop.mp3` - Key pickup sound
- `audio/sfx/hit.mp3` - Ghost catch sound
- `audio/sfx/door-open.mp3` - Gate opening sound

**Missing assets?** The game will still run, just without that specific audio/model.

## 🎯 Game Balance

You can adjust these in `config/game.json`:

```json
{
  "roundSeconds": 300,        // 5 minutes
  "totalKeys": 3,             // Number of keys
  "ghost": {
    "walkSpeed": 1.4,         // Patrol speed
    "chaseSpeed": 2.6,        // Chase speed (faster than player sprint)
    "sightRange": 12.0,       // Detection range
    "loseRange": 18.0,        // When ghost gives up chase
    "stunSeconds": 2.0        // Stun after catching player
  },
  "player": {
    "lives": 3,               // Starting lives
    "slowOnFear": 0.75,       // Not currently implemented
    "fearVignette": true      // Not currently implemented
  }
}
```

## 🏆 Next Steps for Polish

Once the game is working:

1. **Add Lighting**
   - Use PointLights at torch positions
   - Reduce ambient light for atmosphere
   - Add spotlight for ghost

2. **Add Sound Effects**
   - Ambient whispers
   - Footsteps
   - Door creaks
   - Thunder

3. **Polish Ghost AI**
   - Add animations (walk, chase, attack)
   - Add sound when ghost notices player
   - Add particle effects

4. **Add Visual Effects**
   - Particle effects for key pickup
   - Screen flash when caught
   - Vignette effect when ghost is near

5. **Optimize Positions**
   - Fine-tune key placement for difficulty
   - Adjust ghost patrol route
   - Test multiplayer balance

## 📝 Notes

- The game uses a **per-player state system** - multiple players can play simultaneously
- Each player has their own timer, keys, and lives
- The ghost will chase the nearest player
- Gate opens independently for each player when they collect all keys
- Auto-restart happens per-player after 5 seconds

## 🎃 Good Luck with Your Game Jam!

Your haunted castle game is ready to scare players! Just adjust the positions and you're good to go! 👻🏰
