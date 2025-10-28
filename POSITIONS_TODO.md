# 📍 Position Configuration Checklist

Use this file to track the positions you need to configure in `index.ts`.

## Step 1: Find Your Castle Floor Level

Walk around your castle and note the Y coordinate where you can walk. This is your floor level.

**My Castle Floor Y Level:** `_______`

## Step 2: Player Spawn (Starting Position)

Find a safe starting location (castle entrance, outside gates, etc.)

**Location:** Castle Entrance
**Coordinates:**
- X: `_______`
- Y: `_______` (use floor level)
- Z: `_______`

**Update in index.ts line 131**

## Step 3: Key Positions (3 keys needed)

### Key 1 (Easy - Courtyard or Entry Hall)
**Location:** `_______________________`
**Coordinates:**
- X: `_______`
- Y: `_______` (floor level + 2)
- Z: `_______`

### Key 2 (Medium - Upper Level or Side Room)
**Location:** `_______________________`
**Coordinates:**
- X: `_______`
- Y: `_______` (floor level + 2)
- Z: `_______`

### Key 3 (Hard - Furthest Point or Dangerous Area)
**Location:** `_______________________`
**Coordinates:**
- X: `_______`
- Y: `_______` (floor level + 2)
- Z: `_______`

**Update in index.ts lines 56-60**

## Step 4: Ghost Patrol Waypoints (5-8 points)

Create a patrol route that covers main areas of the castle.

### Waypoint 1
- X: `_______`
- Y: `_______` (floor level)
- Z: `_______`

### Waypoint 2
- X: `_______`
- Y: `_______` (floor level)
- Z: `_______`

### Waypoint 3
- X: `_______`
- Y: `_______` (floor level)
- Z: `_______`

### Waypoint 4
- X: `_______`
- Y: `_______` (floor level)
- Z: `_______`

### Waypoint 5
- X: `_______`
- Y: `_______` (floor level)
- Z: `_______`

### Waypoint 6 (Optional)
- X: `_______`
- Y: `_______` (floor level)
- Z: `_______`

### Waypoint 7 (Optional)
- X: `_______`
- Y: `_______` (floor level)
- Z: `_______`

### Waypoint 8 (Optional)
- X: `_______`
- Y: `_______` (floor level)
- Z: `_______`

**Update in index.ts lines 66-72**

## Step 5: Gate Position

Where is your castle's main gate/exit?

**Location:** `_______________________`
**Coordinates:**
- X: `_______`
- Y: `_______` (floor level)
- Z: `_______`

**Update in index.ts line 78**

## Step 6: Win Zone (Escape Point)

Where do players escape to? (Usually just outside the gate)

**Location:** `_______________________`
**Coordinates:**
- X: `_______`
- Y: `_______` (floor level)
- Z: `_______`

**Size:** (Default is 3x3x3, adjust if needed)
- X: `_______`
- Y: `_______`
- Z: `_______`

**Update in index.ts lines 84-85**

## Quick Copy-Paste Template

Once you have all coordinates, use this template to quickly update index.ts:

```typescript
// KEY POSITIONS
const KEY_POSITIONS: Vec3[] = [
  { x: ___, y: ___, z: ___ },  // Key 1
  { x: ___, y: ___, z: ___ },  // Key 2
  { x: ___, y: ___, z: ___ },  // Key 3
];

// GHOST WAYPOINTS
const GHOST_WAYPOINTS: Vec3[] = [
  { x: ___, y: ___, z: ___ },  // Waypoint 1
  { x: ___, y: ___, z: ___ },  // Waypoint 2
  { x: ___, y: ___, z: ___ },  // Waypoint 3
  { x: ___, y: ___, z: ___ },  // Waypoint 4
  { x: ___, y: ___, z: ___ },  // Waypoint 5
];

// GATE POSITION
const GATE_POSITION: Vec3 = { x: ___, y: ___, z: ___ };

// WIN ZONE
const WIN_ZONE_POSITION: Vec3 = { x: ___, y: ___, z: ___ };

// PLAYER SPAWN (in PlayerEvent.JOINED_WORLD handler, line 131)
playerEntity.spawn(world, { x: ___, y: ___, z: ___ });
```

## Tips for Finding Coordinates

1. **Enable Debug Mode:**
   - Uncomment line 97 in index.ts: `world.simulation.enableDebugRendering(true);`

2. **Add Position Logger:**
   Add this code after line 145 in index.ts to see your position in console:
   ```typescript
   setInterval(() => {
     const entities = world.entityManager.getPlayerEntitiesByPlayer(player);
     if (entities.length > 0) {
       const pos = entities[0].position;
       console.log(`Position: x:${pos.x.toFixed(1)}, y:${pos.y.toFixed(1)}, z:${pos.z.toFixed(1)}`);
     }
   }, 2000);
   ```

3. **Walk to Each Location:**
   - Walk to where you want a key/waypoint/gate
   - Look at console output
   - Write down the coordinates
   - Update index.ts

4. **Test Incrementally:**
   - Update one thing at a time
   - Test after each change
   - Adjust as needed
