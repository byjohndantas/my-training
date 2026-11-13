
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
})();
