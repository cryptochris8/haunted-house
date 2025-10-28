/**
 * HAUNTED CASTLE - "Five-Minute Fright"
 * HYTOPIA FEAR Game Jam 2025
 *
 * A horror survival game where players must collect 3 keys
 * and escape before time runs out or the zombie catches them!
 */

import {
  startServer,
  Audio,
  DefaultPlayerEntity,
  PlayerEvent,
  PlayerUIEvent,
  Entity,
  EntityEvent,
  RigidBodyType,
  World,
  Player,
  type Vec3,
} from 'hytopia';

import hauntedCastleMap from './assets/maps/haunted-castle.json';
import gameConfig from './config.json';

// ============================================================================
// GAME STATE
// ============================================================================

interface GameState {
  keysCollected: number;
  lives: number;
  timeLeft: number;
  gameOver: boolean;
  gateUnlocked: boolean;
}

const playerStates = new Map<string, GameState>();

function getPlayerState(player: Player): GameState {
  if (!playerStates.has(player.id)) {
    playerStates.set(player.id, {
      keysCollected: 0,
      lives: gameConfig.player.lives,
      timeLeft: gameConfig.roundSeconds,
      gameOver: false,
      gateUnlocked: false,
    });
  }
  return playerStates.get(player.id)!;
}

// ============================================================================
// KEY POSITIONS (manually set these based on your castle layout)
// ============================================================================

const KEY_POSITIONS: Vec3[] = [
  { x: 45.6, y: 35, z: -23.6 },  // Key 1 - Right tower area
  { x: -30.2, y: 47, z: -1.7 },  // Key 2 - Left upper level
  { x: 25.6, y: 59, z: 22.0 },   // Key 3 - High tower (hardest!)
];

// ============================================================================
// ZOMBIE WAYPOINTS (set these based on your castle patrol routes)
// ============================================================================

const ZOMBIE_WAYPOINTS: Vec3[] = [
  { x: 5.1, y: 21.8, z: -3.9 },    // Bottom of middle stairway
  { x: 5.5, y: 33.8, z: 18.6 },    // Mid stairway
  { x: 6.2, y: 57.8, z: 46.9 },    // Top of stairway
  { x: 45.6, y: 33.8, z: -23.4 },  // Near Key 1
  { x: -30.0, y: 45.8, z: -1.2 },  // Near Key 2
  { x: 25.1, y: 57.8, z: 20.7 },   // Near Key 3
  { x: 5.0, y: 21.8, z: -26.2 },   // Bottom - completes loop
];

// ============================================================================
// GATE POSITION
// ============================================================================

const GATE_POSITION: Vec3 = { x: 5.2, y: 21.8, z: -15.8 };

// ============================================================================
// WIN ZONE (where players escape)
// ============================================================================

const WIN_ZONE_POSITION: Vec3 = { x: 4.4, y: 21.8, z: -49.4 };
const WIN_ZONE_SIZE: Vec3 = { x: 4, y: 4, z: 4 };

// ============================================================================
// MAIN SERVER
// ============================================================================

