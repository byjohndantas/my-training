
/* MY TRAINING — MY PROGRESS */
(() => {
  const ID = 'myProgressPanel';

  const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(state));
  };

  // Caio starts with a clean, independent training calendar.
  if (!Array.isArray(state.trainingSessions)) state.trainingSessions = [];

  const exerciseName = key => {
    const [day, index] = key.split('_');
    const workout = WORKOUTS.find(w => w.id === day);
    return workout?.exercises[Number(index)]?.name || key;
  };

  if (!Array.isArray(state.history)) {
    state.history = [];
    Object.entries(state.logs || {}).forEach(([key, log]) => {
      ['weight','reps'].forEach(field => {
        if (String(log[field] || '').trim()) {
          state.history.push({
            key,
            exercise: exerciseName(key),
            field,
            value: log[field],
            at: new Date().toISOString(),
            source: 'starting'
          });
        }
      });
    });
    save();
  }

  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.id = ID;
  panel.innerHTML = `
    <div style="font-size:9px;letter-spacing:.28em;color:#d4ad75">MY TRAINING</div>
    <h2 class="sectionhead" style="font-size:25px;margin:7px 0">My Progress</h2>
    <p class="muted">Your progress, strength and consistency.</p>
    <div id="mpStats" class="mp-stats"></div>
    <div class="mp-heading">PERSONAL RECORDS</div>
    <div id="mpRecords"></div>
    <div class="mp-heading" style="margin-top:22px">PROGRESS HISTORY</div>
    <div id="mpHistory"></div>
    <p class="mp-note">Update your weights and reps to track your progress over time.</p>
  `;

  const footer = document.querySelector('footer');
  if (footer) footer.parentNode.insertBefore(panel, footer);

  const style = document.createElement('style');
  style.textContent = `
    #${ID} .mp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0 22px}
    #${ID} .mp-stat{padding:12px 8px;border:1px solid #57412e;border-radius:13px;background:#17100b}
    #${ID} .mp-number{font:24px Georgia;color:#e1bf82}
    #${ID} .mp-label{font-size:9px;color:#b8a28b;margin-top:5px}
    #${ID} .mp-heading{font-size:9px;letter-spacing:.2em;color:#d6ad75;margin:12px 0}
    #${ID} .mp-record{padding:11px;margin:8px 0;border:1px solid #57412e;border-radius:12px;background:#17100b}
    #${ID} .mp-title{font-size:13px;font-weight:650;color:#f4eade}
    #${ID} .mp-value{font:20px Georgia;color:#e1bf82;margin-top:5px}
    #${ID} .mp-date{font-size:10px;color:#a9947d;margin-top:4px}
    #${ID} .mp-empty{font-size:12px;color:#b8a28b;padding:12px;border:1px dashed #57412e;border-radius:12px}
    #${ID} .mp-note{font-size:10px;color:#9f8a73;line-height:1.5;margin-top:18px}
    #${ID} .mp-item{padding:10px 0;border-bottom:1px solid #57412e}
    @media(max-width:360px){#${ID} .mp-number{font-size:20px}#${ID} .mp-label{font-size:8px}}
  `;
  document.head.appendChild(style);

  function render() {
    const history = state.history || [];
    const weights = history.filter(x => x.field === 'weight' && String(x.value).trim());
    const recent = history.filter(x => x.source !== 'starting' &&
      Date.now() - new Date(x.at).getTime() < 7*86400000);
    const touched = new Set(history.map(x => x.key)).size;

    document.getElementById('mpStats').innerHTML = `
      <div class="mp-stat"><div class="mp-number">${touched}</div><div class="mp-label">EXERCISES</div></div>
      <div class="mp-stat"><div class="mp-number">${weights.length}</div><div class="mp-label">WEIGHTS</div></div>
      <div class="mp-stat"><div class="mp-number">${recent.length}</div><div class="mp-label">CHANGES · 7 DAYS</div></div>
    `;

    const groups = {};
    weights.forEach(x => {
      const m = String(x.value).trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
      if (!m) return;
      const unit = m[2].toLowerCase();
      const n = Number(m[1].replace(',','.'));
      const key = x.key + '|' + unit;
      if (!groups[key] || n > groups[key].number)
        groups[key] = {...x, number:n};
    });

    const best = Object.values(groups)
      .sort((a,b) => b.number-a.number).slice(0,8);

    document.getElementById('mpRecords').innerHTML = best.length
      ? best.map(x => `
        <div class="mp-record">
          <div class="mp-title">${safe(x.exercise)}</div>
          <div class="mp-value">${safe(x.value)}</div>
          <div class="mp-date">${x.source === 'starting' ? 'Starting point' : 'Best recorded weight'}</div>
        </div>`).join('')
      : '<div class="mp-empty">Log a weight to start building your records.</div>';

    const latest = [...history].sort((a,b) =>
      new Date(b.at)-new Date(a.at)).slice(0,12);

    document.getElementById('mpHistory').innerHTML = latest.length
      ? latest.map(x => `
        <div class="mp-item">
          <div class="mp-title">${safe(x.exercise)}</div>
          <div class="mp-date">${x.field === 'weight' ? 'Carga' : 'Repetições'}: <b style="color:#dfbd83">${safe(x.value)}</b> · ${x.source === 'starting' ? 'Starting point' : new Date(x.at).toLocaleDateString('en-US')}</div>
        </div>`).join('')
      : '<div class="mp-empty">Your history will appear here.</div>';
  }

  render();

  document.addEventListener('change', e => {
    const el = e.target;
    if (!el.matches('[data-field][data-key]')) return;
    const value = el.value.trim();
    if (!value) return;

    const key = el.dataset.key;
    const field = el.dataset.field;
    if (!['weight','reps'].includes(field)) return;

    state.history.push({
      key,
      exercise: exerciseName(key),
      field,
      value,
      at: new Date().toISOString(),
      source: 'edit'
    });

    save();
    render();
  });
  // MY PROGRESS — GRÁFICO DE EVOLUÇÃO
  const chartBox = document.createElement('div');
  chartBox.innerHTML = `
    <div class="mp-heading" style="margin-top:24px">STRENGTH EVOLUTION</div>
    <select id="mpExercise" style="width:100%;padding:12px;background:#17100b;color:#f5eee4;border:1px solid #57412e;border-radius:10px"></select>
    <div id="mpChart" style="margin-top:14px"></div>
  `;
  panel.insertBefore(chartBox, panel.querySelector('.mp-note'));

  function drawChart() {
    const selector = document.getElementById('mpExercise');
    const chart = document.getElementById('mpChart');
    if (!selector || !chart) return;

    const dated = (state.history || []).filter(x =>
      x.field === 'weight' && x.source !== 'starting' &&
      /^\d+(?:[.,]\d+)?/.test(String(x.value))
    );

    const names = [...new Set(dated.map(x => x.exercise))];

    if (!names.length) {
      selector.innerHTML = '<option>No dated records</option>';
      chart.innerHTML = '<div class="mp-empty">Update an exercise weight to start seeing your progress.</div>';
      return;
    }

    const previous = selector.value;
    selector.innerHTML = names.map(name =>
      `<option value="${safe(name)}">${safe(name)}</option>`
    ).join('');
    if (names.includes(previous)) selector.value = previous;

    const selected = selector.value;
    const entries = dated
      .filter(x => x.exercise === selected)
      .sort((a,b) => new Date(a.at)-new Date(b.at));

    const points = entries.map(x => ({
      value: Number(String(x.value).match(/^\d+(?:[.,]\d+)?/)[0].replace(',','.')),
      date: new Date(x.at)
    })).filter(x => Number.isFinite(x.value));

    if (!points.length) {
      chart.innerHTML = '<div class="mp-empty">There are no numeric weights recorded for this exercise.</div>';
      return;
    }

    if (points.length === 1) {
      chart.innerHTML = `
        <div class="mp-record">
          <div class="mp-value">${points[0].value}</div>
          <div class="mp-date">First dated entry · ${points[0].date.toLocaleDateString('en-US')}</div>
          <div class="mp-date">Add another weight to compare your progress.</div>
        </div>`;
      return;
    }

    const W=320,H=170,L=35,R=12,T=12,B=28;
    const min=Math.min(...points.map(p=>p.value));
    const max=Math.max(...points.map(p=>p.value));
    const range=max-min || 1;
    const coords=points.map((p,i)=>({
      x:L+i*(W-L-R)/(points.length-1),
      y:T+(max-p.value)*(H-T-B)/range,
      value:p.value
    }));
    const line=coords.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
    const circles=coords.map(p=>
      `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#e1bf82"/>`
    ).join('');

    chart.innerHTML=`
      <div class="mp-record">
        <div style="display:flex;justify-content:space-between;color:#b8a28b;font-size:10px;margin-bottom:8px">
          <span>${points.length} REGISTROS</span>
          <span>ÚLTIMA CARGA: ${points[points.length-1].value}</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Weight progress chart">
          <path d="${line}" fill="none" stroke="#d6ad75" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          ${circles}
          <text x="${L}" y="${H-5}" fill="#b8a28b" font-size="9">${points[0].date.toLocaleDateString('en-US')}</text>
          <text x="${W-R}" y="${H-5}" text-anchor="end" fill="#b8a28b" font-size="9">${points[points.length-1].date.toLocaleDateString('en-US')}</text>
        </svg>
      </div>`;
  }

  document.getElementById('mpExercise').addEventListener('change',drawChart);
  document.addEventListener('change',e=>{
    if(e.target.matches('[data-field="weight"][data-key]')) drawChart();
  });
  // CALENDÁRIO E CONSISTÊNCIA DE TREINO
