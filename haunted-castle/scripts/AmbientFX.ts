// AmbientFX.ts — random flickers, whispers, thunder
const System = { delay(s:number,cb:()=>void){ setTimeout(cb, s*1000); } };
const Screen = { flicker(_sec:number){ /* TODO */ } };
const Audio = { play2D(_id:string){ /* TODO */ } };
const Lighting = { flash(_intensity:number){ /* TODO */ } };
const Doors = { randomSlam(){ /* TODO */ } };
const Portraits = { randomEyesFollow(){ /* TODO */ } };
const Spiders = { dropRandom(){ /* TODO */ } };

export const AmbientFX = {
  startRNG(){ randomLoop(); thunderLoop(); }
};

function randomLoop(){
  const gap = rand(12,25);
  System.delay(gap, () => {
    const pick = randInt(0,3);
    switch(pick){
      case 0: Screen.flicker(0.25); Audio.play2D("sfx/whisper"); break;
      case 1: Doors.randomSlam(); break;
      case 2: Portraits.randomEyesFollow(); break;
      case 3: Spiders.dropRandom(); break;
    }
    randomLoop();
  });
}

function thunderLoop(){
  const gap = rand(8,18);
  System.delay(gap, () => { Lighting.flash(0.4); Audio.play2D("sfx/thunder"); thunderLoop(); });
}

function rand(a:number,b:number){ return a + Math.random()*(b-a); }
function randInt(a:number,b:number){ return Math.floor(rand(a,b+1)); }
