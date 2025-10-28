// KeyPickup.ts — attach to key props; emits keyPicked and destroys itself
import { Events } from "./GameManager";

// Adapter shims (swap with Hytopia APIs)
const Audio = { playAt(_e:any,_id:string){ /* TODO */ } };
const VFX = { playAt(_e:any,_id:string){ /* TODO */ } };

// Example decorator stubs — replace with engine's component system
export function Component(_name: string){ return function(_: any){} }
export class Entity {
  constructor(public position = {x:0,y:0,z:0}){}
  setGlow(_v: number){ /* TODO */ }
  onInteract(_cb: () => void){ /* TODO */ }
  destroy(){ /* TODO */ }
}

@Component("KeyPickup")
export class KeyPickup {
  glow = 2.0; // make visible in dark spaces

  onReady(entity: Entity){
    entity.setGlow(this.glow);
    entity.onInteract(() => this.collect(entity));
  }

  private collect(entity: Entity){
    Audio.playAt(entity, "sfx/key_pickup");
    VFX.playAt(entity, "vfx/spark");
    entity.destroy();
    Events.keyPicked.emit();
  }
}
