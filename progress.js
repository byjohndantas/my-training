
/* MY TRAINING — MY PROGRESS */
(() => {
  const ID = 'myProgressPanel';

  const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(state));
  };

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
    <p class="muted">Sua evolução, carga e consistência.</p>
    <div id="mpStats" class="mp-stats"></div>
    <div class="mp-heading">PERSONAL RECORDS</div>
    <div id="mpRecords"></div>
    <div class="mp-heading" style="margin-top:22px">PROGRESS HISTORY</div>
    <div id="mpHistory"></div>
    <p class="mp-note">Atualize suas cargas e repetições para acompanhar sua evolução ao longo do tempo.</p>
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
      <div class="mp-stat"><div class="mp-number">${touched}</div><div class="mp-label">EXERCÍCIOS</div></div>
      <div class="mp-stat"><div class="mp-number">${weights.length}</div><div class="mp-label">CARGAS</div></div>
      <div class="mp-stat"><div class="mp-number">${recent.length}</div><div class="mp-label">ALTERAÇÕES · 7 DIAS</div></div>
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
          <div class="mp-date">${x.source === 'starting' ? 'Ponto de partida' : 'Melhor carga registrada'}</div>
        </div>`).join('')
      : '<div class="mp-empty">Registre uma carga para começar seus recordes.</div>';

    const latest = [...history].sort((a,b) =>
      new Date(b.at)-new Date(a.at)).slice(0,12);

    document.getElementById('mpHistory').innerHTML = latest.length
      ? latest.map(x => `
        <div class="mp-item">
          <div class="mp-title">${safe(x.exercise)}</div>
          <div class="mp-date">${x.field === 'weight' ? 'Carga' : 'Repetições'}: <b style="color:#dfbd83">${safe(x.value)}</b> · ${x.source === 'starting' ? 'Ponto de partida' : new Date(x.at).toLocaleDateString('pt-BR')}</div>
        </div>`).join('')
      : '<div class="mp-empty">Seu histórico aparecerá aqui.</div>';
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
      selector.innerHTML = '<option>Sem registros datados</option>';
      chart.innerHTML = '<div class="mp-empty">Atualize a carga de um exercício para começar a visualizar sua evolução.</div>';
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
      chart.innerHTML = '<div class="mp-empty">Não há cargas numéricas para este exercício.</div>';
      return;
    }

    if (points.length === 1) {
      chart.innerHTML = `
        <div class="mp-record">
          <div class="mp-value">${points[0].value}</div>
          <div class="mp-date">Primeiro registro datado · ${points[0].date.toLocaleDateString('pt-BR')}</div>
          <div class="mp-date">Adicione outra carga para comparar sua evolução.</div>
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
        <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de evolução da carga">
          <path d="${line}" fill="none" stroke="#d6ad75" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          ${circles}
          <text x="${L}" y="${H-5}" fill="#b8a28b" font-size="9">${points[0].date.toLocaleDateString('pt-BR')}</text>
          <text x="${W-R}" y="${H-5}" text-anchor="end" fill="#b8a28b" font-size="9">${points[points.length-1].date.toLocaleDateString('pt-BR')}</text>
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
  <div class="mp-calendar">
    <div class="mp-calendar-head">
      <button type="button" id="calPrev">‹</button>
      <strong id="calMonth"></strong>
      <button type="button" id="calNext">›</button>
    </div>
    <div class="mp-weekdays">
      <span>SEG</span><span>TER</span><span>QUA</span>
      <span>QUI</span><span>SEX</span><span>SÁB</span><span>DOM</span>
    </div>
    <div class="mp-calendar-days" id="calDays"></div>
    <div class="mp-calendar-legend"><i></i> Dia de treino registrado</div>
  </div>
  <p class="mp-calendar-note">
    Seu histórico começa a ser registrado a partir desta atualização.
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

  const index=WORKOUTS.indexOf(workout);
  const now=new Date();
  const monday=new Date(now);
  monday.setHours(0,0,0,0);
  monday.setDate(now.getDate()-((now.getDay()+6)%7));

  const trainingDate=new Date(monday);
  trainingDate.setDate(monday.getDate()+index);

  const date=calDateKey(trainingDate);

  if(!state.trainingSessions) state.trainingSessions=[];
  if(!state.trainingSessions.some(s=>s.date===date)){
    state.trainingSessions.push({date:date,day:workout.name});
    save();
  }

  renderCalendar();
}
 
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
  <div class="cal-stat"><strong>${monthCount}</strong><span>TREINOS NO MÊS</span></div>
  <div class="cal-stat"><strong>${weekCount}</strong><span>ESTA SEMANA</span></div>
  <div class="cal-stat"><strong>${streak}</strong><span>DIAS SEGUIDOS</span></div>
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
  drawChart();})();
