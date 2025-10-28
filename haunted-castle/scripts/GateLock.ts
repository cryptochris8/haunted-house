// GateLock.ts — locks portcullis until all keys are collected
import { Events } from "./GameManager";

// Adapters
const Audio = { playAt(_e:any,_id:string){ /* TODO */ } };

export function Component(_name: string){ return function(_: any){} }
export class Entity {
  animate(_name: string){ /* TODO */ }
  setLocked(_locked: boolean){ /* TODO */ }
}

@Component("GateLock")
export class GateLock {
  gateId = "front_gate"; // optional tag you can use in your scene graph

  onReady(gate: Entity){
    gate.setLocked(true);
    Events.gateOpened.connect(() => {
      gate.setLocked(false);
      gate.animate("open");
      Audio.playAt(gate, "sfx/gate_open");
    });
  }
}
