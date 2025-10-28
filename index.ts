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
  ParticleEmitter,
  PersistenceManager,
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
  score: number;
  finalScore: number;
}

interface LeaderboardEntry {
  playerName: string;
  score: number;
  keysCollected: number;
  livesRemaining: number;
  timeRemaining: number;
  timestamp: number;
}

const playerStates = new Map<string, GameState>();
const gameLeaderboard: LeaderboardEntry[] = [];

function getPlayerState(player: Player): GameState {
  if (!playerStates.has(player.id)) {
    playerStates.set(player.id, {
      keysCollected: 0,
      lives: gameConfig.player.lives,
      timeLeft: gameConfig.roundSeconds,
      gameOver: false,
      gateUnlocked: false,
      score: 0,
      finalScore: 0,
    });
  }
  return playerStates.get(player.id)!;
}

// ============================================================================
// SCORING SYSTEM
// ============================================================================

function calculateScore(state: GameState, won: boolean): number {
  let score = 0;

  // Base score for completing (only if won)
  if (won) {
    score += 1000;
  }

  // Time bonus: 10 points per second remaining
  score += state.timeLeft * 10;

  // Lives bonus: 500 points per life remaining
  score += state.lives * 500;

  // Keys collected: 300 points per key
  score += state.keysCollected * 300;

  // Perfect run bonus: all 3 lives + won game
  if (won && state.lives === 3) {
    score += 2000;
  }

  return Math.max(0, score); // Never negative
}

async function addToLeaderboard(playerName: string, state: GameState) {
  const entry: LeaderboardEntry = {
    playerName,
    score: state.finalScore,
    keysCollected: state.keysCollected,
    livesRemaining: state.lives,
    timeRemaining: state.timeLeft,
    timestamp: Date.now(),
  };

  gameLeaderboard.push(entry);

  // Sort by score descending
  gameLeaderboard.sort((a, b) => b.score - a.score);

  // Keep only top 10
  if (gameLeaderboard.length > 10) {
    gameLeaderboard.splice(10);
  }

  console.log(`📊 ${playerName} added to leaderboard with score: ${state.finalScore}`);

  // Save to persistent storage
  try {
    await PersistenceManager.instance.setGlobalData('leaderboard', gameLeaderboard);
    console.log(`💾 Leaderboard saved to persistent storage`);
  } catch (error) {
    console.error(`❌ Failed to save leaderboard:`, error);
  }
}

function getTopTenLeaderboard(): LeaderboardEntry[] {
  return gameLeaderboard.slice(0, 10);
}

// ============================================================================
// KEY POSITIONS (manually set these based on your castle layout)
// ============================================================================

const KEY_POSITIONS: Vec3[] = [
  { x: 41.3, y: 33.8, z: -12.9 },  // Key 1 - Safer location on upper level
  { x: -30.2, y: 47, z: -1.7 },  // Key 2 - Left upper level
  { x: 25.6, y: 59, z: 22.0 },   // Key 3 - High tower (hardest!)
];

// ============================================================================
// ZOMBIE WAYPOINTS (multi-floor patrol route with stairwell navigation)
// ============================================================================

