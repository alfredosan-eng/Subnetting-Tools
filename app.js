const $ = id => document.getElementById(id);
const clamp = (n,min,max) => Math.max(min, Math.min(max,n));

function validIPv4(ip){
  const a = ip.trim().split('.').map(Number);
  return a.length===4 && a.every(x=>Number.isInteger(x)&&x>=0&&x<=255);
}
function ipBits(ip){
  if(!validIPv4(ip)) throw new Error('IPv4 inválida');
  return ip.split('.').map(Number).map(n=>n.toString(2).padStart(8,'0')).join('');
}
function prefixMask(p){
  p=clamp(Number(p)||0,0,32);
  const bits='1'.repeat(p)+'0'.repeat(32-p);
  return [0,8,16,24].map(i=>parseInt(bits.slice(i,i+8),2)).join('.');
}
function prefixMaskBin(p){
  const bits='1'.repeat(p)+'0'.repeat(32-p);
  return [0,8,16,24].map(i=>bits.slice(i,i+8)).join('.');
}
function network(ip,p){
  const b=ipBits(ip), n=b.slice(0,p)+'0'.repeat(32-p);
  return [0,8,16,24].map(i=>parseInt(n.slice(i,i+8),2)).join('.');
}
function broadcast(ip,p){
  const b=ipBits(ip), n=b.slice(0,p)+'1'.repeat(32-p);
  return [0,8,16,24].map(i=>parseInt(n.slice(i,i+8),2)).join('.');
}
function intIp(ip){return ip.split('.').map(Number).reduce((a,x)=>a*256+x,0)}
function ipInt(n){return [24,16,8,0].map(s=>Math.floor(n/2**s)%256).join('.')}
function hostCounts(p){
  const h=32-p, total=2**h, usable=p>=31?0:Math.max(0,total-2);
  return {h,total,usable};
}

// quick nav
for(const btn of document.querySelectorAll('[data-scroll]')) btn.onclick=()=>$(btn.dataset.scroll).scrollIntoView({behavior:'smooth',block:'start'});

// 01 Explore Prefix
let ep=24;
function renderExplore(){
  ep=clamp(ep,0,32); $('explorePrefix').textContent=ep; $('exploreCenter').textContent='/'+ep; $('exploreSlider').value=ep;
  try{
    const bits=ipBits($('exploreIp').value), c=hostCounts(ep);
    const groups=[...bits].map((b,i)=>`<span class="bit ${i<ep?'on':'host'}"></span>`).join('');
    $('exploreBitBar').innerHTML=groups;
    $('exploreStats').innerHTML=[
      ['Network Bits',ep],['Host Bits',c.h],['Total Addresses',c.total.toLocaleString()],['Usable Hosts',c.usable.toLocaleString()],['Subnet Mask',prefixMask(ep)],
      ['Block Size',c.total]
    ].map(([k,v])=>`<div class="stat"><b>${k}</b><span>${v}</span></div>`).join('');
    $('exploreMaskBinary').textContent=prefixMaskBin(ep);
  }catch(e){
    $('exploreStats').innerHTML='<div class="stat"><b>Status</b><span>IPv4 inválida</span></div>'; $('exploreBitBar').innerHTML=''; $('exploreMaskBinary').textContent='';
  }
}
$('exploreSlider').oninput=e=>{ep=+e.target.value;renderExplore()};
$('exploreIp').oninput=renderExplore;
$('exploreMinus').onclick=()=>{ep--;renderExplore()}; $('explorePlus').onclick=()=>{ep++;renderExplore()};

// 02 Understand prefix
function renderUnderstand(){
  $('splitDiagram').innerHTML=`<div class="net"><b>${ep} BITS</b><span>NETWORK</span></div><div class="host"><b>${32-ep} BITS</b><span>HOST</span></div>`;
  const rows=[24,25,26,27].map(p=>{
    const c=hostCounts(p); return `<tr class="${ep===p?'active':''}"><td>/${p}</td><td>${p}</td><td>${c.h}</td><td>${c.total}</td><td>${c.usable}</td></tr>`;
  }).join(''); $('prefixRows').innerHTML=rows;
  const c=hostCounts(ep); $('whyBox').innerHTML=`<b>Why ${c.total.toLocaleString()} addresses on /${ep}?</b> Host bits = ${c.h} → <b>2^${c.h} = ${c.total.toLocaleString()}</b> addresses.${ep<31?` Usable hosts = ${c.total.toLocaleString()} − 2 = <b>${c.usable.toLocaleString()}</b>.`:''}`;
}
const oldExplore=renderExplore;
function updateUnderstand(){renderUnderstand()}
// keep understanding synced with explorer
const slider = $('exploreSlider'); slider.addEventListener('input',()=>setTimeout(updateUnderstand,0));
$('exploreMinus').addEventListener('click',()=>setTimeout(updateUnderstand,0)); $('explorePlus').addEventListener('click',()=>setTimeout(updateUnderstand,0));