const calBox=document.createElement('div');
calBox.id='mpCalendarBox';
calBox.innerHTML=`
  <div class="mp-heading" style="margin-top:24px">TRAINING CALENDAR</div>
  <div class="mp-calendar-stats" id="calStats"></div>
  <div class="mp-month-goal" id="mpMonthGoal"></div>
  <div class="mp-calendar">
    <div class="mp-calendar-head">
      <button type="button" id="calPrev">‹</button>
      <strong id="calMonth"></strong>
      <button type="button" id="calNext">›</button>
    </div>
    <div class="mp-weekdays">
      <span>MON</span><span>TUE</span><span>WED</span>
      <span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
    </div>
    <div class="mp-calendar-days" id="calDays"></div>
    <div class="mp-calendar-legend"><i></i> Workout day recorded</div>
  </div>
  <p class="mp-calendar-note">
    Your history starts being recorded from this update onward.
  </p>
`;
const calStatsAnchor=document.getElementById('mpStats');
if(calStatsAnchor) calStatsAnchor.insertAdjacentElement('afterend',calBox);
else panel.appendChild(calBox);

const calStyle=document.createElement('style');
calStyle.textContent=`
#mpCalendarBox{margin-top:20px;color:#e8dfd3}
#mpCalendarBox .mp-calendar-stats{
 display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0
}
#mpCalendarBox .cal-stat{
 background:#211914;border:1px solid #493626;border-radius:10px;
 padding:12px 5px;text-align:center
}
#mpCalendarBox .cal-stat strong{
 display:block;color:#d5b17a;font-size:22px;margin-bottom:4px
}
#mpCalendarBox .cal-stat span{font-size:9px;letter-spacing:1px;color:#b8a28b}
#mpCalendarBox .mp-month-goal{
 margin:12px 0;padding:14px;border:1px solid #d8c9a833;border-radius:14px;
 background:linear-gradient(145deg,#30271f,#17120e)
}
#mpCalendarBox .mp-month-goal-head{display:flex;justify-content:space-between;gap:8px;align-items:center}
#mpCalendarBox .mp-month-goal-label{font-size:9px;letter-spacing:.15em;color:#bdae98}
#mpCalendarBox .mp-month-goal-value{font-size:17px;font-weight:650;color:#e0cda8}
#mpCalendarBox .mp-month-goal-track{height:7px;margin-top:11px;border-radius:99px;background:#100d0b;overflow:hidden}
#mpCalendarBox .mp-month-goal-track span{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#a99576,#e3d2b2);box-shadow:0 0 12px #d8c9a833}
#mpCalendarBox .mp-month-goal-caption{margin-top:7px;color:#a99576;font-size:10px}
#mpCalendarBox .mp-calendar{
 background:#191512;border:1px solid #493626;border-radius:12px;padding:14px
}
#mpCalendarBox .mp-calendar-head{
 display:flex;align-items:center;justify-content:space-between;margin-bottom:16px
}
#mpCalendarBox .mp-calendar-head strong{color:#d9bd91;font-size:14px}
#mpCalendarBox .mp-calendar-head button{
 background:#302319;color:#e4c18b;border:1px solid #634a32;
 border-radius:7px;width:34px;height:32px;font-size:22px
}
#mpCalendarBox .mp-weekdays,#mpCalendarBox .mp-calendar-days{
 display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px
}
#mpCalendarBox .mp-weekdays span{
 text-align:center;color:#9e8b76;font-size:9px;padding-bottom:8px
}
#mpCalendarBox .cal-day{
 min-width:0;aspect-ratio:1;border-radius:7px;display:flex;
 align-items:center;justify-content:center;font-size:12px;
 color:#c9b9a7;background:#28221d
}
#mpCalendarBox .cal-day.empty{background:transparent}
#mpCalendarBox .cal-day.trained{
 background:#b18a55;color:#17110b;font-weight:800;
 box-shadow:inset 0 0 0 1px #e0bd85
}
#mpCalendarBox .cal-day.today{border:1px solid #e2c18f}
#mpCalendarBox .mp-calendar-legend{
 display:flex;align-items:center;gap:8px;margin-top:14px;
 color:#b8a28b;font-size:10px
}
#mpCalendarBox .mp-calendar-legend i{
 width:10px;height:10px;border-radius:3px;background:#b18a55
}
#mpCalendarBox .mp-calendar-note{
 color:#9e8b76;font-size:10px;line-height:1.5;margin-top:10px
}
@media(max-width:360px){
 #mpCalendarBox .mp-calendar{padding:9px}
 #mpCalendarBox .mp-calendar-days{gap:3px}
}
`;
document.head.appendChild(calStyle);