const ZOMBIE_WAYPOINTS: Vec3[] = [
  // GROUND FLOOR PATROL (y: 21.8)
  { x: 5.1, y: 21.8, z: -3.9 },     // Start - Bottom of middle stairway
  { x: 5.0, y: 21.8, z: -26.2 },    // Near gate area
  { x: 5.0, y: 21.8, z: -40.0 },    // Near win zone
  { x: -15.0, y: 21.8, z: -5.0 },   // West side ground floor
  { x: 15.0, y: 21.8, z: 5.0 },     // East side ground floor

  // STAIRS UP - Transition to second floor
  { x: 5.1, y: 26.0, z: 2.0 },      // Lower stairs
  { x: 5.3, y: 30.0, z: 8.0 },      // Mid stairs

  // SECOND FLOOR PATROL (y: 33.8)
  { x: 5.5, y: 33.8, z: 13.6 },     // Top of main stairs
  { x: 38.0, y: 33.8, z: -10.0 },   // Approach to Key 1 area (right side)
  { x: 43.0, y: 33.8, z: -13.0 },   // Near Key 1
  { x: 10.0, y: 33.8, z: -8.0 },    // Central second floor
  { x: -20.0, y: 33.8, z: 0.0 },    // Left side second floor

  // STAIRS UP - Transition to upper levels
  { x: -25.0, y: 39.0, z: -1.0 },   // Stairs to Key 2 level

  // UPPER LEVEL PATROL (y: 45.8)
  { x: -30.0, y: 45.8, z: -1.2 },   // Near Key 2
  { x: -28.0, y: 45.8, z: 3.0 },    // Key 2 area patrol

  // STAIRS TO TOWER
  { x: 10.0, y: 50.0, z: 15.0 },    // Stairs toward tower

  // TOWER LEVEL (y: 57.8-59)
  { x: 20.7, y: 57.8, z: 13.5 },    // Tower approach
  { x: 25.1, y: 57.8, z: 20.7 },    // Near Key 3
  { x: 23.0, y: 58.0, z: 17.0 },    // Tower patrol

  // DESCENT - Back down to ground floor
  { x: 8.0, y: 50.0, z: 20.0 },     // Start descent
  { x: 6.0, y: 40.0, z: 15.0 },     // Mid descent
  { x: 5.5, y: 30.0, z: 10.0 },     // Lower descent
  { x: 5.1, y: 21.8, z: 0.0 },      // Back to ground - loop complete
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

startServer(async world => {
  console.log('🏰 Haunted Castle: Five-Minute Fright - Starting...');

  // Load persisted leaderboard
  try {
    const savedLeaderboard = await PersistenceManager.instance.getGlobalData('leaderboard');
    if (savedLeaderboard && Array.isArray(savedLeaderboard)) {
      gameLeaderboard.length = 0; // Clear the array
      gameLeaderboard.push(...savedLeaderboard);
      console.log(`📊 Loaded ${gameLeaderboard.length} entries from persistent leaderboard`);
    } else {
      console.log('📊 No existing leaderboard found, starting fresh');
    }
  } catch (error) {
    console.error('❌ Failed to load leaderboard:', error);
    console.log('📊 Starting with empty leaderboard');
  }

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

  // Spawn atmospheric decorations
  spawnDecorativeSkeletons(world);
  spawnFlyingBats(world);
  spawnDecorativeSpiders(world);
  spawnAtmosphericSmoke(world);

  // Start skeleton proximity sound check
  startSkeletonProximitySounds(world);

  // Create escape doorway openings
  createEscapeDoorways(world);

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
    state.score = 0;
    state.finalScore = 0;

    // Create player entity
    const playerEntity = new DefaultPlayerEntity({
      player,
      name: player.username,
    });

    // Spawn player near Key 1 (safer starting position)
    playerEntity.spawn(world, { x: 13, y: 22, z: -56 });

    // Load UI
    player.ui.load('ui/index.html');

    // Send initial HUD data (but don't start timer yet)
    updatePlayerHUD(player);

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
      if (data.type === 'start-game') {
        // Player clicked "Enter the Castle" button
        console.log(`${player.username} started the game`);

        // Welcome messages
        world.chatManager.sendPlayerMessage(player, '🏰 Welcome to the Haunted Castle!', 'FF0000');
        world.chatManager.sendPlayerMessage(player, '🔑 Collect 3 keys to unlock the gate', 'FFAA00');
        world.chatManager.sendPlayerMessage(player, '🧟 Avoid the zombie! You have 3 lives', 'FF00FF');
        world.chatManager.sendPlayerMessage(player, '⏱️ You have 5 minutes to escape!', 'FF0000');

        // Start the timer
        startPlayerTimer(world, player);
      }

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
    // Create visual key model
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

    // Create invisible collision trigger for reliable pickup detection
    const keyTrigger = new Entity({
      name: `Key_Trigger_${index + 1}`,
      // Invisible collision sphere around the key
      modelUri: 'models/items/creepy-eye.gltf',
      modelScale: 3.0, // Slightly larger than visual key
      modelOpacity: 0, // Make it invisible
      rigidBodyOptions: {
        type: RigidBodyType.SENSOR, // Sensor type for trigger detection
      },
    });

    keyTrigger.spawn(world, pos);

    // Handle key pickup on the trigger (more reliable than model collision)
    keyTrigger.on(EntityEvent.ENTITY_COLLISION, ({ otherEntity, started }) => {
      if (!started) return;

      // Check if collided with player entity
      const playerEntity = otherEntity as any;
      if (playerEntity.player) {
        const player = playerEntity.player as Player;
        const state = getPlayerState(player);

        if (!state.gameOver && state.keysCollected < gameConfig.totalKeys) {
          // Collect key
          state.keysCollected++;

          // Despawn both visual key and trigger
          key.despawn();
          keyTrigger.despawn();

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
              '🚪 The gate is now unlocked! Run quickly to the golden beacon platform! 🏆',
              '00FF00'
            );
          }
        }
      }
    });
  });
}

