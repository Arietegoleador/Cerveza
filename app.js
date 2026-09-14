const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const WEEKLY = [
  {start:"2026-07-06", end:"2026-07-12", cl:510},
  {start:"2026-07-13", end:"2026-07-19", cl:720},
  {start:"2026-07-20", end:"2026-07-26", cl:450},
  {start:"2026-07-27", end:"2026-08-02", cl:660},
  {start:"2026-08-03", end:"2026-08-09", cl:690},
  {start:"2026-08-10", end:"2026-08-16", cl:760},
  {start:"2026-08-17", end:"2026-08-23", cl:970},
  {start:"2026-08-24", end:"2026-08-30", cl:530},
  {start:"2026-08-31", end:"2026-09-06", cl:400},
  {start:"2026-09-07", end:"2026-09-13", cl:166}
];

const INITIAL_DAILY = [
  {id:"d7",date:"2026-09-07",cl:0},
  {id:"d8",date:"2026-09-08",cl:0},
  {id:"d9",date:"2026-09-09",cl:0},
  {id:"d10",date:"2026-09-10",cl:0},
  {id:"d11",date:"2026-09-11",cl:100},
  {id:"d12",date:"2026-09-12",cl:0},
  {id:"d13",date:"2026-09-13",cl:66}
];

let daily = JSON.parse(localStorage.getItem("beerDaily") || "null") || INITIAL_DAILY;
let editingId = null;
let statsTab = "weekly";
let statsOffset = 0;

function save(){localStorage.setItem("beerDaily",JSON.stringify(daily));}
function dateObj(s){return new Date(s+"T12:00:00")}
function iso(d){return d.toISOString().slice(0,10)}
function startOfWeek(d){const x=new Date(d);const day=x.getDay();const diff=day===0?-6:1-day;x.setDate(x.getDate()+diff);x.setHours(12,0,0,0);return x}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function fmtDate(s){return dateObj(s).toLocaleDateString("es-ES",{day:"numeric",month:"short"}).replace(".","")}
function monthName(d){return d.toLocaleDateString("es-ES",{month:"long",year:"numeric"})}
function sumRange(start,end){return daily.filter(r=>r.date>=iso(start)&&r.date<=iso(end)).reduce((a,r)=>a+r.cl,0)}
function getDaily(date){return daily.filter(r=>r.date===date).reduce((a,r)=>a+r.cl,0)}
function histAvg(){return WEEKLY.reduce((a,w)=>a+w.cl,0)/WEEKLY.length}
function amount(v){
  const n=Number(v)||0;
  return n>100 ? `${(n/100).toFixed(1)} L` : `${Math.round(n)} cl`;
}
function axisAmount(v){
  const n=Number(v)||0;
  if(n===0)return "0 cl";
  return n>100 ? `${(n/100).toFixed(1)} L` : `${Math.round(n)} cl`;
}

function renderHome(){
  const now=new Date(), today=iso(now), ws=startOfWeek(now), we=addDays(ws,6);
  const totalToday=getDaily(today), totalWeek=sumRange(ws,we), avg=histAvg();
  $("#todayTotal").innerHTML=amount(totalToday);
  $("#todayDate").textContent=now.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
  $("#weekTotal").innerHTML=amount(totalWeek);
  const diff=avg?((totalWeek-avg)/avg)*100:0;
  $("#weekComparison").textContent=totalWeek===0?"Sin consumo":`${diff>=0?"+":""}${Math.round(diff)}% vs media`;
  $("#historicalAvg").textContent=amount(avg);
  const labels=["L","M","X","J","V","S","D"], vals=[];
  for(let i=0;i<7;i++) vals.push(getDaily(iso(addDays(ws,i))));
  drawChart($("#weekChart"),vals,labels,{fill:true,limit:avg,unit:"Litros",scale:100,fixedMax:9,tickStep:1,labelTicksOnly:true,labelEvery:3,tickFormatter:v=>v===0?"0 L":`${v} L`});
}