let calDate=new Date();
calDate.setDate(1);

function calDateKey(date){
 const y=date.getFullYear();
 const m=String(date.getMonth()+1).padStart(2,'0');
 const d=String(date.getDate()).padStart(2,'0');
 return `${y}-${m}-${d}`;
}

function calRegister(){
  const title=document.getElementById('dayTitle').textContent;
  const workout=WORKOUTS.find(w=>w.name===title);
  if(!workout) return;

  // Registra a data real em que o usuário concluiu o treino,
  // sem projetar o treino selecionado para outro dia da semana.
  const date=calDateKey(new Date());

  if(!state.trainingSessions) state.trainingSessions=[];
  if(!state.trainingSessions.some(s=>s.date===date)){
    state.trainingSessions.push({date:date,day:workout.name});
    save();
  }

  renderCalendar();
}

  

function renderCalendar(){
 if(!state.trainingSessions) state.trainingSessions=[];
 const sessions=state.trainingSessions;
 const dates=[...new Set(sessions.map(s=>s.date))];
 const today=calDateKey(new Date());
 const month=calDate.getMonth();
 const year=calDate.getFullYear();
 const first=new Date(year,month,1);
 const offset=(first.getDay()+6)%7;
 const total=new Date(year,month+1,0).getDate();

 document.getElementById('calMonth').textContent=
  calDate.toLocaleDateString('en-US',{month:'long',year:'numeric'});

 const monthCount=dates.filter(d=>d.startsWith(
  `${year}-${String(month+1).padStart(2,'0')}`
 )).length;

 const now=new Date();
 const monday=new Date(now);
 monday.setHours(0,0,0,0);
 monday.setDate(now.getDate()-((now.getDay()+6)%7));
 const weekCount=dates.filter(d=>{
  const x=new Date(d+'T00:00:00');
  return x>=monday && x<=now;
 }).length;

 let streak=0;
 const cursor=new Date();
 cursor.setHours(0,0,0,0);
 if(!dates.includes(calDateKey(cursor))) cursor.setDate(cursor.getDate()-1);
 while(dates.includes(calDateKey(cursor))){
  streak++;
  cursor.setDate(cursor.getDate()-1);
 }

 document.getElementById('calStats').innerHTML=`
  <div class="cal-stat"><strong>${monthCount}</strong><span>WORKOUTS THIS MONTH</span></div>
  <div class="cal-stat"><strong>${weekCount}</strong><span>THIS WEEK</span></div>
  <div class="cal-stat"><strong>${streak}</strong><span>DAY STREAK</span></div>
 `;
 const monthlyTarget=Array.from({length:total},(_,i)=>new Date(year,month,i+1).getDay()).filter(day=>day!==0).length;
 const monthlyPercent=Math.min(100,Math.round(monthCount/monthlyTarget*100));
 document.getElementById('mpMonthGoal').innerHTML=`
  <div class="mp-month-goal-head">
   <span class="mp-month-goal-label">MONTHLY GOAL · SUNDAYS OFF</span>
   <strong class="mp-month-goal-value">${monthCount} / ${monthlyTarget} workouts</strong>
  </div>
  <div class="mp-month-goal-track" role="progressbar" aria-label="Progresso da meta mensal" aria-valuemin="0" aria-valuemax="${monthlyTarget}" aria-valuenow="${Math.min(monthCount,monthlyTarget)}">
   <span style="width:${monthlyPercent}%"></span>
  </div>
  <div class="mp-month-goal-caption">${monthlyPercent}% of this month's goal completed · Sundays reserved for rest</div>
 `;

 let html='';
 for(let i=0;i<offset;i++) html+='<div class="cal-day empty"></div>';
 for(let day=1;day<=total;day++){
  const date=calDateKey(new Date(year,month,day));
  const trained=dates.includes(date);
  const isToday=date===today;
  html+=`<div class="cal-day ${trained?'trained':''} ${isToday?'today':''}">${day}</div>`;
 }
 document.getElementById('calDays').innerHTML=html;
}

