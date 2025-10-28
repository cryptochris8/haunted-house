# 🚀 Quick Start Guide

## Start the Game

```bash
cd C:\Users\chris\haunted-castle
hytopia start
```

or use the shorter command:

```bash
npx hytopia start
```

## What I Fixed

1. ✅ Moved config from `./config/game.json` to `./config.json`
2. ✅ Added `PlayerUIEvent` import
3. ✅ Changed keys from models to **gold blocks** (visible and work immediately)
4. ✅ Changed ghost from model to **black block** (placeholder that works)

## Current Game Status

The game should now start! However, the **positions are still set to default coordinates** that may not match your castle layout.

## Quick Position Test

When the game starts:

1. **Player Spawn**: You'll spawn at `x:0, y:-10, z:-10`
   - If you spawn in a wall or fall, this needs adjustment

2. **Keys**: Look for 3 spinning gold cubes at:
   - Key 1: `x:10, y:-15, z:20`
   - Key 2: `x:-5, y:-10, z:35`
   - Key 3: `x:25, y:-20, z:15`
   - If you can't see them, they may be in walls or far away

3. **Ghost**: A black floating block at `x:0, y:-15, z:25`
   - Should patrol between 5 waypoints

4. **Gate**: An iron bars block at `x:0, y:-13, z:5`

5. **Win Zone**: Invisible trigger at `x:0, y:-12, z:0`

## If Things Are Wrong

### Can't see anything / spawn in wall
The Y coordinate is probably wrong for your castle's floor level.

**Quick Fix:**
1. Open `index.ts`
2. Find line 131: `playerEntity.spawn(world, { x: 0, y: -10, z: -10 });`
3. Change the `y` value (try -20, -15, -5, etc.)
4. Save and restart

### Keys not visible
They may be spawned inside walls or at wrong height.

**Quick Fix:**
1. Open `index.ts`
2. Find lines 56-60 (KEY_POSITIONS)
3. Change all to simple visible location like:
   ```typescript
   const KEY_POSITIONS: Vec3[] = [
     { x: 0, y: -10, z: 5 },   // Right in front of spawn
     { x: 5, y: -10, z: 5 },   // To the right
     { x: -5, y: -10, z: 5 },  // To the left
   ];
   ```
4. Save and restart

### Ghost not moving
Check waypoints are on walkable ground.

## Debug Mode

Uncomment line 97 in `index.ts` to see physics debug rendering:

```typescript
world.simulation.enableDebugRendering(true);
```

This shows colliders and helps you understand the space.

## View Your Position

Add this code after line 145 to see your current position in the console:

```typescript
// Show position every 2 seconds
setInterval(() => {
  const entities = world.entityManager.getPlayerEntitiesByPlayer(player);
  if (entities.length > 0) {
    const pos = entities[0].position;
    console.log(`Position: x:${pos.x.toFixed(1)}, y:${pos.y.toFixed(1)}, z:${pos.z.toFixed(1)}`);
  }
}, 2000);
```

This will print your coordinates every 2 seconds so you can walk around and find good positions.

## Expected Output

When you start the game, you should see:

```
🏰 Haunted Castle: Five-Minute Fright - Starting...
🏰 Haunted Castle is ready! Waiting for players...
```

Then connect to the game and you should:
- See the HUD (timer, keys, lives)
- Be able to move around
- See 3 spinning gold blocks (keys)
- See a black floating block (ghost)
- Receive welcome messages in chat

## Next Steps

Once the game is running:
1. Use **POSITIONS_TODO.md** to properly configure all positions
2. Walk around your castle and note good key locations
3. Update positions in `index.ts`
4. Test gameplay loop

## Need Help?

Check **SETUP.md** for detailed troubleshooting and configuration guide.

---

**TIP:** Start simple! Get the game running with default positions first, then fine-tune locations to match your castle perfectly.
