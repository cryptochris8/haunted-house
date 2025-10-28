// GameManager.ts — core loop: timer, keys, win/lose, basic UI bindings
// Minimal event signal + light abstractions so you can swap to Hytopia’s SDK quickly.

// @ts-ignore — allow json import via tsconfig ("resolveJsonModule": true)
import cfg from "../config/game.json";

// ----------------- Small Infrastructure -----------------
export class EventSignal<T = void> {
  private fns: Array<(p: T) => void> = [];
  connect(fn: (p: T) => void) { this.fns.push(fn); }
  emit(p: T) { for (const fn of this.fns) fn(p); }
}

// Adapters (replace with Hytopia-specific calls)
const UI = {
  setText(id: string, text: string){ /* TODO: wire to UI */ },
  showCenter(text: string, seconds = 2){ /* TODO */ }
};
const Audio = { play2D(id: string){ /* TODO */ }, playAt(e: any, id: string){ /* TODO */ } };
const Camera = {
  pulseVignette(_intensity = 0.2){ /* TODO */ },
  vignette(_intensity = 0.25){ /* TODO */ }
};
const Screen = { flash(_color = "#8a0000", _sec = 0.5){ /* TODO */ }, flicker(_sec = 0.25){ /* TODO */ } };
const PlayerAPI = {
  get(){ return (globalThis as any).Player?.get?.() ?? { position: {x:0,y:0,z:0} }; },
  respawn(){ /* TODO */ }
};
const Level = { reload(){ /* TODO */ } };
const Triggers = { on(id: string, cb: () => void){ /* TODO: bind trigger*/ } };
const System = {
  onStart(cb: () => void){ queueMicrotask(cb); },
  every(seconds: number, cb: () => void){ setInterval(cb, seconds*1000); },
  delay(seconds: number, cb: () => void){ setTimeout(cb, seconds*1000); }
};

// Expose to other scripts
export const Events = {
  keyPicked: new EventSignal<void>(),
  playerCaught: new EventSignal<void>(),
  gateOpened: new EventSignal<void>()
};

let keysLeft = cfg.totalKeys;
let lives = cfg.player.lives;
let timeLeft = cfg.roundSeconds;
let gameOver = false;

function updateHUD(){
  UI.setText("keys", `${cfg.totalKeys - keysLeft}/${cfg.totalKeys}`);
  UI.setText("timer", format(timeLeft));
}

System.onStart(() => {
  updateHUD();

  // Timer
  System.every(1, () => {
    if (gameOver) return;
    timeLeft--; updateHUD();
    if (timeLeft <= 0) lose("Time ran out");
  });

  // Key picked
  Events.keyPicked.connect(() => {
    keysLeft = Math.max(0, keysLeft - 1);
    Audio.play2D("ui/key");
    Camera.pulseVignette(0.2);
    updateHUD();
    if (keysLeft === 0) Events.gateOpened.emit();
  });

  // Player caught
  Events.playerCaught.connect(() => {
    lives--; Screen.flash("#8a0000", 0.5);
    Audio.play2D("sfx/jumpscare_hit");
    PlayerAPI.respawn();
    if (lives <= 0) lose("The Warden claimed you");
  });

  // Win trigger (place a trigger named "win_zone" in scene)
  Triggers.on("win_zone", () => { if (keysLeft === 0) win(); });

  // Optional ambient
  const Ambient = (globalThis as any).AmbientFX; // set by AmbientFX.ts
  if (Ambient?.startRNG) Ambient.startRNG();
});

function win(){
  if (gameOver) return; gameOver = true;
  Audio.play2D("music/relief");
  UI.showCenter("You Escaped!", 3);
  System.delay(3, () => Level.reload());
}

function lose(msg: string){
  if (gameOver) return; gameOver = true;
  Audio.play2D("music/fail");
  UI.showCenter(msg, 3);
  System.delay(3, () => Level.reload());
}

function format(s: number){
  const m = Math.floor(s/60); const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}