document.getElementById('calPrev').addEventListener('click',()=>{
 calDate.setMonth(calDate.getMonth()-1);
 renderCalendar();
});
document.getElementById('calNext').addEventListener('click',()=>{
 calDate.setMonth(calDate.getMonth()+1);
 renderCalendar();
});

document.addEventListener('change',e=>{
 if(e.target.matches('[data-key].check') && e.target.checked){
  calRegister();
 }
});

const calCompleteButton=document.getElementById('completeDay');
if(calCompleteButton){
 calCompleteButton.addEventListener('click',calRegister);
}

renderCalendar();
 
// PREMIUM FUTURISTIC MY PROGRESS
const premium=document.createElement('style');
premium.textContent=`
#myProgressPanel {
  border-radius:22px;
  border:1px solid rgba(216,201,168,.34);
  background:
    radial-gradient(ellipse at 90% 0%,rgba(216,201,168,.13),transparent 40%),
    linear-gradient(145deg,#30271f,#1a1511,#100d0b);
  box-shadow:0 22px 55px #0007,inset 0 1px #ffffff12;
  overflow:hidden;
}
#myProgressPanel .sectionhead {
  font-family:ui-sans-serif,sans-serif!important;
  font-size:32px!important;
  font-weight:650!important;
  letter-spacing:-1.3px!important;
}
#myProgressPanel .mp-heading {
  display:flex;
  align-items:center;
  gap:10px;
  color:#d8c9a8;
  letter-spacing:.24em;
}
#myProgressPanel .mp-heading:after {
  content:"";
  height:1px;
  flex:1;
  background:linear-gradient(90deg,#d8c9a866,transparent);
}
#myProgressPanel .mp-stat {
  min-height:90px;
  border-radius:15px;
  border:1px solid #d8c9a833;
  background:linear-gradient(145deg,#3b3025,#17120e);
  box-shadow:inset 0 1px #ffffff12,0 10px 24px #0004;
  padding:14px 10px;
}
#myProgressPanel .mp-number {
  font:600 27px ui-sans-serif,sans-serif;
  color:#e7d8b9;
  letter-spacing:-1px;
}
#myProgressPanel .mp-label {
  font-size:8px;
  letter-spacing:1.3px;
  color:#bdae98;
}
#myProgressPanel .mp-record {
  border:1px solid #d8c9a833;
  border-radius:15px;
  background:linear-gradient(135deg,#352b21,#14100d);
  padding:14px;
  box-shadow:0 9px 22px #0003;
}
#myProgressPanel .mp-title {
  color:#f1e9dc;
  font-size:13px;
}
#myProgressPanel .mp-value {
  font:600 24px ui-sans-serif,sans-serif;
  color:#e0cda8;
}
#myProgressPanel .mp-item {
  border-bottom:1px solid #d8c9a822;
  padding:13px 4px;
}
#myProgressPanel .mp-empty {
  border-radius:14px;
  border-color:#d8c9a844;
  background:#17120e;
}
#myProgressPanel select {
  border:1px solid #d8c9a855!important;
  border-radius:12px!important;
  background:#211a15!important;
  color:#f1e9dc!important;
}
#mpCalendarBox .cal-stat {
  border-radius:14px;
  border:1px solid #d8c9a833;
  background:linear-gradient(145deg,#30271f,#17120e);
}
#mpCalendarBox .cal-stat strong {
  font:600 25px ui-sans-serif,sans-serif;
  color:#e0cda8;
}
#mpCalendarBox .mp-calendar {
  border-radius:16px;
  border:1px solid #d8c9a833;
  background:linear-gradient(145deg,#211a15,#15110e);
}
#mpCalendarBox .cal-day.trained {
  background:linear-gradient(145deg,#e2d2b1,#a99576);
  color:#17110b;
  box-shadow:0 0 14px #d8c9a833;
}
#mpCalendarBox .mp-calendar-head button {
  border-radius:10px;
  color:#e0cda8;
  border-color:#d8c9a844;
}
#myProgressPanel .mp-note {
  color:#aa9a84;
}
@media(prefers-reduced-motion:no-preference) {
  #myProgressPanel .mp-stat,
  #myProgressPanel .mp-record {
    transition:transform .2s,border-color .2s;
  }
  #myProgressPanel .mp-stat:active,
  #myProgressPanel .mp-record:active {
    transform:translateY(-2px);
  }
}
`;
document.head.appendChild(premium);


  // PERFORMANCE DASHBOARD — WEEKLY ACTIVITY + LOAD PROGRESSION
  const dashStyle=document.createElement('style');
  dashStyle.textContent=`
    #mpPerformance{margin:18px 0 22px;padding:16px;border:1px solid rgba(216,201,168,.28);border-radius:18px;background:radial-gradient(ellipse at 100% 0%,rgba(216,201,168,.12),transparent 48%),linear-gradient(145deg,#30271f,#17120f);box-shadow:0 16px 34px #0004}
    #mpPerformance .mp-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:13px 0 20px}
    #mpPerformance .mp-kpi{padding:12px 8px;border:1px solid #d8c9a833;border-radius:13px;background:linear-gradient(145deg,#3a3026,#1a1511);min-width:0}
    #mpPerformance .mp-kpi strong{display:block;font:600 25px ui-sans-serif,sans-serif;color:#e3d2b2;letter-spacing:-1px}
    #mpPerformance .mp-kpi span{display:block;margin-top:5px;color:#bdae98;font-size:8px;letter-spacing:.12em;line-height:1.4}
    #mpPerformance .mp-chart{padding:12px 9px;border:1px solid #d8c9a822;border-radius:14px;background:#17120f}
    #mpPerformance .mp-chart svg{display:block;width:100%;height:auto;overflow:visible}
    #mpPerformance .mp-chart-label{font-size:9px;fill:#bdae98}
    #mpPerformance .mp-week-bars{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:7px;align-items:end;height:112px;margin-top:10px}
    #mpPerformance .mp-week{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:7px;min-width:0}
    #mpPerformance .mp-week b{font-size:9px;color:#e3d2b2;font-weight:600}
    #mpPerformance .mp-week i{display:block;width:100%;max-width:22px;min-height:3px;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,#e6d7b8,#9f8968);box-shadow:0 0 13px #d8c9a833}
    #mpPerformance .mp-week small{font-size:8px;color:#a99576}
    #mpPerformance .mp-subtitle{font-size:9px;letter-spacing:.2em;color:#d8c9a8;margin:18px 0 8px}
    @media(max-width:360px){#mpPerformance{padding:12px}#mpPerformance .mp-kpi strong{font-size:21px}}
  `;
  document.head.appendChild(dashStyle);
  const performance=document.createElement('section');
  performance.id='mpPerformance';
  performance.innerHTML=`
    <div class="mp-heading">PERFORMANCE DASHBOARD</div>
    <div class="mp-kpis" id="mpPerformanceKpis"></div>
    <div class="mp-subtitle">TRAINING FREQUENCY · LAST 8 WEEKS</div>
    <div class="mp-chart"><div class="mp-week-bars" id="mpWeeklyBars"></div></div>
    <div class="mp-subtitle">STRENGTH EVOLUTION</div>
    <div class="mp-chart" id="mpStrengthSummary"></div>
  `;
  const statsAnchor=document.getElementById('mpStats');
  if(statsAnchor) statsAnchor.insertAdjacentElement('afterend',performance);

  function renderPerformance(){
    const sessions=Array.isArray(state.trainingSessions)?state.trainingSessions:[];
    const uniqueDates=[...new Set(sessions.map(s=>s.date).filter(Boolean))].sort();
    const now=new Date(); now.setHours(23,59,59,999);
    const weekStart=new Date(now); weekStart.setDate(now.getDate()-((now.getDay()+6)%7)-0);
    weekStart.setHours(0,0,0,0);
    const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
    const thisWeek=uniqueDates.filter(d=>{const x=new Date(d+'T00:00:00');return x>=weekStart&&x<=now;}).length;
    const thisMonth=uniqueDates.filter(d=>{const x=new Date(d+'T00:00:00');return x>=monthStart&&x<=now;}).length;
    const updatedLoads=(state.history||[]).filter(x=>x.field==='weight'&&x.source!=='starting');
    const activeExercises=new Set(updatedLoads.map(x=>x.key)).size;
    document.getElementById('mpPerformanceKpis').innerHTML=`
      <div class="mp-kpi"><strong>${thisWeek}</strong><span>TREINOS THIS WEEK</span></div>
      <div class="mp-kpi"><strong>${thisMonth}</strong><span>WORKOUTS THIS MONTH</span></div>
      <div class="mp-kpi"><strong>${activeExercises}</strong><span>EXERCISES COM CARGA ATUALIZADA</span></div>`;
    const weeks=[];
    for(let i=7;i>=0;i--){
      const end=new Date(weekStart); end.setDate(end.getDate()-i*7+6); end.setHours(23,59,59,999);
      const start=new Date(end); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
      const count=uniqueDates.filter(d=>{const x=new Date(d+'T00:00:00');return x>=start&&x<=end;}).length;
      weeks.push({label:start.toLocaleDateString('en-US',{day:'2-digit',month:'2-digit'}),count});
    }
    const maxCount=Math.max(1,...weeks.map(w=>w.count));
    document.getElementById('mpWeeklyBars').innerHTML=weeks.map(w=>`
      <div class="mp-week"><b>${w.count||''}</b><i style="height:${Math.max(3,w.count/maxCount*76)}px"></i><small>${w.label}</small></div>`).join('');
    const dated=updatedLoads.map(x=>({value:Number(String(x.value).match(/^\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.')),at:new Date(x.at)})).filter(x=>Number.isFinite(x.value)).sort((a,b)=>a.at-b.at);
    const summary=document.getElementById('mpStrengthSummary');
    if(dated.length<2){
      summary.innerHTML='<div class="mp-empty">Registre a carga de um exercício em mais de um treino para visualizar a evolução aqui.</div>';
    }else{
      const first=dated[0].value,last=dated[dated.length-1].value;
      const change=first===0?null:((last-first)/first*100);
      const points=dated.slice(-12);
      const W=320,H=104,L=8,R=8,T=10,B=10,min=Math.min(...points.map(x=>x.value)),max=Math.max(...points.map(x=>x.value)),range=max-min||1;
      const coords=points.map((p,i)=>({x:L+i*(W-L-R)/Math.max(1,points.length-1),y:T+(max-p.value)*(H-T-B)/range}));
      const line=coords.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
      const area=line+` L ${coords[coords.length-1].x} ${H-B} L ${coords[0].x} ${H-B} Z`;
      summary.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:end;gap:8px;margin-bottom:8px">
          <div><div style="font-size:9px;color:#bdae98;letter-spacing:.13em">PRIMEIRO → ÚLTIMO REGISTRO</div><strong style="font:600 22px ui-sans-serif;color:#e3d2b2">${first} → ${last}</strong></div>
          <strong style="font-size:12px;color:#d8c9a8">${change===null?'—':(change>0?'+':'')+change.toFixed(1)+'%'}</strong>
        </div>
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução das cargas registradas">
          <defs><linearGradient id="mpAreaGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e3d2b2" stop-opacity=".38"/><stop offset="100%" stop-color="#a99576" stop-opacity="0"/></linearGradient><filter id="mpGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <path d="${area}" fill="url(#mpAreaGold)"/><path d="${line}" fill="none" stroke="#e3d2b2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#mpGlow)"/>
          ${coords.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" fill="#f0dfbd" stroke="#8e7959" stroke-width="1"/>`).join('')}
        </svg>
        <div style="font-size:9px;color:#a99576">Últimos ${points.length} registros de carga · valores registrados</div>`;
    }
  }
  renderPerformance();
  document.addEventListener('change',e=>{
    if(e.target.matches('[data-field][data-key]')) renderPerformance();
    if(e.target.matches('[data-key].check')&&e.target.checked) renderPerformance();
  });
  const completeForDashboard=document.getElementById('completeDay');
  if(completeForDashboard) completeForDashboard.addEventListener('click',()=>setTimeout(renderPerformance,0));
  drawChart();})();
