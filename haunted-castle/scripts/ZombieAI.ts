// ZombieAI.ts — simple patrol + chase using distance checks
// @ts-ignore
import cfg from "../config/game.json";
import { Events } from "./GameManager";

// Adapters
export function Component(_name: string){ return function(_: any){} }
export class Entity {
  position = {x:0,y:0,z:0};
  moveToward(_pos: any, _speed: number){ /* TODO */ }
  distanceTo(target: any){
    const dx = (this.position.x - target.position.x);
    const dy = (this.position.y - target.position.y);
    const dz = (this.position.z - target.position.z);
    return Math.hypot(dx,dy,dz);
  }
  overlaps(_other: any){ return false; /* TODO */ }
  disableMovement(_seconds: number){ /* TODO */ }
  makeIntangible(_v: boolean){ /* TODO */ }
  playLoop(_anim: string){ /* TODO */ }
}
const System = { every(s:number,cb:()=>void){ setInterval(cb, s*1000); } };
const World = {
  find(_name: string): Entity | null { return null; /* TODO: lookup waypoint */ }
};
const Player = { get(){ return { position: {x:0,y:0,z:0} } } };
const Audio = { playAt(_e:any,_id:string){ /* TODO */ } };
const Camera = { vignette(_i:number){ /* TODO */ } };

@Component("ZombieAI")
export class ZombieAI {
  waypoints: string[] = [];
  private state: "patrol"|"chase" = "patrol";
  private current = 0;

  onStart(self: Entity){
    self.makeIntangible(true);
    self.playLoop("zombie_idle");
    System.every(0.2, () => this.tick(self));
  }

  private tick(self: Entity){
    const player = Player.get();
    const d = this.distance(self.position, player.position);

    if (this.state === "patrol"){
      if (d < cfg.zombie.sightRange) this.toChase(self);
      else this.followNext(self, cfg.zombie.walkSpeed);
    } else {
      if (d > cfg.zombie.loseRange) this.toPatrol();
      else self.moveToward(player.position, cfg.zombie.chaseSpeed);
      if (self.overlaps(player)) this.catchPlayer(self);
    }

    if (d < 8) Camera.vignette(0.45); else Camera.vignette(0.25);
  }

  private followNext(self: Entity, speed: number){
    if (!this.waypoints.length) return;
    const name = this.waypoints[this.current];
    const wp = World.find(name);
    if (!wp) return;
    if (self.distanceTo(wp) < 0.7) this.current = (this.current + 1) % this.waypoints.length;
    self.moveToward(wp.position, speed);
  }

  private toChase(self: Entity){ this.state = "chase"; Audio.playAt(self, "sfx/zombie_notice"); }
  private toPatrol(){ this.state = "patrol"; }

  private catchPlayer(self: Entity){
    self.disableMovement(cfg.zombie.stunSeconds);
    Events.playerCaught.emit();
  }

  private distance(a:any,b:any){
    const dx=a.x-b.x, dy=a.y-b.y, dz=a.z-b.z; return Math.hypot(dx,dy,dz);
  }
}