startServer(world => {
  console.log('🏰 Haunted Castle: Five-Minute Fright - Starting...');

  // Load the haunted castle map
  world.loadMap(hauntedCastleMap);

  // Enable debug rendering if needed (disable for production)
  // world.simulation.enableDebugRendering(true);

  // Set spooky nighttime atmosphere with custom space skybox
  world.setSkyboxUri('skyboxes/space'); // Load custom space skybox
  world.setSkyboxIntensity(0.3); // Adjust brightness for space skybox
  world.setAmbientLightIntensity(0.25); // Dark ambient lighting
  world.setAmbientLightColor({ r: 40, g: 40, b: 70 }); // Dark blue tint
  world.setDirectionalLightIntensity(0.15); // Dim moonlight
  world.setDirectionalLightColor({ r: 60, g: 60, b: 100 }); // Cool moonlight

  // Spawn keys in the world
  spawnKeys(world);

  // Spawn the gate
  spawnGate(world);

  // Spawn the zombie
  spawnZombie(world);

  // Create win zone trigger
  createWinZone(world);

  // Handle player joining
  world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
    console.log(`Player ${player.username} joined the game`);

    // Initialize player state
    const state = getPlayerState(player);
    state.keysCollected = 0;
    state.lives = gameConfig.player.lives;
    state.timeLeft = gameConfig.roundSeconds;
    state.gameOver = false;
    state.gateUnlocked = false;

    // Create player entity
    const playerEntity = new DefaultPlayerEntity({
      player,
      name: player.username,
    });

    // Spawn player at castle entrance
    playerEntity.spawn(world, { x: 13, y: 22, z: -56 });

    // Load UI
    player.ui.load('ui/index.html');

    // Send initial HUD data
    updatePlayerHUD(player);

    // Welcome messages
    world.chatManager.sendPlayerMessage(player, '🏰 Welcome to the Haunted Castle!', 'FF0000');
    world.chatManager.sendPlayerMessage(player, '🔑 Collect 3 keys to unlock the gate', 'FFAA00');
    world.chatManager.sendPlayerMessage(player, '🧟 Avoid the zombie! You have 3 lives', 'FF00FF');
    world.chatManager.sendPlayerMessage(player, '⏱️ You have 5 minutes to escape!', 'FF0000');

    // Start player timer
    startPlayerTimer(world, player);

    // DEBUG: Show player position every 2 seconds
    const positionLogger = setInterval(() => {
      const entities = world.entityManager.getPlayerEntitiesByPlayer(player);
      if (entities.length > 0) {
        const pos = entities[0].position;
        console.log(`[${player.username}] Position: x:${pos.x.toFixed(1)}, y:${pos.y.toFixed(1)}, z:${pos.z.toFixed(1)}`);

        // Auto-rescue if player falls too far
        if (pos.y < 10) {
          entities[0].setPosition({ x: 13, y: 22, z: -56 });
          world.chatManager.sendPlayerMessage(player, '🆘 Rescued from falling!', 'FFAA00');
        }
      }
    }, 2000);

    // Handle UI interactions
    player.ui.on(PlayerUIEvent.DATA, ({ data }) => {
      if (data.action === 'interact_key') {
        // Key pickup handled by entity collision
      }
    });
  });

  // Handle player leaving
  world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
    console.log(`Player ${player.username} left the game`);
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
    playerStates.delete(player.id);
  });

  // Add /unstuck command for players stuck in walls
  world.chatManager.registerCommand('/unstuck', player => {
    const entities = world.entityManager.getPlayerEntitiesByPlayer(player);
    if (entities.length > 0) {
      entities[0].setPosition({ x: 13, y: 22, z: -56 });
      world.chatManager.sendPlayerMessage(player, '🆘 Teleported back to spawn!', '00FF00');
    }
  });

  // Ambient music
  new Audio({
    uri: 'audio/music/haunted-ambience.mp3',
    loop: true,
    volume: 0.05, // Lower volume for spooky atmosphere
  }).play(world);

  console.log('🏰 Haunted Castle is ready! Waiting for players...');
});

// ============================================================================
// KEY SPAWNING
// ============================================================================

function spawnKeys(world: World) {
  KEY_POSITIONS.forEach((pos, index) => {
    const key = new Entity({
      name: `Key_${index + 1}`,
      // Using creepy eye model as collectible keys - very horror themed!
      modelUri: 'models/items/creepy-eye.gltf',
      modelScale: 2.5, // Larger for better visibility
      modelEmissiveIntensity: 2.0, // Make it glow bright red
      tintColor: { r: 255, g: 100, b: 100 }, // Bright red tint for visibility
      rigidBodyOptions: {
        type: RigidBodyType.KINEMATIC_POSITION,
      },
    });

    key.spawn(world, pos);

    // Make key rotate slowly for spooky effect
    key.rotationVelocity = { x: 0, y: 1, z: 0 };

    // Handle key pickup
    key.on(EntityEvent.ENTITY_COLLISION, ({ otherEntity, started }) => {
      if (!started) return;

      // Check if collided with player entity
      const playerEntity = otherEntity as any;
      if (playerEntity.player) {
        const player = playerEntity.player as Player;
        const state = getPlayerState(player);

        if (!state.gameOver && state.keysCollected < gameConfig.totalKeys) {
          // Collect key
          state.keysCollected++;
          key.despawn();

          // Play pickup sound
          new Audio({
            uri: 'audio/sfx/pop.mp3',
            volume: 0.5,
            position: key.position,
          }).play(world);

          // Send message
          world.chatManager.sendPlayerMessage(
            player,
            `🔑 Key collected! (${state.keysCollected}/${gameConfig.totalKeys})`,
            'FFD700'
          );

          // Update HUD
          updatePlayerHUD(player);

          // Check if all keys collected
          if (state.keysCollected === gameConfig.totalKeys) {
            state.gateUnlocked = true;
            world.chatManager.sendPlayerMessage(
              player,
              '🚪 The gate has unlocked! Run to the exit!',
              '00FF00'
            );
          }
        }
      }
    });
  });
}

// ============================================================================
// GATE SPAWNING
// ============================================================================

