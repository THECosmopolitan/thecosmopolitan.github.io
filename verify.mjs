import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('script.js', import.meta.url),'utf8');
class Element extends EventTarget {
  constructor(){super();this.hidden=true;this.paused=true;this.open=false;this.attrs={};this.muted=false;this.style={};}
  setAttribute(k,v){this.attrs[k]=v;}
  play(){if(this.fail)return Promise.reject(new Error('blocked'));this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  showModal(){this.open=true;}
  close(){this.open=false;this.dispatchEvent(new Event('close'));}
}
function create(){
  const ids=['music','film','film-dialog','sound','audio-notice','video-error','open-film','close-film','stardust'];
  const els=Object.fromEntries(ids.map(id=>[id,new Element()]));
  let rotations=0;
  const ctx=new Proxy({}, {get(o,k){if(k==='rotate')return()=>rotations++;return o[k]||(()=>{});},set(o,k,v){o[k]=v;return true;}});
  els.stardust.getContext=()=>ctx;
  const events={};const media=new EventTarget();media.matches=false;
  class AudioContext{constructor(){this.state='running';this.currentTime=0;}resume(){this.state='running';return Promise.resolve();}createGain(){return {gain:{value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}},connect(){return this;}};}createMediaElementSource(){return {connect(g){return g;}};}}
  const sandbox={console,window:{AudioContext},document:{querySelector:q=>els[q.slice(1)],hidden:false,addEventListener:(k,f)=>events[k]=f},matchMedia:()=>media,addEventListener:(k,f)=>events[k]=f,innerWidth:1400,innerHeight:1000,devicePixelRatio:2,performance,requestAnimationFrame:()=>1,cancelAnimationFrame(){}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return {els,events,media,read:s=>vm.runInContext(s,sandbox),rotations:()=>rotations};
}
const tick=()=>new Promise(r=>setImmediate(r));
const a=create();
assert.equal(a.els.music.paused,true,'music must not start on page load');
a.els['open-film'].dispatchEvent(new Event('click'));await tick();
assert.equal(a.els['film-dialog'].open,true);assert.equal(a.read('gain.gain.value'),0,'music must stay silent during film');
a.els.film.dispatchEvent(new Event('ended'));await tick();
assert.equal(a.els['film-dialog'].open,false);assert.equal(a.read('gain.gain.value'),.28,'ended starts fade to moderate level');
a.els.sound.dispatchEvent(new Event('click'));await tick();assert.equal(a.els.music.muted,true);assert.equal(a.read('gain.gain.value'),0);
a.els.sound.dispatchEvent(new Event('click'));await tick();assert.equal(a.els.music.muted,false);assert.equal(a.read('gain.gain.value'),.28);
a.els['open-film'].dispatchEvent(new Event('click'));a.els['close-film'].dispatchEvent(new Event('click'));await tick();assert.equal(a.read('gain.gain.value'),.28,'manual exit restores music');
const n=performance.now();a.events.pointermove({clientX:20,clientY:20,pointerType:'mouse'});a.events.pointermove({clientX:200,clientY:80,pointerType:'mouse'});assert(a.read('particles.length')>0);
a.read('render(performance.now())');assert.equal(a.rotations(),0,'stars must never rotate');
a.read('render(performance.now()+1300)');assert.equal(a.read('particles.length'),0,'trail must expire within 1.2s');
a.media.matches=true;a.media.dispatchEvent(new Event('change'));a.events.pointermove({clientX:250,clientY:80,pointerType:'mouse'});assert.equal(a.read('particles.length'),0,'reduced motion disables particles');
const b=create();b.els.music.fail=true;b.els['open-film'].dispatchEvent(new Event('click'));await tick();b.els['close-film'].dispatchEvent(new Event('click'));await tick();assert.equal(b.els['audio-notice'].hidden,false,'blocked playback must offer retry');
b.els.music.fail=false;b.els.sound.dispatchEvent(new Event('click'));await tick();assert.equal(b.els['audio-notice'].hidden,true);assert.equal(b.read('gain.gain.value'),.28,'retry must recover without recreating media source');
console.log('PASS: silent entry, automatic/manual exit, fade target, mute/unmute, replay, blocked-audio recovery, fixed star orientation, particle expiry, reduced motion.');