// ============================================================================
// DECORATIVE ATMOSPHERIC ENTITIES
// ============================================================================

function spawnDecorativeSkeletons(world: World) {
  // Skeleton positions near each key for spooky atmosphere
  const skeletonPositions: Vec3[] = [
    // Near Key 1 - Position: x:41.3, y:33.8, z:-12.9
    { x: 39.5, y: 33.8, z: -13.5 },
    { x: 43.0, y: 33.8, z: -12.0 },

    // Near Key 2 - Position: x:-30.0, y:45.8, z:2.1
    { x: -32.0, y: 45.8, z: 1.0 },
    { x: -28.5, y: 45.8, z: 3.5 },

    // Near Key 3 - Position: x:20.7, y:57.8, z:13.5
    { x: 19.0, y: 57.8, z: 12.0 },
    { x: 22.5, y: 57.8, z: 15.0 },
  ];

  skeletonPositions.forEach((pos, index) => {
    const skeleton = new Entity({
      name: `Decorative_Skeleton_${index + 1}`,
      modelUri: 'models/npcs/skeleton.gltf',
      modelScale: 0.9, // Slightly smaller for decoration
      modelLoopedAnimations: ['walk'], // Walking animation
      modelEmissiveIntensity: 0.3, // Subtle glow
      tintColor: { r: 180, g: 180, b: 200 }, // Pale bone color
      rigidBodyOptions: {
        type: RigidBodyType.KINEMATIC_VELOCITY, // Moves but not affected by physics
      },
    });

    skeleton.spawn(world, pos);

    // Store skeleton for proximity checking
    decorativeSkeletons.push(skeleton);

    // Make skeleton intangible (no collision with player)
    skeleton.setCollisionGroupsForSolidColliders({
      belongsTo: [],
      collidesWith: [],
    });

    // Give skeleton slow random wandering movement
    const changeDirection = () => {
      if (skeleton.isSpawned) {
        const randomAngle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.2; // Very slow (0.3-0.5)
        skeleton.setLinearVelocity({
          x: Math.cos(randomAngle) * speed,
          y: 0,
          z: Math.sin(randomAngle) * speed,
        });
      }
    };

    // Initial movement
    changeDirection();

    // Change direction every 8-12 seconds for slow wandering
    setInterval(() => {
      changeDirection();
    }, 8000 + Math.random() * 4000);

    console.log(`💀 Spawned wandering skeleton at x:${pos.x}, y:${pos.y}, z:${pos.z}`);
  });
}