function spawnGate(world: World) {
  const gate = new Entity({
    name: 'Castle_Gate',
    blockTextureUri: 'blocks/iron-bars.png',
    blockHalfExtents: { x: 2, y: 3, z: 0.2 },
    rigidBodyOptions: {
      type: RigidBodyType.FIXED,
    },
  });

  gate.spawn(world, GATE_POSITION);

  // Check periodically if gate should open
  setInterval(() => {
    // Iterate through all player states
    playerStates.forEach((state, playerId) => {
      if (state.gateUnlocked && gate.isSpawned) {
        gate.despawn();
        new Audio({
          uri: 'audio/sfx/door-open.mp3',
          volume: 0.7,
          position: GATE_POSITION,
        }).play(world);
      }
    });
  }, 100);
}

// ============================================================================
// ZOMBIE AI
// ============================================================================

function spawnZombie(world: World) {
  const zombie = new Entity({
    name: 'The_Warden',
    // Using zombie model as the menacing Warden
    modelUri: 'models/npcs/zombie.gltf',
    modelScale: 1.5, // Larger for better visibility and intimidation
    modelEmissiveIntensity: 1.2, // Brighter glow so it's visible in dark castle
    tintColor: { r: 150, g: 255, b: 150 }, // Eerie green zombie glow
    rigidBodyOptions: {
      type: RigidBodyType.KINEMATIC_VELOCITY,
    },
  });

  console.log('🧟 Spawning The Warden at:', ZOMBIE_WAYPOINTS[0]);
  zombie.spawn(world, ZOMBIE_WAYPOINTS[0]);
  console.log('🧟 The Warden spawned successfully!');

  let currentWaypoint = 0;
  let chasing: Player | null = null;
  let tickCount = 0;

  // Zombie AI tick
  setInterval(() => {
    if (!zombie.isSpawned) {
      console.log('⚠️ Warning: Zombie is not spawned!');
      return;
    }

    // Log position every 25 ticks (5 seconds) for debugging
    tickCount++;
    if (tickCount % 25 === 0) {
      console.log(`🧟 Zombie position: x=${zombie.position.x.toFixed(1)}, y=${zombie.position.y.toFixed(1)}, z=${zombie.position.z.toFixed(1)} | Waypoint ${currentWaypoint}/${ZOMBIE_WAYPOINTS.length} | Chasing: ${chasing ? 'YES' : 'NO'}`);
    }

    // Find nearest player
    let nearestPlayer: Player | null = null;
    let nearestDistance = Infinity;
    let nearestPlayerEntity: any = null;

    // Get all player entities in the world
    const allPlayerEntities = world.entityManager.getAllPlayerEntities();

    for (const playerEntity of allPlayerEntities) {
      if (playerEntity.player) {
        const distance = calculateDistance(zombie.position, playerEntity.position);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPlayer = playerEntity.player;
          nearestPlayerEntity = playerEntity;
        }
      }
    }

    // Chase logic
    if (nearestPlayer && nearestPlayerEntity && nearestDistance < gameConfig.zombie.sightRange) {
      if (!chasing) {
        chasing = nearestPlayer;
      }

      // Move toward player
      const direction = normalize({
        x: nearestPlayerEntity.position.x - zombie.position.x,
        y: 0,
        z: nearestPlayerEntity.position.z - zombie.position.z,
      });

      zombie.setLinearVelocity({
        x: direction.x * gameConfig.zombie.chaseSpeed,
        y: 0,
        z: direction.z * gameConfig.zombie.chaseSpeed,
      });

      // Check if caught player
      if (nearestDistance < 2) {
        catchPlayer(world, nearestPlayer, zombie);
      }

      // Lost player
      if (nearestDistance > gameConfig.zombie.loseRange) {
        chasing = null;
      }
    } else {
      // Patrol mode
      chasing = null;
      const target = ZOMBIE_WAYPOINTS[currentWaypoint];
      const distance = calculateDistance(zombie.position, target);

      if (distance < 1) {
        currentWaypoint = (currentWaypoint + 1) % ZOMBIE_WAYPOINTS.length;
      } else {
        const direction = normalize({
          x: target.x - zombie.position.x,
          y: 0,
          z: target.z - zombie.position.z,
        });

        zombie.setLinearVelocity({
          x: direction.x * gameConfig.zombie.walkSpeed,
          y: 0,
          z: direction.z * gameConfig.zombie.walkSpeed,
        });
      }
    }
  }, 200);
}

