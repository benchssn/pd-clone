const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const iconPaths = {
  wave:'<path d="M1 12C5 12 5 4 9 4s4 16 8 16 4-8 6-8"/>',
  square:'<path d="M2 17V6h10v12h10V7"/>', triangle:'<path d="M1 17 6 5l10 14 6-13"/>', sawtooth:'<path d="m2 17 9-12v14l11-14v12"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
  layers:'<path d="m3 8 9-5 9 5-9 5zm0 4 9 5 9-5M3 16l9 5 9-5"/>',grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  sliders:'<path d="M5 3v18m7-18v18m7-18v18M2 8h6m1 8h6m1-11h6"/>',scope:'<rect x="3" y="4" width="18" height="15" rx="2"/><path d="M5 12h4l2-4 3 8 2-4h3m-10 8v2m6-2v2"/>',
  spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5zM20 2v4m-2-2h4"/>',edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>',
  play:'<path d="m7 4 13 8-13 8z" fill="currentColor" stroke-width="0"/>',stop:'<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none"/>',pause:'<path d="M9 5v14m6-14v14" stroke-width="3"/>',
  nodes:'<rect x="2" y="3" width="7" height="7" rx="1"/><rect x="15" y="14" width="7" height="7" rx="1"/><path d="M5 10v7h10m3-3V7H9"/>',book:'<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2z"/>',
  undo:'<path d="m9 4-6 6 6 6M3 10h11a6 6 0 0 1 0 12"/>',redo:'<path d="m15 4 6 6-6 6m6-6H10a6 6 0 0 0 0 12"/>',reset:'<path d="M4 9a8 8 0 1 1 0 6m0-11v5h5"/>',
  merge:'<path d="m3 4 7 8-7 8m7-8h11m-4-4 4 4-4 4"/>',speaker:'<path d="M4 9v6h4l5 4V5L8 9zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',muted:'<path d="M4 9v6h4l5 4V5L8 9zm13 0 5 6m0-6-5 6"/>',external:'<path d="M14 3h7v7m0-7L10 14M9 4H4v16h16v-5"/>',headphones:'<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v8H3zm14 0h4v8h-4z"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>'
};
function icon(name) {return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.wave}</svg>`;}
$$('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const clean = {name:'Untitled patch',a:{type:'sine',freq:220,gain:75,on:true},b:{type:'sine',freq:440,gain:25,on:true},volume:50,muted:false,notes:''};
const waveTypes=[['sine','Sine'],['square','Square'],['triangle','Triangle'],['sawtooth','Saw']];
const defaults = {
  clean, beating:{...structuredClone(clean),name:'Beating waves',a:{type:'sine',freq:220,gain:50,on:true},b:{type:'sine',freq:223,gain:50,on:true},notes:'Two frequencies, just 3 Hz apart. Listen for three gentle pulses per second. Try moving oscillator B closer to A.'},
  harmonics:{...structuredClone(clean),name:'Harmonic playground',a:{type:'square',freq:110,gain:60,on:true},b:{type:'triangle',freq:330,gain:40,on:true},volume:35,notes:'A square wave contains odd harmonics. Switch the scope to Spectrum to see them. The triangle adds a softer third harmonic.'}
};
let patches = structuredClone(defaults), current = 'clean', state, history=[], future=[], grouped=false;
try {const saved=JSON.parse(localStorage.getItem('phase-lab-v1'));if(saved?.patches && Object.values(saved.patches).every(validPatch)){patches=saved.patches;current=patches[saved.current]?saved.current:'clean';}}catch{}
state=structuredClone(patches[current] || clean);
let context, audioNodes, analyser, running=false, frozen=false, mode='wave', frame=0, toastTimer, audioBusy=false;
$$('.waveform-selector').forEach(el=>el.innerHTML=waveTypes.map(([type,label])=>`<button data-wave="${type}" title="${label} wave" aria-label="${el.dataset.osc.toUpperCase()}: ${label} wave" aria-pressed="false">${icon(type==='sine'?'wave':type)}<span>${label}</span></button>`).join(''));
function validPatch(p) {return p && typeof p.name==='string' && p.name.length<=100 && typeof p.notes==='string' && p.notes.length<=100000 && typeof p.muted==='boolean' && Number.isFinite(p.volume) && p.volume>=0 && p.volume<=100 && ['a','b'].every(k=>p[k] && waveTypes.some(([t])=>t===p[k].type) && Number.isFinite(p[k].freq) && p[k].freq>=20 && p[k].freq<=2000 && Number.isFinite(p[k].gain) && p[k].gain>=0 && p[k].gain<=100 && typeof p[k].on==='boolean');}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function save(){patches[current]=structuredClone(state);try{localStorage.setItem('phase-lab-v1',JSON.stringify({patches,current}));$('#saved-status').innerHTML='<span></span>All changes saved';}catch{$('#saved-status').textContent='Browser storage unavailable';}}
function remember(){if(grouped)return;history.push(structuredClone(state));if(history.length>80)history.shift();future=[];updateHistory();}
function updateHistory(){$('#undo').disabled=!history.length;$('#redo').disabled=!future.length;}
function mutate(change,group=false){remember();grouped=group;change();save();render();updateAudio();}
function note(freq){const midi=Math.round(69+12*Math.log2(freq/440));return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][(midi%12+12)%12]+(Math.floor(midi/12)-1);}
function sliderFill(el){el.style.setProperty('--range-progress',`${(el.value-el.min)/(el.max-el.min)*100}%`);}
function render(){
  for(const k of ['a','b']){
    const s=state[k];$(`#freq-${k}`).value=s.freq;$(`#slider-${k}`).value=s.freq;$(`#note-${k}`).textContent=note(s.freq);$(`#gain-${k}`).value=s.gain;$(`#gain-label-${k}`).innerHTML=`${s.gain}<span>%</span>`;
    $$(`[data-osc="${k}"] button`).forEach(b=>{b.classList.toggle('active',b.dataset.wave===s.type);b.setAttribute('aria-pressed',b.dataset.wave===s.type);});
    const toggle=$(`[data-toggle="${k}"]`);toggle.classList.toggle('enabled',s.on);toggle.setAttribute('aria-pressed',s.on);$(`#osc-${k}`).classList.toggle('muted-module',!s.on);
    $(`.cable-${k}`).style.opacity=s.on?'1':'.25';
  }
  $('#master-volume').value=state.volume;$('#master-label').textContent=state.volume;$('#volume-knob').setAttribute('aria-valuenow',state.volume);$('#knob-ring').style.strokeDasharray=`${state.volume/100*198} 264`;$('#knob-tick').style.transform=`rotate(${-135+state.volume/100*270}deg)`;
  $('#mute').innerHTML=icon(state.muted?'muted':'speaker');$('#mute').setAttribute('aria-pressed',state.muted);$('#mute').title=state.muted?'Unmute output':'Mute output';$('#mute').setAttribute('aria-label',$('#mute').title);$('#output').style.opacity=state.muted?'.6':'1';
  if(document.activeElement!==$('#patch-title'))$('#patch-title').textContent=state.name;
  if(document.activeElement!==$('#patch-notes'))$('#patch-notes').value=state.notes;
  $('#frequency-summary').textContent=`${state.a.on?state.a.freq+' Hz':'A off'} + ${state.b.on?state.b.freq+' Hz':'B off'}`;
  if(mode==='wave')updateScopeScale();
  $$('input[type=range]').forEach(sliderFill);updateHistory();renderPatchList();
}
function renderPatchList(){
  const select=$('#mobile-patches');select.replaceChildren();Object.entries(patches).forEach(([id,p])=>{const option=document.createElement('option');option.value=id;option.textContent=id===current?state.name:p.name;option.selected=id===current;select.append(option);});$('#patch-number').textContent='PATCH '+String(Object.keys(patches).indexOf(current)+1).padStart(2,'0');
  Object.entries(patches).forEach(([id,p])=>{let el=$(`[data-preset="${id}"]`);if(!el){el=document.createElement('button');el.className='patch-item';el.dataset.preset=id;el.innerHTML=`<span class="patch-mini-wave">${icon('wave')}</span><span><span class="patch-name"></span><small>Saved experiment</small></span>`;$('.patch-list').append(el);}const title=el.querySelector('.patch-name');if(title)title.textContent=id===current?state.name:p.name;else{const textNode=el.children[1].firstChild;if(textNode?.nodeType===Node.TEXT_NODE)textNode.textContent=id===current?state.name:p.name;}el.classList.toggle('selected',id===current);el.querySelector('.patch-active-dot')?.remove();if(id===current){const dot=document.createElement('span');dot.className='patch-active-dot';el.append(dot);}});$('#patch-count').textContent=String(Object.keys(patches).length).padStart(2,'0');
}
function load(id){save();current=id;state=structuredClone(patches[id]);history=[];future=[];grouped=false;save();render();updateAudio();showTab(false);}
$('.patch-list').addEventListener('click',e=>{const button=e.target.closest('[data-preset]');if(button)load(button.dataset.preset);});
$('#mobile-patches').addEventListener('change',e=>load(e.target.value));$('#mobile-new-patch').onclick=()=>$('#new-patch').click();
$$('.waveform-selector').forEach(el=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(b)mutate(()=>state[el.dataset.osc].type=b.dataset.wave);}));
$$('[data-toggle]').forEach(el=>el.addEventListener('click',()=>mutate(()=>{const k=el.dataset.toggle;state[k].on=!state[k].on;})));
for(const k of ['a','b']){
  const number=$(`#freq-${k}`);number.addEventListener('change',()=>{const v=Number(number.value);if(Number.isFinite(v))mutate(()=>state[k].freq=Math.min(2000,Math.max(20,v)));else render();});number.addEventListener('keydown',e=>{if(e.key==='Enter')number.blur();});
  const slider=$(`#slider-${k}`);slider.addEventListener('input',()=>mutate(()=>state[k].freq=+slider.value,true));slider.addEventListener('change',()=>{grouped=false;});
  $(`#gain-${k}`).addEventListener('input',e=>mutate(()=>state[k].gain=+e.target.value,true));$(`#gain-${k}`).addEventListener('change',()=>grouped=false);
}
$('#master-volume').addEventListener('input',e=>mutate(()=>state.volume=+e.target.value,true));$('#master-volume').addEventListener('change',()=>grouped=false);
$('#mute').addEventListener('click',()=>mutate(()=>state.muted=!state.muted));
$('#undo').addEventListener('click',()=>{if(!history.length)return;future.push(structuredClone(state));state=history.pop();grouped=false;save();render();updateAudio();});
$('#redo').addEventListener('click',()=>{if(!future.length)return;history.push(structuredClone(state));state=future.pop();grouped=false;save();render();updateAudio();});
$('#new-patch').addEventListener('click',()=>{save();const id='patch-'+Date.now();patches[id]=structuredClone(clean);load(id);toast('A fresh patch. Make it your own.');});
$('#reset-view').addEventListener('click',()=>{mutate(()=>{const {name,notes}=state;state=structuredClone(defaults[current]||clean);state.name=name;state.notes=notes;});toast('Controls reset to the starting patch');});
$('#patch-title').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur();}});
$('#patch-title').addEventListener('blur',e=>{const name=e.target.textContent.trim().slice(0,100)||'Untitled patch';if(name!==state.name)mutate(()=>state.name=name);e.target.textContent=name;});
$('#rename').addEventListener('click',()=>{const el=$('#patch-title');el.focus();const range=document.createRange();range.selectNodeContents(el);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);});
$('#patch-notes').addEventListener('input',e=>mutate(()=>state.notes=e.target.value.slice(0,100000),true));$('#patch-notes').addEventListener('blur',()=>grouped=false);
function showTab(notes){$('#notes-panel').hidden=!notes;$('#patch-canvas').hidden=notes;$('#notes-tab').classList.toggle('active',notes);$('#patch-tab').classList.toggle('active',!notes);if(!notes)requestAnimationFrame(updateCables);}
$('#notes-tab').onclick=()=>showTab(true);$('#patch-tab').onclick=()=>showTab(false);
function highlight(selector){showTab(false);const el=$(selector);el.scrollIntoView({behavior:'smooth',block:'nearest'});el.classList.remove('highlight');requestAnimationFrame(()=>el.classList.add('highlight'));}
$('#add-oscillator').onclick=()=>{highlight('#osc-a');$('#freq-a').focus({preventScroll:true});};$('#focus-mixer').onclick=()=>highlight('#mixer');$('#focus-scope').onclick=()=>highlight('#scope-panel');
function help(){$('#help-dialog').showModal();}$('#help').onclick=help;$('#quick-tour').onclick=help;$('#about').onclick=e=>{e.preventDefault();help();};$('.dialog-close').onclick=()=>$('#help-dialog').close();$('#help-done').onclick=()=>$('#help-dialog').close();$('#help-dialog').addEventListener('click',e=>{if(e.target===$('#help-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#save-patch').onclick=()=>{save();const blob=new Blob([JSON.stringify({format:'phase-patch',version:1,patch:state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(state.name.replace(/[^a-z0-9]/gi,'-').toLowerCase()||'patch')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Patch downloaded. Drop it here to open it again.');};
async function importPatch(file){try{if(!file||file.size>200000)throw Error();const data=JSON.parse(await file.text());if(data.format!=='phase-patch'||data.version!==1||!validPatch(data.patch))throw Error();save();const id='patch-'+Date.now();patches[id]=data.patch;load(id);toast('Patch restored. Welcome back.');}catch{toast('This file isn’t a valid Phase patch.');}}
document.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});document.addEventListener('drop',e=>{e.preventDefault();importPatch(e.dataTransfer.files[0]);});
$('#import-file').onchange=e=>importPatch(e.target.files[0]);
function initAudio(){
  const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)throw new Error('Audio is not supported by this browser.');
  context=new AudioCtx();analyser=context.createAnalyser();analyser.fftSize=8192;analyser.smoothingTimeConstant=.8;analyser.minDecibels=-85;analyser.maxDecibels=-5;
  const master=context.createGain();master.gain.value=0;master.connect(analyser);analyser.connect(context.destination);
  audioNodes={master};for(const k of ['a','b']){const osc=context.createOscillator(),gain=context.createGain();osc.type=state[k].type;osc.frequency.value=state[k].freq;gain.gain.value=state[k].on?state[k].gain/100:0;osc.connect(gain);gain.connect(master);osc.start();audioNodes[k]={osc,gain};}
  $('#sample-rate').textContent=context.sampleRate.toLocaleString('en-US')+' Hz';
  context.onstatechange=()=>{if(context.state!=='running'&&running){running=false;renderTransport();} };
}
function updateAudio(){if(!audioNodes)return;const now=context.currentTime;for(const k of ['a','b']){const {osc,gain}=audioNodes[k];osc.type=state[k].type;osc.frequency.setTargetAtTime(state[k].freq,now,.018);gain.gain.setTargetAtTime(state[k].on?state[k].gain/100:0,now,.02);}audioNodes.master.gain.setTargetAtTime(running&&!state.muted?state.volume/100*.35:0,now,.025);}
function renderTransport(){$('#play').innerHTML=icon(running?'stop':'play')+`<span id="play-label">${running?'Stop audio':'Start audio'}</span>`;$('.engine-status').classList.toggle('playing',running);$('#engine-label').textContent=running?'Audio engine running':'Audio engine ready';$('#output').classList.toggle('playing',running);$('#scope-live').innerHTML=frozen?'FROZEN':running?'<i></i>LIVE':'<i></i>PREVIEW';}
async function toggleAudio(){if(audioBusy)return;audioBusy=true;try{if(!context)initAudio();if(!running){await context.resume();running=true;}else running=false;updateAudio();renderTransport();}catch(e){toast(e.message||'Audio couldn’t start. Please try again.');}finally{audioBusy=false;}}
$('#play').onclick=toggleAudio;
let knobDrag;
$('#volume-knob').addEventListener('pointerdown',e=>{remember();grouped=true;knobDrag={y:e.clientY,volume:state.volume};e.currentTarget.setPointerCapture(e.pointerId);});
$('#volume-knob').addEventListener('pointermove',e=>{if(!knobDrag)return;state.volume=Math.round(Math.min(100,Math.max(0,knobDrag.volume+(knobDrag.y-e.clientY)*.6)));save();render();updateAudio();});
for(const event of ['pointerup','pointercancel'])$('#volume-knob').addEventListener(event,()=>{knobDrag=null;grouped=false;});
$('#volume-knob').addEventListener('keydown',e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();mutate(()=>state.volume=e.key==='Home'?0:e.key==='End'?100:Math.max(0,Math.min(100,state.volume+(['ArrowUp','ArrowRight'].includes(e.key)?1:-1))));}});
document.addEventListener('keydown',e=>{if(e.target.matches('input, textarea, [contenteditable]')||$('#help-dialog').open)return;const mod=e.metaKey||e.ctrlKey;if(e.code==='Space'){e.preventDefault();toggleAudio();}if(e.key.toLowerCase()==='m'&&!mod)$('#mute').click();if(mod&&e.key.toLowerCase()==='k'){e.preventDefault();$('#new-patch').click();}if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();$(e.shiftKey?'#redo':'#undo').click();}if(mod&&e.key.toLowerCase()==='o'){e.preventDefault();$('#import-file').click();}});
function scopeScale(){return .35*state.volume/100*(['a','b'].reduce((v,k)=>v+(state[k].on?state[k].gain/100:0),0))>.5?1:.5;}
function updateScopeScale(){$('.y-positive').textContent='+'+scopeScale().toFixed(1);$('.y-negative').textContent='−'+scopeScale().toFixed(1);}
function setMode(next){mode=next;$('#wave-mode').classList.toggle('active',mode==='wave');$('#spectrum-mode').classList.toggle('active',mode==='spectrum');$('#scope-time').innerHTML=mode==='wave'?'10 ms <span>/ div</span>':'LOG <span>Hz</span>';const labels=mode==='wave'?['0','10','20','30','40 ms']:['20 Hz','100','1k','5k','20 kHz'];const positions=mode==='wave'?[0,25,50,75,100]:[0,Math.log10(5)/3*100,Math.log10(50)/3*100,Math.log10(250)/3*100,100];$$('.scope-x-axis span').forEach((s,i)=>{s.textContent=labels[i];s.style.left=positions[i]+'%';});$('.y-positive').textContent='0 dB';$('.y-zero').textContent=mode==='wave'?'0.0':'−40';$('.y-negative').textContent='−80';if(mode==='wave')updateScopeScale();}
$('#wave-mode').onclick=()=>setMode('wave');$('#spectrum-mode').onclick=()=>setMode('spectrum');$('#freeze').onclick=()=>{frozen=!frozen;$('#freeze').innerHTML=icon(frozen?'play':'pause');$('#freeze').setAttribute('aria-pressed',frozen);$('#freeze').title=frozen?'Resume display':'Freeze display';$('#freeze').setAttribute('aria-label',$('#freeze').title);renderTransport();};
function updateCables(){const parent=$('#patch-canvas');if(parent.hidden)return;const box=parent.getBoundingClientRect(),svg=$('.patch-cables');svg.style.top='0';svg.style.height='100%';svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);const pos=el=>{const r=el.getBoundingClientRect();return{x:r.left+r.width/2-box.left,y:r.top+r.height/2-box.top};};for(const [name,from,to] of [['a','#osc-a .port-out','#mixer .port-in-a'],['b','#osc-b .port-out','#mixer .port-in-b'],['out','#mixer .port-out','#output .port-in']]){const a=pos($(from)),b=pos($(to)),d=(b.x-a.x)*.6;$(`.cable-${name}`).setAttribute('d',`M${a.x} ${a.y} C${a.x+d} ${a.y} ${b.x-d} ${b.y} ${b.x} ${b.y}`);}}
const canvas=$('#scope'),ctx=canvas.getContext('2d');let w=0,h=0,timeData=new Float32Array(8192),freqData=new Float32Array(4096);
function resize(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;canvas.width=Math.round(w*devicePixelRatio);canvas.height=Math.round(h*devicePixelRatio);ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);updateCables();}
new ResizeObserver(resize).observe($('#scope-panel'));new ResizeObserver(updateCables).observe($('#patch-canvas'));
function signal(type,phase){const p=phase%1;switch(type){case'square':return Math.sin(phase*Math.PI*2)>=0?1:-1;case'triangle':return 2/Math.PI*Math.asin(Math.sin(phase*Math.PI*2));case'sawtooth':return 2*(p-Math.floor(p+.5));default:return Math.sin(phase*Math.PI*2);}}
function synthetic(t){return state.muted?0:['a','b'].reduce((v,k)=>v+(state[k].on?signal(state[k].type,t*state[k].freq)*state[k].gain/100:0),0)*state.volume/100*.35;}
function draw(){requestAnimationFrame(draw);if(frozen||!w)return;frame++;ctx.clearRect(0,0,w,h);const left=42,right=w-19,top=19,bottom=h-24,mid=(top+bottom)/2,amp=(bottom-top)/2;ctx.strokeStyle='#e7eee7';ctx.lineWidth=.7;ctx.beginPath();for(let x=left;x<=right;x+=(right-left)/16){ctx.moveTo(x,0);ctx.lineTo(x,h-20);}for(let y=top;y<=bottom+1;y+=(bottom-top)/4){ctx.moveTo(left,y);ctx.lineTo(right,y);}ctx.stroke();ctx.strokeStyle='#d4e0d5';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(left,mid);ctx.lineTo(right,mid);ctx.stroke();ctx.setLineDash([]);
  if(mode==='wave'){
    const actual=running&&analyser;let start=0;if(actual){analyser.getFloatTimeDomainData(timeData);for(let i=1;i<2500;i++){if(timeData[i-1]<0&&timeData[i]>=0){start=i;break;}}}
    ctx.beginPath();const count=Math.ceil(right-left),scale=scopeScale();for(let i=0;i<=count;i++){const t=i/count*.04;const value=actual?timeData[Math.min(timeData.length-1,start+Math.round(t*context.sampleRate))]:synthetic(t);const x=left+i/count*(right-left),y=Math.max(top,Math.min(bottom,mid-value*amp/scale));if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle='#73a184';ctx.lineWidth=1.55;ctx.stroke();ctx.lineTo(right,mid);ctx.lineTo(left,mid);ctx.closePath();const fill=ctx.createLinearGradient(0,top,0,bottom);fill.addColorStop(0,'#7fba8d14');fill.addColorStop(1,'#8ab89203');ctx.fillStyle=fill;ctx.fill();
  }else{
    if(running&&analyser)analyser.getFloatFrequencyData(freqData);ctx.beginPath();ctx.moveTo(left,bottom);for(let i=0;i<=Math.ceil(right-left);i++){const f=20*Math.pow(1000,i/(right-left));let value=0;if(running&&analyser){const bin=Math.round(f/context.sampleRate*analyser.fftSize);value=Math.max(0,(freqData[Math.min(bin,freqData.length-1)]+80)/80);}else if(!state.muted){for(const k of ['a','b']){const s=state[k];if(!s.on)continue;const max=s.type==='sine'?1:Math.min(90,Math.floor(20000/s.freq));for(let n=1;n<=max;n++){if((s.type==='square'||s.type==='triangle')&&n%2===0)continue;const strength=s.gain/100*state.volume/100*.35/(s.type==='triangle'?n*n:n);const delta=Math.log2(f/(s.freq*n));value+=Math.exp(-delta*delta*18000)*Math.max(0,(20*Math.log10(Math.max(strength,0.000001))+80)/80);}}}ctx.lineTo(left+i,bottom-Math.min(1,value)*(bottom-top));}ctx.lineTo(right,bottom);ctx.closePath();ctx.fillStyle='#7ba98b20';ctx.fill();ctx.strokeStyle='#78a184';ctx.lineWidth=1.3;ctx.stroke();}
  if(frame%15===0){if(running&&analyser)analyser.getFloatTimeDomainData(timeData);let power=0;for(let i=0;i<2048;i++){const value=running&&analyser?timeData[i]:synthetic(i/48000);power+=value*value;}const rms=Math.sqrt(power/2048);$('#rms-value').textContent=rms>0.00001?(20*Math.log10(rms)).toFixed(1)+' dBFS':'−∞ dBFS';}
}
render();renderTransport();setMode('wave');resize();draw();