function startSkeletonProximitySounds(world: World) {
  // Check proximity to all skeletons for all players every 2 seconds
  setInterval(() => {
    const allPlayerEntities = world.entityManager.getAllPlayerEntities();

    for (const playerEntity of allPlayerEntities) {
      if (!playerEntity.player) continue;

      const playerId = playerEntity.player.id;
      const now = Date.now();
      const lastPlayTime = skeletonProximitySoundCooldown.get(playerId) || 0;

      // Only check if cooldown has elapsed
      if (now - lastPlayTime < SKELETON_PROXIMITY_SOUND_COOLDOWN_MS) continue;

      // Find closest skeleton
      let closestDistance = Infinity;
      let closestSkeleton: Entity | null = null;

      for (const skeleton of decorativeSkeletons) {
        if (!skeleton.isSpawned) continue;

        const distance = calculateDistance(skeleton.position, playerEntity.position);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestSkeleton = skeleton;
        }
      }

      // Play sound if close enough to any skeleton
      if (closestSkeleton && closestDistance < SKELETON_PROXIMITY_DISTANCE) {
        new Audio({
          uri: 'sounds/sfx/skeleton.wav',
          volume: Math.max(0.2, 0.7 - (closestDistance / SKELETON_PROXIMITY_DISTANCE)), // Quieter than zombie
          position: closestSkeleton.position,
        }).play(world);

        skeletonProximitySoundCooldown.set(playerId, now);
        console.log(`💀 Skeleton sound played for ${playerEntity.player.username} at distance ${closestDistance.toFixed(1)}`);
      }
    }
  }, 2000); // Check every 2 seconds
}

function spawnFlyingBats(world: World) {
  // Bat flight paths throughout the castle
  const batPaths: { start: Vec3; velocity: Vec3 }[] = [
    // Bat 1 - Flying through middle stairway
    {
      start: { x: 10, y: 45, z: 5 },
      velocity: { x: -1.5, y: 0.2, z: 1.8 }
    },
    // Bat 2 - Circling right tower
    {
      start: { x: 50, y: 40, z: -20 },
      velocity: { x: -1.2, y: 0.3, z: -1.5 }
    },
    // Bat 3 - Flying through left area
    {
      start: { x: -35, y: 50, z: 10 },
      velocity: { x: 1.8, y: -0.2, z: -1.3 }
    },
    // Bat 4 - High tower area
    {
      start: { x: 20, y: 62, z: 30 },
      velocity: { x: 1.0, y: -0.3, z: -1.7 }
    },
    // Bat 5 - Lower entrance area
    {
      start: { x: 0, y: 25, z: -40 },
      velocity: { x: 1.5, y: 0.4, z: 1.2 }
    },
  ];

  batPaths.forEach((batPath, index) => {
    const bat = new Entity({
      name: `Flying_Bat_${index + 1}`,
      modelUri: 'models/npcs/bat.gltf',
      modelScale: 1.2,
      modelLoopedAnimations: ['fly'], // Flying animation
      rigidBodyOptions: {
        type: RigidBodyType.KINEMATIC_VELOCITY,
        linearVelocity: batPath.velocity,
      },
    });

    bat.spawn(world, batPath.start);

    // Make bat change direction randomly every 5-8 seconds for organic movement
    setInterval(() => {
      if (bat.isSpawned) {
        const randomAngle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 0.5;
        bat.setLinearVelocity({
          x: Math.cos(randomAngle) * speed,
          y: (Math.random() - 0.5) * 0.6,
          z: Math.sin(randomAngle) * speed,
        });
      }
    }, 5000 + Math.random() * 3000);

    console.log(`🦇 Spawned flying bat at x:${batPath.start.x}, y:${batPath.start.y}, z:${batPath.start.z}`);
  });
}