function catchPlayer(world: World, player: Player, zombie: Entity) {
  const state = getPlayerState(player);

  if (state.gameOver) return;

  state.lives--;

  // Play jumpscare sound
  new Audio({
    uri: 'audio/sfx/hit.mp3',
    volume: 0.8,
    position: zombie.position,
  }).play(world);

  // Send message
  world.chatManager.sendPlayerMessage(
    player,
    `👻 The Warden caught you! Lives remaining: ${state.lives}`,
    'FF0000'
  );

  // Update HUD
  updatePlayerHUD(player);

  // Respawn player
  const playerEntities = world.entityManager.getPlayerEntitiesByPlayer(player);
  if (playerEntities.length > 0) {
    playerEntities[0].setPosition({ x: 13, y: 22, z: -56 });
  }

  // Check game over
  if (state.lives <= 0) {
    endGame(world, player, false, 'The Warden claimed you...');
  }

  // Stun zombie briefly
  zombie.setLinearVelocity({ x: 0, y: 0, z: 0 });
  setTimeout(() => {
    // Zombie resumes after stun
  }, gameConfig.zombie.stunSeconds * 1000);
}

// ============================================================================
// WIN ZONE
// ============================================================================

function createWinZone(world: World) {
  const winZone = new Entity({
    name: 'Win_Zone',
    blockTextureUri: 'blocks/glass.png',
    blockHalfExtents: WIN_ZONE_SIZE,
    rigidBodyOptions: {
      type: RigidBodyType.FIXED,
      isSensor: true,
    },
  });

  winZone.spawn(world, WIN_ZONE_POSITION);
  winZone.visible = false; // Invisible trigger

  // Check for players entering win zone
  winZone.on(EntityEvent.ENTITY_COLLISION, ({ otherEntity, started }) => {
    if (!started) return;

    const playerEntity = otherEntity as any;
    if (playerEntity.player) {
      const player = playerEntity.player as Player;
      const state = getPlayerState(player);

      if (state.gateUnlocked && !state.gameOver) {
        endGame(world, player, true, 'You escaped the haunted castle!');
      } else if (!state.gateUnlocked) {
        world.chatManager.sendPlayerMessage(
          player,
          '🔒 The gate is still locked! Find all the keys first!',
          'FF0000'
        );
      }
    }
  });
}

// ============================================================================
// TIMER SYSTEM
// ============================================================================

function startPlayerTimer(world: World, player: Player) {
  const interval = setInterval(() => {
    const state = getPlayerState(player);

    if (state.gameOver) {
      clearInterval(interval);
      return;
    }

    state.timeLeft--;
    updatePlayerHUD(player);

    // Time warnings
    if (state.timeLeft === 60) {
      world.chatManager.sendPlayerMessage(player, '⏱️ 1 minute remaining!', 'FF0000');
    } else if (state.timeLeft === 30) {
      world.chatManager.sendPlayerMessage(player, '⏱️ 30 seconds remaining!', 'FF0000');
    } else if (state.timeLeft === 10) {
      world.chatManager.sendPlayerMessage(player, '⏱️ 10 seconds!', 'FF0000');
    }

    // Time's up
    if (state.timeLeft <= 0) {
      clearInterval(interval);
      endGame(world, player, false, 'Time ran out!');
    }
  }, 1000);
}

// ============================================================================
// GAME END
// ============================================================================

function endGame(world: World, player: Player, won: boolean, message: string) {
  const state = getPlayerState(player);
  state.gameOver = true;

  if (won) {
    world.chatManager.sendPlayerMessage(player, `🎉 ${message}`, '00FF00');
    player.ui.sendData({ type: 'game-end', won: true, message });
  } else {
    world.chatManager.sendPlayerMessage(player, `💀 ${message}`, 'FF0000');
    player.ui.sendData({ type: 'game-end', won: false, message });
  }

  // Offer restart after delay
  setTimeout(() => {
    world.chatManager.sendPlayerMessage(player, 'Restarting in 3 seconds...', 'FFFF00');

    setTimeout(() => {
      // Reset player state
      playerStates.delete(player.id);
      const newState = getPlayerState(player);

      // Respawn player
      const playerEntities = world.entityManager.getPlayerEntitiesByPlayer(player);
      if (playerEntities.length > 0) {
        playerEntities[0].setPosition({ x: 13, y: 22, z: -56 });
      }

      // Update HUD
      updatePlayerHUD(player);

      // Restart timer
      startPlayerTimer(world, player);

      world.chatManager.sendPlayerMessage(player, 'Game restarted! Good luck!', '00FF00');
    }, 3000);
  }, 2000);
}

// ============================================================================
// HUD UPDATES
// ============================================================================

function updatePlayerHUD(player: Player) {
  const state = getPlayerState(player);

  const minutes = Math.floor(state.timeLeft / 60);
  const seconds = state.timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  player.ui.sendData({
    type: 'hud-update',
    keys: `${state.keysCollected}/${gameConfig.totalKeys}`,
    timer: timeString,
    lives: state.lives,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateDistance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalize(v: Vec3): Vec3 {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length,
  };
}