function drawChart(canvas,values,labels,opts={}){
  const ctx=canvas.getContext("2d"),rect=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;
  canvas.width=Math.max(1,rect.width*dpr);canvas.height=Math.max(1,rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=rect.width,h=rect.height;
  const p={l:34,r:8,t:26,b:opts.showX===false?12:10};
  const innerH=h-p.t-p.b;
  const data=values.map(v=>Number(v)||0).map(v=>opts.scale?v/opts.scale:v);
  const limit=opts.limit!=null?(opts.limit/(opts.scale||1)):0;
  const max=opts.fixedMax!=null?opts.fixedMax:Math.max(...data,limit,0.5)*1.18;
  ctx.clearRect(0,0,w,h);
  ctx.font="700 10px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillStyle="#7d746e";ctx.textAlign="left";ctx.fillText(opts.unit||"Litros",p.l,11);
  ctx.strokeStyle="#eadfd4";ctx.lineWidth=1;
  const tickStep=opts.tickStep||max/3;
  const tickCount=Math.floor(max/tickStep+0.0001);
  for(let i=0;i<=tickCount;i++){
    const value=i*tickStep,y=h-p.b-(value/max)*innerH;
    ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.stroke();
    if(!opts.labelTicksOnly || i%opts.labelEvery===0 || i===0){ctx.textAlign="right";ctx.fillStyle="#9a918a";ctx.font="600 9px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(opts.tickFormatter?opts.tickFormatter(value):axisAmount(value),p.l-6,y+3)}
  }
  const xStep=(w-p.l-p.r)/(values.length-1||1);
  const pts=data.map((v,i)=>({x:p.l+i*xStep,y:h-p.b-(v/max)*innerH}));
  if(opts.limit!=null){const y=h-p.b-(limit/max)*innerH;ctx.setLineDash([5,5]);ctx.strokeStyle="#c58b3a";ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.stroke();ctx.setLineDash([])}
  if(opts.fill&&pts.length){ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.lineTo(pts.at(-1).x,h-p.b);ctx.lineTo(pts[0].x,h-p.b);ctx.closePath();ctx.fillStyle="rgba(111,24,48,.09)";ctx.fill()}
  if(pts.length){ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.strokeStyle="#6f1830";ctx.lineWidth=3;ctx.stroke();pts.forEach(q=>{ctx.beginPath();ctx.arc(q.x,q.y,5,0,Math.PI*2);ctx.fillStyle="#fffdf9";ctx.fill();ctx.strokeStyle="#6f1830";ctx.lineWidth=3;ctx.stroke()})}
  if(opts.showX!==false && !opts.externalX){ctx.textAlign="center";ctx.font="600 9px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillStyle="#7d746e";labels.forEach((label,i)=>ctx.fillText(label,pts[i].x,h-16));if(opts.xUnit){ctx.font="700 10px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(opts.xUnit,w/2,h-2)}}
}
function shortDM(s){const d=dateObj(s);return `${d.getDate()}/${d.getMonth()+1}`;}

function weeklyPeriods(){
  const ws=startOfWeek(new Date()), we=addDays(ws,6);
  const current={start:iso(ws),end:iso(we),cl:sumRange(ws,we),current:true};
  return [...WEEKLY,current];
}

function renderStats(){
  const box=$("#statsContent");
  if(statsTab==="records"){renderRecords(box);return}
  if(statsTab==="monthly"){renderMonthly(box);return}
  renderWeekly(box);
}

function renderWeekly(box){
  const periods=weeklyPeriods();
  const selectedIndex=Math.max(0,Math.min(periods.length-1,periods.length-1+statsOffset));
  const selected=periods[selectedIndex];
  const title=`${fmtDate(selected.start)} – ${fmtDate(selected.end)}`;
  const maxWeekly=Math.max(...WEEKLY.map(w=>w.cl));
  const hasDailyData=hasCompleteDailyData(selected.start,selected.end);
  const daysDrink=hasDailyData?countDays(selected.start,selected.end):null;
  const daysDry=hasDailyData?7-daysDrink:null;
  const chartStart=Math.max(0,selectedIndex-9), chartPeriods=periods.slice(chartStart,selectedIndex+1);
  box.innerHTML=`<div class="stat-card"><div class="period-nav"><button class="arrow" data-shift="-1" ${selectedIndex===0?"disabled":""}>‹</button><div class="period">${title}</div><button class="arrow" data-shift="1" ${selectedIndex===periods.length-1?"disabled":""}>›</button></div>
    <div class="stat-grid">
      <div class="stat"><div class="l">CONSUMO</div><div class="v">${amount(selected.cl)}</div></div>
      <div class="stat"><div class="l">MEDIA HISTÓRICA</div><div class="v">${amount(histAvg())}</div></div>
      <div class="stat"><div class="l">MÁXIMO SEMANAL</div><div class="v">${amount(maxWeekly)}</div></div>
      <div class="stat"><div class="l">DÍAS CON CONSUMO</div><div class="v">${daysDrink==null?"—":daysDrink}</div></div>
      <div class="stat"><div class="l">DÍAS SIN CONSUMO</div><div class="v">${daysDry==null?"—":daysDry}</div></div>
    </div><div class="chart-large"><canvas id="weeklyStatsChart"></canvas></div></div>`;
  drawChart($("#weeklyStatsChart"),chartPeriods.map(w=>w.cl),chartPeriods.map(w=>shortDM(w.start)),{fill:true,limit:histAvg(),unit:"Litros",xUnit:"Semanas",scale:100,fixedMax:9,tickStep:1,labelTicksOnly:true,labelEvery:3,tickFormatter:v=>v===0?"0 L":`${v} L`});
  $$(".arrow").forEach(b=>b.onclick=()=>{statsOffset+=Number(b.dataset.shift);renderStats()});
}

function hasCompleteDailyData(start,end){
  for(let i=0;i<7;i++){if(!daily.some(r=>r.date===iso(addDays(dateObj(start),i))))return false}
  return true;
}
function countDays(s,e){let n=0;for(let i=0;i<7;i++)if(getDaily(iso(addDays(dateObj(s),i)))>0)n++;return n}

function renderMonthly(box){
  const base=new Date();base.setDate(1);base.setMonth(base.getMonth()+statsOffset);
  const ms=new Date(base.getFullYear(),base.getMonth(),1,12),me=new Date(base.getFullYear(),base.getMonth()+1,0,12);
  const historicalMonths=monthsWithData();
  const all=historicalMonths.map(m=>m.total);
  const maxMonthly=all.length?Math.max(...all):0;
  const total=monthlyTotal(ms,me);
  const hasDaily=monthHasAnyDaily(ms,me);
  const daysDrink=hasDaily?countMonthDays(ms,me):null;
  const daysDry=hasDaily?me.getDate()-daysDrink:null;
  box.innerHTML=`<div class="stat-card"><div class="period-nav"><button class="arrow" data-shift="-1">‹</button><div class="period">${monthName(ms)}</div><button class="arrow" data-shift="1">›</button></div>
    <div class="stat-grid">
      <div class="stat"><div class="l">CONSUMO</div><div class="v">${amount(total)}</div></div>
      <div class="stat"><div class="l">MEDIA MENSUAL</div><div class="v">${amount(monthlyAverage())}</div></div>
      <div class="stat"><div class="l">MÁXIMO MENSUAL</div><div class="v">${amount(maxMonthly)}</div></div>
      <div class="stat"><div class="l">DÍAS CON CONSUMO</div><div class="v">${daysDrink==null?"—":daysDrink}</div></div>
      <div class="stat"><div class="l">DÍAS SIN CONSUMO</div><div class="v">${daysDry==null?"—":daysDry}</div></div>
    </div><div class="chart-large"><canvas id="monthlyChart"></canvas></div></div>`;
  drawChart($("#monthlyChart"),all,historicalMonths.map(m=>`${m.start.getDate()}/${m.start.getMonth()+1}`),{fill:true,unit:"Litros",xUnit:"Meses",scale:100,fixedMax:35,tickStep:5,labelTicksOnly:false,labelEvery:1,tickFormatter:v=>`${v} L`});
  $$(".arrow").forEach(b=>b.onclick=()=>{statsOffset+=Number(b.dataset.shift);renderStats()});
}

function monthsWithData(){
  const dates=[];
  WEEKLY.forEach(w=>dates.push(dateObj(w.start)));
  daily.forEach(r=>dates.push(dateObj(r.date)));
  const keys=[...new Set(dates.map(d=>`${d.getFullYear()}-${d.getMonth()}`))].map(k=>k.split("-").map(Number));
  return keys.sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(([y,m])=>{const s=new Date(y,m,1,12);return {start:s,total:monthlyTotal(s,new Date(y,m+1,0,12)),label:s.toLocaleDateString("es-ES",{month:"short"})}});
}

function monthlyTotal(start,end){
  const direct=daily.filter(r=>r.date>=iso(start)&&r.date<=iso(end)).reduce((a,r)=>a+r.cl,0);
  const weeklyPart=WEEKLY.reduce((a,w)=>{
    const s=dateObj(w.start),e=dateObj(w.end),os=new Date(Math.max(s,start)),oe=new Date(Math.min(e,end));
    if(os<=oe){const days=Math.round((oe-os)/86400000)+1;a+=w.cl*(days/7)}
    return a;
  },0);
  return direct+weeklyPart;
}
function monthlyAverage(){
  const complete=monthsWithData().filter(m=>m.start.getFullYear()===2026 && (m.start.getMonth()===6 || m.start.getMonth()===7));
  return complete.length?complete.reduce((a,m)=>a+m.total,0)/complete.length:0;
}

function monthHasAnyDaily(s,e){return daily.some(r=>r.date>=iso(s)&&r.date<=iso(e))}
function countMonthDays(s,e){let n=0;for(let d=new Date(s);d<=e;d=addDays(d,1))if(getDaily(iso(d))>0)n++;return n}

function renderRecords(box){
  const maxDay=Math.max(230,...daily.map(r=>r.cl));
  const maxWeek=Math.max(...WEEKLY.map(w=>w.cl),sumRange(startOfWeek(new Date()),addDays(startOfWeek(new Date()),6)));
  const monthly=monthsWithData(), maxMonth=monthly.length?Math.max(...monthly.map(x=>x.total)):0;
  const streakDrink=maxStreak(true), streakDry=maxStreak(false);
  const minWeek=Math.min(...WEEKLY.map(w=>w.cl));
  box.innerHTML=`<div class="record-grid">
    <div class="record"><div class="value">${amount(maxDay)}</div><div class="label">Máximo diario</div></div>
    <div class="record"><div class="value">${amount(maxWeek)}</div><div class="label">Máximo semanal</div></div>
    <div class="record"><div class="value">${amount(maxMonth)}</div><div class="label">Máximo mensual</div></div>
    <div class="record"><div class="value">${streakDrink} ${streakDrink===1?"día":"días"}</div><div class="label">Máxima racha bebiendo · datos diarios disponibles</div></div>
    <div class="record"><div class="value">${streakDry} ${streakDry===1?"día":"días"}</div><div class="label">Máxima racha sin beber · datos diarios disponibles</div></div>
    <div class="record"><div class="value">${amount(minWeek)}</div><div class="label">Menor consumo semanal conocido</div></div>
  </div>`;
}

function maxStreak(drinking){
  const ds=[...new Set(daily.map(r=>r.date))].sort();let max=0,cur=0,last=null;
  for(const s of ds){const d=dateObj(s),contiguous=last&&Math.round((d-last)/86400000)===1,yes=getDaily(s)>0;
    if(!last||contiguous)cur=yes===drinking?cur+1:0;else cur=yes===drinking?1:0;
    max=Math.max(max,cur);last=d;
  }
  return max;
}

function renderHistory(){
  const list=$("#historyList"),rows=daily.filter(r=>r.cl>0).sort((a,b)=>b.date.localeCompare(a.date));
  if(!rows.length){list.innerHTML='<div class="empty">Todavía no hay registros.</div>';return}
  const groups={};rows.forEach(r=>{const k=dateObj(r.date).toLocaleDateString("es-ES",{month:"long",year:"numeric"});(groups[k]??=[]).push(r)});
  list.innerHTML=Object.entries(groups).map(([m,rs])=>`<div class="history-month">${m}</div>`+rs.map(r=>`<button class="history-row" data-id="${r.id}"><span class="history-date">${fmtDate(r.date)}</span><span class="history-value">${amount(r.cl)}</span></button>`).join("")).join("");
  $$(".history-row").forEach(b=>b.onclick=()=>openModal(b.dataset.id));
}

function openModal(id=null){
  editingId=id;const r=id?daily.find(x=>x.id===id):null;
  $("#modalTitle").textContent=r?"Editar consumo":"Añadir consumo";
  $("#amountInput").value=r?.cl||"";
  $("#dateInput").value=r?.date||iso(new Date());
  $$(".quick").forEach(b=>b.classList.toggle("selected",r?.cl===Number(b.dataset.value)));
  $("#deleteBtn").hidden=!r;$("#modalBackdrop").hidden=false;
}
function closeModal(){$("#modalBackdrop").hidden=true;editingId=null}
function saveModal(){
  const amountValue=Math.round(Number($("#amountInput").value)),date=$("#dateInput").value;
  if(!amountValue||amountValue<1||!date)return;
  if(editingId){const r=daily.find(x=>x.id===editingId);r.cl=amountValue;r.date=date}
  else daily.push({id:crypto.randomUUID(),date,cl:amountValue});
  save();closeModal();renderAll();
}
function renderAll(){renderHome();renderStats();renderHistory()}

$$(".nav-item").forEach(b=>b.onclick=()=>{$$(".nav-item").forEach(x=>x.classList.toggle("active",x===b));$$(".view").forEach(v=>v.classList.remove("active"));$("#view-"+b.dataset.view).classList.add("active");if(b.dataset.view==="stats")renderStats();if(b.dataset.view==="history")renderHistory()});
$$(".seg").forEach(b=>b.onclick=()=>{$$(".seg").forEach(x=>x.classList.remove("active"));b.classList.add("active");statsTab=b.dataset.tab;statsOffset=0;renderStats()});
$("#addBtn").onclick=()=>openModal();$("#historyAddBtn").onclick=()=>openModal();$("#closeModal").onclick=closeModal;$("#cancelBtn").onclick=closeModal;$("#saveBtn").onclick=saveModal;
$("#deleteBtn").onclick=()=>{if(editingId){daily=daily.filter(r=>r.id!==editingId);save();closeModal();renderAll()}};
$$(".quick").forEach(b=>b.onclick=()=>{$("#amountInput").value=b.dataset.value;$$(".quick").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
$("#todayBtn").onclick=()=>document.querySelector('[data-view="home"]').click();
window.addEventListener("resize",renderHome);
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
renderAll();