function spawnDecorativeSpiders(world: World) {
  // Spider positions in dark corners and near keys for creepy atmosphere
  const spiderPositions: Vec3[] = [
    // Near Key 1 - Position: x:41.3, y:33.8, z:-12.9
    { x: 40.0, y: 33.8, z: -14.0 },
    { x: 42.5, y: 33.8, z: -11.5 },

    // Near Key 2 - Position: x:-30.0, y:45.8, z:2.1
    { x: -31.5, y: 45.8, z: 0.8 },
    { x: -28.8, y: 45.8, z: 3.2 },

    // Near Key 3 - Position: x:20.7, y:57.8, z:13.5
    { x: 19.5, y: 57.8, z: 12.5 },
    { x: 21.8, y: 57.8, z: 14.8 },
  ];

  spiderPositions.forEach((pos, index) => {
    const spider = new Entity({
      name: `Decorative_Spider_${index + 1}`,
      modelUri: 'models/npcs/spider.gltf',
      modelScale: 0.6, // Smaller, creepier
      modelLoopedAnimations: ['walk'], // Walking animation
      rigidBodyOptions: {
        type: RigidBodyType.KINEMATIC_VELOCITY, // Moves but not affected by physics
      },
    });

    spider.spawn(world, pos);

    // Make spider intangible (no collision with player)
    spider.setCollisionGroupsForSolidColliders({
      belongsTo: [],
      collidesWith: [],
    });

    // Give spider slow creepy crawling movement
    const changeDirection = () => {
      if (spider.isSpawned) {
        const randomAngle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.15; // Very slow crawling (0.2-0.35)
        spider.setLinearVelocity({
          x: Math.cos(randomAngle) * speed,
          y: 0,
          z: Math.sin(randomAngle) * speed,
        });
      }
    };

    // Initial movement
    changeDirection();

    // Change direction every 6-10 seconds for creepy crawling
    setInterval(() => {
      changeDirection();
    }, 6000 + Math.random() * 4000);

    console.log(`🕷️ Spawned crawling spider at x:${pos.x}, y:${pos.y}, z:${pos.z}`);
  });
}

function spawnAtmosphericSmoke(world: World) {
  // Eerie green fog near Key 1 (x:41.3, y:33.8, z:-12.9)
  const key1Smoke = new ParticleEmitter({
    textureUri: 'particles/smoke.png',
    colorStart: { r: 100, g: 200, b: 100 }, // Eerie green
    colorEnd: { r: 50, g: 100, b: 50 },
    opacityStart: 0.4,
    opacityEnd: 0,
    sizeStart: 2,
    sizeEnd: 8,
    lifetime: 6,
    lifetimeVariance: 2,
    rate: 15,
    position: { x: 41.3, y: 34, z: -12.9 }, // Key 1 area
    velocity: { x: 0, y: 1, z: 0 },
    velocityVariance: { x: 0.5, y: 0.3, z: 0.5 },
  });
  key1Smoke.spawn(world);

  // Dark purple fog near Key 2 (x:-30.0, y:45.8, z:2.1)
  const key2Smoke = new ParticleEmitter({
    textureUri: 'particles/magic.png',
    colorStart: { r: 150, g: 100, b: 200 }, // Purple mystical
    colorEnd: { r: 100, g: 50, b: 150 },
    opacityStart: 0.4,
    opacityEnd: 0,
    sizeStart: 2.5,
    sizeEnd: 7,
    lifetime: 7,
    lifetimeVariance: 2,
    rate: 12,
    position: { x: -30.0, y: 46, z: 2.1 }, // Key 2 area
    velocity: { x: 0, y: 1, z: 0 },
    velocityVariance: { x: 0.6, y: 0.4, z: 0.6 },
  });
  key2Smoke.spawn(world);

  // Blue mystical fog near Key 3 (x:20.7, y:57.8, z:13.5)
  const key3Smoke = new ParticleEmitter({
    textureUri: 'particles/magic.png',
    colorStart: { r: 100, g: 150, b: 255 }, // Blue mystical
    colorEnd: { r: 50, g: 100, b: 200 },
    opacityStart: 0.4,
    opacityEnd: 0,
    sizeStart: 2,
    sizeEnd: 7,
    lifetime: 6,
    lifetimeVariance: 2,
    rate: 12,
    position: { x: 20.7, y: 58, z: 13.5 }, // Key 3 area
    velocity: { x: 0, y: 1.2, z: 0 },
    velocityVariance: { x: 0.5, y: 0.4, z: 0.5 },
  });
  key3Smoke.spawn(world);

  // Golden/yellow victory beacon at win zone (x:4.4, y:21.8, z:-49.4)
  const winZoneBeacon = new ParticleEmitter({
    textureUri: 'particles/magic.png',
    colorStart: { r: 255, g: 215, b: 100 }, // Golden yellow
    colorEnd: { r: 200, g: 150, b: 50 },
    opacityStart: 0.5,
    opacityEnd: 0,
    sizeStart: 3,
    sizeEnd: 9,
    lifetime: 8,
    lifetimeVariance: 2,
    rate: 18,
    position: { x: 4.4, y: 22, z: -49.4 }, // Win zone - guides players to escape!
    velocity: { x: 0, y: 1.5, z: 0 },
    velocityVariance: { x: 0.7, y: 0.5, z: 0.7 },
  });
  winZoneBeacon.spawn(world);

  console.log(`💨 Spawned 4 atmospheric particle effects: 3 near keys + 1 golden beacon at win zone`);
}