// 03 Convert tabs
for(const tab of document.querySelectorAll('.tab')) tab.onclick=()=>{
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t===tab));
  document.querySelectorAll('.convertPane').forEach(p=>p.classList.toggle('active',p.id===tab.dataset.tab+'Pane'));
};
function decimalRow(n,label){
  const b=n.toString(2).padStart(8,'0'); return `<div class="convertRow"><input value="${label}" data-dec readonly><span class="arrow">→</span><output>${b}</output></div>`;
}
function renderDecimalRows(){
  const nums=[192,255,224,0]; $('decimalRows').innerHTML=nums.map(n=>decimalRow(n,n)).join('');
}
$('binaryInput').oninput=()=>{
  let b=$('binaryInput').value.replace(/[^01]/g,'').slice(0,8); $('binaryInput').value=b;
  if(!b){$('binaryVisual').innerHTML='';$('binaryFormula').textContent='';return}
  b=b.padStart(8,'0'); const w=[128,64,32,16,8,4,2,1];
  $('binaryVisual').innerHTML=[...b].map((bit,i)=>`<div class="${bit==='1'?'on':''}"><b>${bit}</b><small>${w[i]}</small></div>`).join('');
  const terms=w.filter((_,i)=>b[i]==='1'); $('binaryFormula').textContent=`${terms.join(' + ')||'0'} = ${parseInt(b,2)}`;
};
function calcMask(){const p=clamp(Number($('maskPrefix').value)||0,0,32);$('maskPrefix').value=p;$('maskBinary').textContent=prefixMaskBin(p);$('maskDecimal').textContent=prefixMask(p)}
$('maskPrefix').oninput=calcMask;$('maskCalc').onclick=calcMask;

// 04 Subnetting
function renderSubnet(){
  const ip=$('subnetIp').value.trim(), p=clamp(Number($('subnetPrefix').value)||0,0,32); $('subnetPrefix').value=p;
  try{
    const bits=ipBits(ip), net=network(ip,p), bc=broadcast(ip,p), {h,total,usable}=hostCounts(p);
    const ni=intIp(net), bi=intIp(bc), first=p>=31?null:ipInt(ni+1), last=p>=31?null:ipInt(bi-1);
    const addresses=Array.from({length:Math.min(total,64)},(_,i)=>`<span class="${i===intIp(ip)-ni?'current':'past'}"></span>`).join('');
    $('blockVisual').innerHTML=`<div class="blockTrack">${addresses}</div><div class="markerLine"><div class="marker" style="left:${total>64?Math.min(100,((intIp(ip)-ni)/total)*100):((intIp(ip)-ni)/Math.max(1,Math.min(total,64)-1))*100}%"></div><div class="markerLabel" style="left:${total>64?Math.min(100,((intIp(ip)-ni)/total)*100):((intIp(ip)-ni)/Math.max(1,Math.min(total,64)-1))*100}%">${ip.split('.').pop()}</div></div><div class="rangeEndpoints"><span>${net}</span><span>${bc}</span></div>`;
    const entries=[['NETWORK',net,true],['BROADCAST',bc,true],['USABLE RANGE',first&&last?`${first} – ${last}`:'N/A',false],['USABLE HOSTS',usable.toLocaleString(),true],['BLOCK SIZE',total.toLocaleString(),false],['MASK',prefixMask(p),false]];
    $('subResults').innerHTML=entries.map(([k,v,ac])=>`<div class="result ${ac?'accent':''}"><b>${k}</b><span>${v}</span></div>`).join('');
    $('subSteps').innerHTML=`<b>1.</b> /${p} deja ${h} bits de host.<br><b>2.</b> 2^${h} = ${total.toLocaleString()} direcciones por bloque.<br><b>3.</b> Máscara: ${prefixMask(p)} · salto efectivo según el octeto interesante.<br><b>4.</b> ${ip} pertenece al bloque ${net} → ${bc}.`;
  }catch(e){$('blockVisual').innerHTML='';$('subResults').innerHTML='<div class="result accent"><b>STATUS</b><span>IPv4 inválida</span></div>';$('subSteps').textContent='Corrige la dirección IPv4 e intenta nuevamente.'}
}
$('subnetCalc').onclick=renderSubnet;$('subnetIp').oninput=renderSubnet;$('subnetPrefix').oninput=renderSubnet;

// initial
renderExplore();renderUnderstand();renderDecimalRows();$('binaryInput').dispatchEvent(new Event('input'));calcMask();renderSubnet();