// ============================================================================
// GATE SPAWNING
// ============================================================================

function spawnGate(world: World) {
  const gate = new Entity({
    name: 'Castle_Gate',
    blockTextureUri: 'blocks/oak-log',
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

// Track last time proximity sound played for each player (to prevent spam)
const zombieProximitySoundCooldown = new Map<string, number>();
const skeletonProximitySoundCooldown = new Map<string, number>();
const PROXIMITY_SOUND_COOLDOWN_MS = 8000; // Play sound every 8 seconds max
const SKELETON_PROXIMITY_SOUND_COOLDOWN_MS = 10000; // Play skeleton sound every 10 seconds max
const PROXIMITY_DISTANCE = 12; // Play sound when zombie is within 12 blocks
const SKELETON_PROXIMITY_DISTANCE = 8; // Play sound when skeleton is within 8 blocks

// Store skeleton entities for proximity checking
const decorativeSkeletons: Entity[] = [];

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

        // Play proximity sound if zombie is within 12 blocks
        if (distance < PROXIMITY_DISTANCE) {
          const playerId = playerEntity.player.id;
          const now = Date.now();
          const lastPlayTime = zombieProximitySoundCooldown.get(playerId) || 0;

          // Only play if cooldown has elapsed
          if (now - lastPlayTime > PROXIMITY_SOUND_COOLDOWN_MS) {
            new Audio({
              uri: 'sounds/sfx/Zombie.wav',
              volume: Math.max(0.3, 1.0 - (distance / PROXIMITY_DISTANCE)), // Louder when closer
              position: zombie.position,
            }).play(world);

            zombieProximitySoundCooldown.set(playerId, now);
          }
        }
      }
    }

    // Chase logic
    if (nearestPlayer && nearestPlayerEntity && nearestDistance < gameConfig.zombie.sightRange) {
      if (!chasing) {
        chasing = nearestPlayer;
      }

      // Check if player is on a different floor (vertical distance > 5 blocks)
      const verticalDistance = Math.abs(nearestPlayerEntity.position.y - zombie.position.y);
      const playerIsOnDifferentFloor = verticalDistance > 5;

      // Speed boost: 3.5x normal speed during chase (2.6 -> 3.5)
      const chaseSpeedMultiplier = playerIsOnDifferentFloor ? 1.5 : 1.35;
      const effectiveChaseSpeed = gameConfig.zombie.chaseSpeed * chaseSpeedMultiplier;

      if (playerIsOnDifferentFloor) {
        // Player on different floor - navigate to closest stairwell waypoint
        let closestWaypoint = ZOMBIE_WAYPOINTS[currentWaypoint];
        let closestWaypointIndex = currentWaypoint;
        let closestWaypointDistance = Infinity;

        // Find waypoint that gets us closer to player's vertical position
        for (let i = 0; i < ZOMBIE_WAYPOINTS.length; i++) {
          const waypoint = ZOMBIE_WAYPOINTS[i];
          const waypointToPlayerDistance = calculateDistance(waypoint, nearestPlayerEntity.position);
          const zombieToWaypointDistance = calculateDistance(zombie.position, waypoint);

          // Prefer waypoints that are closer to player's height and nearby
          if (zombieToWaypointDistance < 30 && waypointToPlayerDistance < closestWaypointDistance) {
            closestWaypointDistance = waypointToPlayerDistance;
            closestWaypoint = waypoint;
            closestWaypointIndex = i;
          }
        }

        // Navigate toward the waypoint that brings us closer to player
        const waypointDirection = normalize({
          x: closestWaypoint.x - zombie.position.x,
          y: closestWaypoint.y - zombie.position.y,
          z: closestWaypoint.z - zombie.position.z,
        });

        zombie.setLinearVelocity({
          x: waypointDirection.x * effectiveChaseSpeed,
          y: waypointDirection.y * effectiveChaseSpeed * 0.5, // Slower vertical movement
          z: waypointDirection.z * effectiveChaseSpeed,
        });

        // Update current waypoint if we reached it
        if (calculateDistance(zombie.position, closestWaypoint) < 2) {
          currentWaypoint = closestWaypointIndex;
        }
      } else {
        // Player on same floor - direct pursuit
        const direction = normalize({
          x: nearestPlayerEntity.position.x - zombie.position.x,
          y: 0,
          z: nearestPlayerEntity.position.z - zombie.position.z,
        });

        zombie.setLinearVelocity({
          x: direction.x * effectiveChaseSpeed,
          y: 0,
          z: direction.z * effectiveChaseSpeed,
        });
      }

      // Check if caught player (same floor only)
      if (nearestDistance < 2 && verticalDistance < 3) {
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

      if (distance < 1.5) {
        currentWaypoint = (currentWaypoint + 1) % ZOMBIE_WAYPOINTS.length;
      } else {
        // Include vertical movement for multi-floor patrol
        const verticalDistance = Math.abs(target.y - zombie.position.y);
        const isClimbingStairs = verticalDistance > 2;

        const direction = normalize({
          x: target.x - zombie.position.x,
          y: isClimbingStairs ? (target.y - zombie.position.y) : 0,
          z: target.z - zombie.position.z,
        });

        zombie.setLinearVelocity({
          x: direction.x * gameConfig.zombie.walkSpeed,
          y: isClimbingStairs ? direction.y * gameConfig.zombie.walkSpeed * 0.4 : 0,
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
// ESCAPE DOORWAYS
// ============================================================================

function createEscapeDoorways(world: World) {
  console.log(`🚪 Fixing stair gaps and creating escape routes...`);

  // FIX 1: Fill in stair gaps where players fall through (x:46.1, y:30.8, z:-17.6)
  // Add solid floor blocks around the problem stairs area
  const stairGapFills = [
    // Fill gaps in stairs near Key 1
    { x: 45, y: 30, z: -18 },
    { x: 46, y: 30, z: -18 },
    { x: 47, y: 30, z: -18 },
    { x: 45, y: 30, z: -17 },
    { x: 46, y: 30, z: -17 },
    { x: 47, y: 30, z: -17 },
    { x: 45, y: 31, z: -18 },
    { x: 46, y: 31, z: -18 },
    { x: 47, y: 31, z: -18 },
    { x: 45, y: 31, z: -17 },
    { x: 46, y: 31, z: -17 },
    { x: 47, y: 31, z: -17 },
  ];

  stairGapFills.forEach(pos => {
    // Use block ID 5 (cobblestone) to fill gaps
    world.chunkLattice.setBlock(pos, 5);
  });

  console.log(`✓ Filled ${stairGapFills.length} stair gaps to prevent falling through`);

  // FIX 2: Escape doorway at lower level (for anyone already stuck)
  // Doorway at y:22 level where players land when they fall
  const doorway1Center = { x: 44, y: 22, z: -19 };

  // Clear blocks for doorway (2 wide x 3 tall)
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const blockPos = {
        x: doorway1Center.x + dx,
        y: doorway1Center.y + dy,
        z: doorway1Center.z
      };

      // Remove block (set to 0 = air)
      world.chunkLattice.setBlock(blockPos, 0);
    }
  }

  console.log(`✓ Escape doorway created at x:${doorway1Center.x}, y:${doorway1Center.y}, z:${doorway1Center.z}`);

  // FIX 3: Additional escape doorway on opposite wall
  const doorway2Center = { x: 46, y: 22, z: -16 };

  // Clear blocks for second doorway
  for (let dy = 0; dy < 3; dy++) {
    for (let dz = 0; dz < 2; dz++) {
      const blockPos = {
        x: doorway2Center.x,
        y: doorway2Center.y + dy,
        z: doorway2Center.z + dz
      };

      world.chunkLattice.setBlock(blockPos, 0);
    }
  }

  console.log(`✓ Second escape doorway created at x:${doorway2Center.x}, y:${doorway2Center.y}, z:${doorway2Center.z}`);
  console.log(`🏗️ Total fixes: filled stair gaps + 2 escape doorways`);
}

// ============================================================================
// WIN ZONE
// ============================================================================

function createWinZone(world: World) {
  // Create a sandy/golden victory platform
  const winPlatform = new Entity({
    name: 'Win_Platform',
    blockTextureUri: 'blocks/sand.png',
    blockHalfExtents: { x: 2, y: 0.2, z: 2 }, // Thin 4x4 platform
    rigidBodyOptions: {
      type: RigidBodyType.FIXED,
      isSensor: true, // Trigger so player can detect win
    },
  });

  winPlatform.spawn(world, WIN_ZONE_POSITION);

  // Check for players entering win zone
  winPlatform.on(EntityEvent.ENTITY_COLLISION, ({ otherEntity, started }) => {
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

  console.log('🏁 Sandy victory platform created at gate exit');
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

async function endGame(world: World, player: Player, won: boolean, message: string) {
  const state = getPlayerState(player);
  state.gameOver = true;

  // Calculate final score
  state.finalScore = calculateScore(state, won);

  // Add to leaderboard and save
  await addToLeaderboard(player.username, state);

  // Get top 10 for display
  const topTen = getTopTenLeaderboard();

  if (won) {
    world.chatManager.sendPlayerMessage(player, `🎉 ${message} | Score: ${state.finalScore}`, '00FF00');
    player.ui.sendData({
      type: 'game-end',
      won: true,
      message,
      score: state.finalScore,
      leaderboard: topTen
    });
  } else {
    world.chatManager.sendPlayerMessage(player, `💀 ${message} | Score: ${state.finalScore}`, 'FF0000');
    player.ui.sendData({
      type: 'game-end',
      won: false,
      message,
      score: state.finalScore,
      leaderboard: topTen
    });
  }

  // Offer restart after delay (10 seconds total to view leaderboard)
  setTimeout(() => {
    world.chatManager.sendPlayerMessage(player, 'Ready for another round?', 'FFFF00');

    setTimeout(() => {
      // Reset player state
      playerStates.delete(player.id);
      const newState = getPlayerState(player);

      // Respawn player at start
      const playerEntities = world.entityManager.getPlayerEntitiesByPlayer(player);
      if (playerEntities.length > 0) {
        playerEntities[0].setPosition({ x: 13, y: 22, z: -56 });
      }

      // Update HUD (timer will start when player clicks "Enter the Castle" again)
      updatePlayerHUD(player);

      world.chatManager.sendPlayerMessage(player, 'Click "Enter the Castle" to play again!', '00FF00');
    }, 3000);
  }, 7000);
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
