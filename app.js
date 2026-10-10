import { WORKOUTS, WEEK, DEFAULTS } from './config.js';
import { createSession, current, plan, start, complete, tick, finishRest, pause, resume, endWorkout, restStats, restRemaining, cardioAction, cardioElapsed, deadlineRemaining } from './engine.js';
import { initializeTiming, timingSummary } from './timing.js';
import { localDay, weeklyConsistency, exerciseProgress } from './metrics.js';
import { weekChart, exerciseChart } from './charts.js';
import { openDB, allSessions, saveSession, getSettings, saveSettings, deleteSessions, validateBackup, importBackup } from './storage.js';
const app = document.querySelector('#app');
let settings, sessions = [], session, view = 'home', selected = WEEK[new Date().getDay()].workout, busy = false, wake, deferredInstall, registration;
let selecting=false, selectedIds=new Set(), points=[], weeks=[], filters={exercise:'',range:'month',side:'right',metric:'reps',week:localDay(Date.now())};
const brokenImages=new Set();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const fmt = n => { n = Math.max(0, Math.ceil(n || 0)); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; };
const signedRest = s => { const n=restRemaining(s); return n<=-1 ? `-${fmt(Math.floor(-n))}` : s.state==='REST_FINISHED' ? '00:00' : fmt(n); };
const date = n => new Date(n).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short', hour12:false });
const button = (text, action, cls = 'primary', data = '') => `<button class="${cls}" data-action="${action}" ${data}>${text}</button>`;
let writes = Promise.resolve();
function persist() { session.updatedAt=Date.now(); const snapshot = structuredClone(session); writes = writes.catch(() => {}).then(() => saveSession(snapshot)); return writes; }
function notice(text) { document.querySelector('#notice').textContent = text; setTimeout(() => document.querySelector('#notice').textContent = '', 5500); }
function morning() {
  const left = deadlineRemaining(settings), now = new Date();
  return `<div class="morning ${left <= 300 ? 'urgent' : left <= 900 ? 'short' : ''}"><span data-clock>${now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', hour12:false })}</span><span data-limit>${left > 0 ? `${Math.floor(left / 60)} min até ${settings.deadline}` : `Horário-limite ${settings.deadline} atingido`}</span></div>`;
}
function shell(content, nav = false) {
  const dark = view === 'workout' && session?.state === 'RESTING', red = view === 'workout' && session?.state === 'REST_FINISHED';
  document.body.className = dark ? 'dark' : red ? 'red' : (view === 'workout' && ['READY','ACTIVE_REPS','ACTIVE_TIMED'].includes(session?.state)) ? 'executing' : '';
  app.innerHTML = `<header><a href="#" data-action="home" class="brand"><span class="brand-mark">m.</span> meu treino</a><span class="local-badge">NO SEU RITMO</span></header>${morning()}<main>${content}</main>${nav ? `<nav aria-label="Navegação">${button('Hoje', 'home', view === 'home' ? 'nav active' : 'nav')}${button('Histórico', 'history', view === 'history' ? 'nav active' : 'nav')}${button('Evolução', 'evolution', view === 'evolution' ? 'nav active' : 'nav')}${button('Ajustes', 'settings', view === 'settings' ? 'nav active' : 'nav')}</nav>` : ''}<footer>Seu treino. Seus dados. No seu dispositivo.</footer>`;
}
const today = () => WEEK[new Date().getDay()];
function resumable() { return sessions.filter(s => !s.finalized && (s.state !== 'COMPLETED' || ['ACTIVE','PAUSED'].includes(s.cardio.state) || s.results.length)).sort((a,b) => b.startedAt - a.startedAt)[0]; }
function home() {
  view = 'home'; const t = today(), w = WORKOUTS[selected], recover = resumable();
  shell(`<div class="eyebrow">${esc(new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' }))}</div><h1>Uma série.<br>De cada vez.</h1><p class="muted">Sua rotina da manhã, pronta para começar.</p>
  ${recover ? `<div class="resume-card"><div><strong>Continue de onde parou</strong><p>${esc(recover.name)} · ${recover.results.length}/${recover.steps.length} séries</p></div>${button('RETOMAR TREINO', 'recover', 'primary', `data-id="${esc(recover.id)}"`)}</div>` : ''}
  <section class="hero-card"><div class="eyebrow">${selected === t.workout ? 'PROGRAMADO PARA HOJE' : 'ESCOLHA PARA ESTA SESSÃO'}</div><h2>${esc(w?.name || 'Dia de corrida')}</h2><div class="stats"><div><strong>${w?.exercises.length || '—'}</strong><span>exercícios</span></div><div><strong>${w ? plan(w).length : '—'}</strong><span>${w?.mode === 'circuit' ? 'etapas · 3 voltas' : 'séries'}</span></div><div><strong>${settings.start}</strong><span>início habitual</span></div></div><div class="cardio-line"><span>↗</span><div><strong>${esc(t.cardio)} · ${t.minutes} min</strong><p>${w ? 'Depois do treino, quando você decidir.' : 'Cronômetro com início e término manuais.'}</p></div></div>${button(w ? 'COMEÇAR TREINO →' : 'PREPARAR CARDIO →', 'new')}</section>
  <label class="select-label">Escolher outro treino<select id="workout-choice"><option value="" ${!selected ? 'selected' : ''}>Somente cardio</option>${Object.entries(WORKOUTS).map(([k,v]) => `<option value="${k}" ${k === selected ? 'selected' : ''}>${v.name}</option>`).join('')}</select></label>
  ${w ? `<section><div class="section-label">SEU TREINO <span>${w.mode === 'circuit' ? 'CIRCUITO · 3 VOLTAS' : 'SÉRIES POR EXERCÍCIO'}</span></div><div class="exercise-list">${w.exercises.map((e,i) => `<div><span class="number">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(e.name)}</strong><p>${e.sets} × ${esc(e.target)}${e.unilateral ? ' · dois lados' : ''}</p></div></div>`).join('')}</div></section>` : ''}
  <details class="week"><summary>Sua semana de treino</summary>${WEEK.map((d,i) => `<div class="week-row ${i === new Date().getDay() ? 'today' : ''}"><strong>${d.day.split('-')[0]}</strong><span>${WORKOUTS[d.workout]?.name || 'Sem musculação'}<small>${d.cardio} · ${d.minutes} min</small></span></div>`).join('')}</details>${deferredInstall ? button('Instalar aplicativo', 'install', 'secondary') : ''}<p class="offline" id="offline-status">${navigator.onLine ? 'Disponível sem serviços pagos.' : 'Você está offline.'}</p>`, true);
}
function media(e) {
  if (e.image && !brokenImages.has(e.image)) return `<div class="demo"><img id="exercise-image" src="./assets/exercises/${e.image}/frame-1.svg" alt="Demonstração de ${esc(e.name)}"><span>DEMONSTRAÇÃO DO MOVIMENTO</span></div><p class="image-note">${esc(e.imageNote || 'Ilustração de referência. Faça o movimento com controle.')}</p>`;
  return `<div class="demo pending"><span class="pending-symbol">↔</span><strong>${esc(e.name)}</strong><span>IMAGEM VERIFICADA PENDENTE</span></div>`;
}
function repFields(e, draft = {}) {
  const field = (key, label) => `<label>${label}<input name="${key}" type="number" inputmode="numeric" min="0" max="999" step="1" required value="${esc(draft[key])}" placeholder="—"></label>`;
  return e.unilateral ? `<div class="side-title"><span>Complete os dois lados</span>${button('Trocar ordem ⇄', 'swap', 'text-button')}</div><div class="rep-grid ${draft.leftFirst ? 'left-first' : ''}">${field('right', 'Direito')}${field('left', 'Esquerdo')}</div>` : field('reps', 'Repetições realizadas');
}
function loadField(draft = {}) { return `<label class="load">Carga (kg) · opcional<input name="load" type="number" min="0" max="1000" step="0.1" inputmode="decimal" value="${esc(draft.load)}" placeholder="Sem carga informada"></label>`; }
function workout() {
  view = 'workout'; if (session.state === 'COMPLETED') return summary();
  const s = session, step = current(s), e = step.exercise, done = s.results.length, total = s.steps.length;
  const top = `<div class="workout-top"><span class="eyebrow">${esc(s.name)}</span>${button('Pausar', 'pause', 'text-button')}</div><div class="progress"><div style="width:${done / total * 100}%"></div></div>`;
  if (s.state === 'PAUSED') {
    shell(`<div class="eyebrow">${esc(s.name)}</div><h1>Um respiro.</h1><p>Sua sessão está pausada. As séries registradas estão salvas.</p><section class="hero-card"><h2>${esc(e.name)}</h2><p>${done} de ${total} etapas concluídas</p>${button('RETOMAR SESSÃO', 'resume')}${button('VOLTAR AO INÍCIO', 'home', 'secondary')}${button('ENCERRAR ANTECIPADAMENTE', 'abandon', 'text-button danger')}</section>`); return;
  }
  if (['RESTING','REST_FINISHED'].includes(s.state)) {
    const resting = s.state === 'RESTING';
    shell(`${top}<section class="rest-screen"><div class="eyebrow">${resting ? 'RECUPERE O FÔLEGO' : 'DESCANSO CONCLUÍDO'}</div><h1>${resting ? 'Descansando.' : 'Hora de treinar!'}</h1>
      <div class="timer" data-timer>${signedRest(s)}</div>
      <progress id="rest-progress" max="${s.restPlannedSeconds || 1}" value="${Math.max(0,restRemaining(s))}" aria-label="Tempo de descanso restante"></progress>
      <p class="rest-excess" data-rest-excess>${resting ? `Programado: ${fmt(s.restPlannedSeconds)}` : `Excedente: ${fmt(Math.floor(restStats(s).excessSeconds))} · descanso real: ${fmt(Math.floor(restStats(s).actualSeconds))}`}</p>
      <div class="next"><span>A SEGUIR · ${s.mode === 'circuit' ? `VOLTA ${step.round} DE 3` : `SÉRIE ${step.set} DE ${e.sets}`}</span><h2>${esc(e.name)}</h2><p>${esc(e.target)}</p></div>
      ${resting ? `<div class="adjust">${button('+15s', 'add15', 'secondary')}${button('+30s', 'add30', 'secondary')}</div>${button('PULAR DESCANSO', 'skip-rest', 'secondary')}` : button(s.steps[s.index-1]?.exercise.id === e.id ? 'INICIAR PRÓXIMA SÉRIE' : 'INICIAR PRÓXIMO EXERCÍCIO', 'start')}</section>`); return;
  }
  const timed = e.seconds, active = s.state === 'ACTIVE_TIMED', ready = s.state === 'READY';
  shell(`${top}<div class="eyebrow step-label">${s.mode === 'circuit' ? `VOLTA ${step.round} DE 3 · EXERCÍCIO ${(s.index % 4)+1} DE 4` : `SÉRIE ${step.set} DE ${e.sets}`}</div><h1 class="exercise-title">${esc(e.name)}</h1>${media(e)}<div class="target"><span>META</span><strong>${esc(e.target)}</strong><small>${e.unilateral ? 'Ambos os lados = uma série' : `${done + 1} de ${total} etapas`}</small></div><p class="cue">${esc(e.cue)}</p><form id="set-form">${timed ? `${active ? `<div class="timer compact" data-timer>${fmt((s.timerEnd - Date.now())/1000)}</div><progress id="timed-progress" max="${e.seconds}" value="${Math.max(0,(s.timerEnd-Date.now())/1000)}" aria-label="Tempo do exercício restante"></progress>` : '<p>O cronômetro começa quando você tocar em iniciar.</p>'}${loadField(s.draft)}${button(active ? 'ENCERRAR SÉRIE AGORA' : 'INICIAR SÉRIE · 60s', active ? 'end-timed' : 'start')}` : `${ready ? button('INICIAR SÉRIE', 'start') : `${repFields(e, s.draft)}${loadField(s.draft)}${e.sideNote ? `<label>Lado / observação (opcional)<input name="side" value="${esc(s.draft?.side)}" placeholder="Total realizado, lado alternado…" maxlength="80"></label>` : ''}<button type="submit" class="primary">CONCLUÍ A SÉRIE ✓</button>`}`}</form><p class="saved-label">${done} de ${total} séries registradas · salvamento automático</p>`);
}
function summary() {
  view = 'summary'; const s = session, left = deadlineRemaining(settings), c = s.cardio, elapsed = cardioElapsed(c), actual = s.endedAt || Date.now();
  shell(`<div class="eyebrow">${s.steps.length ? 'SESSÃO REGISTRADA' : 'SEU CARDIO DE HOJE'}</div><h1>${s.steps.length ? (s.results.length === s.steps.length ? 'Treino feito.' : 'Até a próxima.') : 'Vamos em frente.'}</h1><p class="muted">${esc(s.name)} · ${date(s.startedAt)}</p>${s.steps.length ? `<div class="stats summary-stats"><div><strong>${fmt((actual-s.startedAt)/1000)}</strong><span>duração do treino</span></div><div><strong>${s.results.length}/${s.steps.length}</strong><span>séries realizadas</span></div></div>${timeDetails(s)}${resultList(s)}${s.index < s.steps.length ? `<details><summary>Etapas não realizadas (${s.steps.length-s.index})</summary>${s.steps.slice(s.index).map(t => `<p>${esc(t.exercise.name)} · série ${t.set}</p>`).join('')}</details>` : ''}` : ''}
  <section class="hero-card"><div class="eyebrow">CARDIO PLANEJADO</div><h2>${esc(c.name)} · ${c.plannedSeconds/60} min</h2><p>${Math.floor(left/60)} minutos disponíveis até ${settings.deadline}.</p>${left < c.plannedSeconds && c.state === 'READY' ? '<p class="conflict">O cardio planejado ultrapassa o tempo disponível. Você pode fazer menos tempo ou finalizar sem cardio.</p>' : ''}<p>Planejado: ${fmt(c.plannedSeconds)} · realizado: <strong data-cardio>${fmt(elapsed)}</strong></p>${c.state === 'ACTIVE' ? `<div class="timer compact" data-cardio>${fmt(elapsed)}</div>${button('PAUSAR CARDIO', 'cardio-pause')}${button('CONCLUIR CARDIO', 'cardio-finish', 'secondary')}` : c.state === 'PAUSED' ? `${button('RETOMAR CARDIO', 'cardio-start')}${button('CONCLUIR CARDIO', 'cardio-finish', 'secondary')}` : c.state === 'READY' ? `<label>Meta desta sessão (minutos)<input id="cardio-target" type="number" inputmode="numeric" min="1" max="240" value="${c.plannedSeconds/60}"></label>${button('INICIAR CARDIO', 'cardio-start')}` : '<p class="success">Cardio concluído e salvo.</p>'}<p class="muted small">O cronômetro não encerra o cardio automaticamente.</p></section>${button('SALVAR E FINALIZAR', 'finalize', 'secondary')}`);
}
function resultList(s, edit = false) {
  return `<div class="result-list">${s.results.map((r,i) => `<div><strong>${esc(r.name)}</strong><span>${r.round ? `Volta ${r.round}` : `Série ${r.set}`} · ${r.durationSeconds != null ? `${Math.round(r.durationSeconds)}s` : r.right != null ? `D ${r.right} / E ${r.left}` : `${r.reps} reps`}${r.load != null ? ` · ${r.load} kg` : ''}${r.side ? ` · ${esc(r.side)}` : ''}</span>${r.activeSeconds != null ? `<small>Execução${r.activeTimingPartial ? ' parcial medida' : ''}: ${fmt(Math.floor(r.activeSeconds))}</small>` : ''}${edit ? button('Editar registro', 'edit-result', 'text-button', `data-id="${esc(s.id)}" data-index="${i}"`) : ''}</div>`).join('')}</div>`;
}
function timeDetails(s) {
  if(!s.steps.length) return '';
  const t=timingSummary(s,s.state==='COMPLETED' ? Date.now() : s.updatedAt || Date.now());
  const duration=n=>n==null ? 'Indisponível' : fmt(Math.floor(n));
  return `<section class="time-details"><h2>Tempos do treino</h2><dl><div><dt>Tempo total</dt><dd>${duration(t.totalSeconds)}</dd></div>${t.available ? [['Tempo ativo',t.active],['Descanso real (inclui excedentes)',t.rest],['Preparação / transições',t.preparation],['Pausas manuais',t.pause]].map(([label,value])=>`<div><dt>${label}</dt><dd>${duration(value)}</dd></div>`).join('') : '<p class="muted small">Tempo ativo, preparação, pausas e descanso completo indisponíveis nesta sessão antiga.</p>'}</dl>${t.partial ? '<p class="muted small">Medição parcial: categorias disponíveis somente a partir da retomada na versão atual. Tempos anteriores não foram estimados.</p>' : ''}
    ${s.rests.length ? `<details><summary>Intervalos de descanso (${s.rests.length})</summary>${s.rests.map((r,i)=>`<p>Intervalo ${i+1} · após a etapa ${r.afterStep+1}<br>Programado: ${duration(r.plannedSeconds)} · excedente: ${r.excessSeconds==null ? 'indisponível (registro antigo)' : duration(r.excessSeconds)} · ${r.excessSeconds==null ? 'tempo registrado' : 'descanso real'}: ${duration(r.actualSeconds)}</p>`).join('')}</details>` : ''}</section>`;
}
async function history() {
  view = 'history'; sessions = await allSessions();
  shell(`<div class="eyebrow">SEU CAMINHO ATÉ AQUI</div><div class="history-heading"><h1>Histórico.</h1>${sessions.length && !selecting ? button('Selecionar','select-history','text-button') : ''}</div><p class="muted">Resultados reais, registrados por você.</p>
    ${selecting ? `<div class="selection-tools">${button(`Excluir selecionados (${selectedIds.size})`,'delete-selected','secondary',selectedIds.size ? '' : 'disabled')}${button('Cancelar','cancel-selection','text-button')}</div>` : ''}
    ${sessions.length ? `<label>Comparar um exercício<select id="compare"><option value="">Escolha um exercício</option>${[...new Map(sessions.flatMap(s => s.results.map(r => [r.exerciseId, r.name]))).entries()].map(([id,name]) => `<option value="${esc(id)}">${esc(name)}</option>`).join('')}</select></label><div id="comparison"></div>${sessions.sort((a,b) => b.startedAt-a.startedAt).map(s => `<div class="history-entry">${selecting ? `<label class="session-select"><input type="checkbox" data-session-select="${esc(s.id)}" ${selectedIds.has(s.id) ? 'checked' : ''} aria-label="Selecionar ${esc(s.name)} de ${date(s.startedAt)}"></label>` : ''}<details class="history-card"><summary><span><strong>${esc(s.name)}</strong><small>${date(s.startedAt)} · ${esc(s.status)}</small></span><b>${s.results.length}/${s.steps.length}</b></summary><p>Rotina ${esc(s.version)}</p>${timeDetails(s)}${resultList(s,true)}<p>Cardio: ${esc(s.cardio.name)} · previsto ${fmt(s.cardio.plannedSeconds)} · realizado ${fmt(cardioElapsed(s.cardio))} · ${esc(s.cardio.state === 'COMPLETED' ? 'concluído' : s.cardio.state === 'READY' ? 'não iniciado' : 'em andamento / pausado')}</p>${!s.finalized ? button('RETOMAR SESSÃO', 'recover', 'secondary', `data-id="${esc(s.id)}"`) : ''}${button('Excluir esta sessão','delete-one','text-button danger',`data-id="${esc(s.id)}"`)}</details></div>`).join('')}` : '<section class="empty"><span>↗</span><h2>O primeiro passo conta.</h2><p>Suas sessões aparecerão aqui depois de começar um treino.</p></section>'}`, true);
}
async function evolution() {
  view='evolution';sessions=await allSessions();
  const choices=new Map(Object.values(WORKOUTS).flatMap(w=>w.exercises.map(e=>[e.id,e.name])));
  for(const s of sessions) for(const r of s.results) choices.set(r.exerciseId,r.name);
  filters.exercise ||= choices.keys().next().value;
  const anchor=new Date(`${filters.week}T12:00:00`); weeks=weeklyConsistency(sessions,+anchor);
  points=exerciseProgress(sessions,filters.exercise,filters);
  const unilateral=sessions.some(s=>s.results.some(r=>r.exerciseId===filters.exercise && r.right!=null));
  shell(`<div class="eyebrow">SEUS RESULTADOS REAIS</div><h1>Evolução.</h1><section class="settings-section"><h2>Consistência semanal</h2><p class="muted small">Força e core: 6 treinos programados por semana. Cada dia cumprido conta uma vez; treinos adicionais aparecem como extras. Cardio é contado separadamente.</p><label>Semanas até a data<input id="week-anchor" type="date" value="${filters.week}"></label>${weekChart(weeks)}<p class="chart-legend"><span>● Programados cumpridos</span><span class="muted">● Extras</span></p><p id="week-info" class="chart-info">Toque em uma semana para ver os detalhes.</p></section>
    <section class="settings-section"><h2>Por exercício</h2><label>Exercício<select id="evolution-exercise">${[...choices].map(([id,name])=>`<option value="${esc(id)}" ${id===filters.exercise ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label><div class="rep-grid"><label>Período<select id="evolution-range">${[['month','Mês atual'],['30','Últimos 30 dias'],['90','Últimos 90 dias'],['all','Todo o histórico']].map(([key,label])=>`<option value="${key}" ${filters.range===key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Métrica<select id="evolution-metric"><option value="reps" ${filters.metric==='reps' ? 'selected' : ''}>Repetições</option><option value="seconds" ${filters.metric==='seconds' ? 'selected' : ''}>Tempo (segundos)</option></select></label></div>${unilateral ? `<label>Lado comparado<select id="evolution-side"><option value="right" ${filters.side==='right' ? 'selected' : ''}>Direito</option><option value="left" ${filters.side==='left' ? 'selected' : ''}>Esquerdo</option></select></label>` : ''}${exerciseChart(points,filters.metric)}<p class="muted small">Referência: maior resultado válido por sessão; no empate, maior carga na mesma série. Carga ausente é desconhecida e deixa uma lacuna no gráfico. Toque em um ponto para ver o registro.</p><p id="point-info" class="chart-info">${points.length} sessões com dados disponíveis.</p></section>`,true);
}
function settingsPage() {
  view = 'settings'; const exercises = Object.values(WORKOUTS).flatMap(w => w.exercises);
  shell(`<div class="eyebrow">DO SEU JEITO</div><h1>Ajustes.</h1><form id="settings-form"><section class="settings-section"><h2>Sua manhã</h2><div class="rep-grid"><label>Início habitual<input type="time" name="start" value="${settings.start}" required></label><label>Retorno para casa<input type="time" name="deadline" value="${settings.deadline}" required></label></div><label class="toggle"><span>Vibrar ao terminar o descanso</span><input type="checkbox" name="vibration" ${settings.vibration ? 'checked' : ''}></label><label class="toggle"><span>Tentar manter a tela ligada</span><input type="checkbox" name="wakeLock" ${settings.wakeLock ? 'checked' : ''}></label><p class="muted small">${'wakeLock' in navigator ? 'Tela ligada quando o navegador permitir.' : 'Este navegador não oferece controle de tela ligada.'} Vibração e avisos podem não funcionar com a tela bloqueada. Sons desativados.</p></section><section class="settings-section"><h2>Descansos em segundos</h2><p class="muted small">Aplicados a novas sessões. Sessões em andamento preservam seus tempos.</p>${[['transition','Transição entre exercícios de força'],['circuitRest','Entre exercícios de core'],['roundRest','Entre voltas de core']].map(([key,label]) => `<label class="rest-setting"><span>${label}</span><input type="number" name="${key}" min="0" max="600" required value="${settings[key]}"></label>`).join('')}<details><summary>Descansos individuais de força</summary>${exercises.filter(e => e.rest !== 10).map(e => `<label class="rest-setting"><span>${esc(e.name)}</span><input type="number" name="rest-${e.id}" min="0" max="600" required value="${settings.rests[e.id] ?? e.rest}"></label>`).join('')}</details>${button('Restaurar descansos padrão', 'reset-rests', 'text-button')}</section><button type="submit" class="primary">SALVAR AJUSTES</button></form><section class="settings-section"><h2>Backup dos seus dados</h2><p class="muted">Faça uma cópia antes de trocar de celular ou limpar os dados do navegador.</p>${button('EXPORTAR BACKUP JSON', 'export', 'secondary')}<label class="file-label">IMPORTAR BACKUP JSON<input type="file" id="import" accept="application/json,.json"></label></section><details class="settings-section"><summary>Créditos e imagens</summary><p>Ilustrações: <a href="https://github.com/bryllim/workout-guide" target="_blank" rel="noopener">Workout Guide, Bryl Lim</a>; poses derivadas de Everkinetic. Licença <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>. Arquivos locais, sem alterações. Correspondências e atribuições por quadro em <a href="./assets/image-credits.json">image-credits.json</a> e <a href="./IMAGENS.md">documentação</a>.</p><p>Exercícios sem imagem verificada mostram uma apresentação neutra e instrução técnica.</p></details>${registration?.waiting ? button('APLICAR ATUALIZAÇÃO', 'update', 'secondary') : ''}`, true);
  document.querySelector('[name="vibration"]').closest('label').insertAdjacentHTML('afterend',`<label>Padrão de vibração<select name="vibrationMode"><option value="short" ${settings.vibrationMode==='short' ? 'selected' : ''}>Curta</option><option value="long" ${settings.vibrationMode==='long' ? 'selected' : ''}>Longa · cerca de 4 segundos</option></select></label>${button('Testar vibração','test-vibration','secondary')}`);
  document.querySelector('main').insertAdjacentHTML('beforeend',`<section class="settings-section"><h2>Instalação e offline</h2><p class="muted small">${navigator.serviceWorker?.controller ? 'Cache ativo neste navegador.' : 'Aguarde o cache inicial com internet.'} Para instalar, use o menu do Chrome no endereço HTTPS publicado. Não é necessário limpar os dados do site.</p>${deferredInstall ? button('INSTALAR APLICATIVO','install','secondary') : ''}<p class="muted small">Versão da aplicação: 1.1.0</p></section>`);
}
function vibrationPattern(mode=settings.vibrationMode) { return mode==='short' ? [100,50,100] : [350,250,350,250,350,250,350,250,350,250,350,250,350]; }
async function notifyRest() {
  if(session?.state!=='REST_FINISHED' || session.restSkipped || session.restAlerted) return;
  session.restAlerted=true; await persist();
  if(settings.vibration && navigator.vibrate) navigator.vibrate(vibrationPattern());
}
async function wakeControl() {
  const active = settings?.wakeLock && session && ((view === 'workout' && session.state !== 'PAUSED') || (view === 'summary' && session.cardio.state === 'ACTIVE')) && document.visibilityState === 'visible';
  if (!active && wake) { await wake.release().catch(() => {}); wake = null; }
  if (active && !wake && 'wakeLock' in navigator) try { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => wake = null); } catch { /* Navegador pode negar em economia de bateria. */ }
}
function render() { if (view === 'workout') workout(); else if (view === 'summary') summary(); wakeControl(); }
function readDraft() {
  const form = document.querySelector('#set-form'); if (!form || !session) return;
  const values = new FormData(form), d = { ...session.draft };
  for (const key of ['reps','right','left','load']) if (values.has(key)) {
    const value = values.get(key) === '' ? null : Number(values.get(key));
    if (key !== 'load' || value == null || (Number.isFinite(value) && value >= 0 && value <= 1000)) d[key] = value;
  }
  if (values.has('side')) d.side = values.get('side'); session.draft = d;
}
async function handle(action, el) {
  switch (action) {
    case 'home': if (session && view === 'workout') { readDraft(); pause(session); await persist(); } if (session?.cardio.state === 'ACTIVE') { cardioAction(session, 'pause'); await persist(); } sessions = await allSessions(); home(); break;
    case 'history': await history(); break;
    case 'evolution': await evolution(); break;
    case 'select-history': selecting=true;selectedIds.clear();await history();break;
    case 'cancel-selection': selecting=false;selectedIds.clear();await history();break;
    case 'delete-one': case 'delete-selected': {
      const ids=action==='delete-one' ? [el.dataset.id] : [...selectedIds]; if(!ids.length) return;
      if(!confirm(`Excluir ${ids.length} ${ids.length===1 ? 'sessão' : 'sessões'} e seus registros de cardio? As demais sessões e configurações serão preservadas.`)) {selecting=false;selectedIds.clear();await history();return;}
      await writes;await deleteSessions(ids);if(session && ids.includes(session.id)) session=null;selecting=false;selectedIds.clear();await history();notice('Sessões selecionadas excluídas.');break;
    }
    case 'point-info': {
      const p=points[Number(el.dataset.index)];if(!p) return;
      document.querySelector('#point-info').innerHTML=`<strong>${date(p.date)} · ${esc(p.name)}</strong><br>${p.value} ${filters.metric==='seconds' ? 'segundos' : 'repetições'}${p.side ? ` · lado ${p.side==='right' ? 'direito' : 'esquerdo'}` : ''} · carga: ${p.load==null ? 'desconhecida' : `${p.load} kg`} · ${p.round ? `volta ${p.round}` : `série ${p.set}`} · ${esc(p.status)}`;break;
    }
    case 'week-info': {
      const w=weeks[Number(el.dataset.index)];if(!w) return;document.querySelector('#week-info').textContent=`Semana de ${new Date(w.from).toLocaleDateString('pt-BR')}: ${w.completed}/${w.scheduled} programados cumpridos, ${w.extras} treinos extras e ${w.cardios} sessões de cardio concluídas.`;break;
    }
    case 'test-vibration': {
      const mode=document.querySelector('[name="vibrationMode"]').value;
      if(!navigator.vibrate) notice('Este navegador não oferece vibração.');else notice(navigator.vibrate(vibrationPattern(mode)) ? 'Pedido de vibração enviado. Confira no aparelho.' : 'O navegador não aceitou o pedido de vibração.');break;
    }
    case 'settings': settingsPage(); break;
    case 'new': {
      if (resumable() && !confirm('Existe uma sessão salva. Criar outra sessão? A anterior continuará no histórico.')) return;
      session = createSession(selected, settings); await persist(); view = selected ? 'workout' : 'summary'; render(); break;
    }
    case 'recover': session = sessions.find(s => s.id === el.dataset.id); if (!session) return; if(session.state!=='COMPLETED') initializeTiming(session,Date.now());if(session.state==='REST_FINISHED' && session.restTrackingVersion!==2) session.restAlerted=true; if (session.state === 'PAUSED') resume(session); tick(session); await persist(); view = session.state === 'COMPLETED' ? 'summary' : 'workout'; render(); break;
    case 'start': if (document.querySelector('#set-form') && !document.querySelector('#set-form').reportValidity()) return; readDraft(); if(navigator.vibrate) navigator.vibrate(0);start(session); await persist(); workout(); break;
    case 'swap': readDraft(); session.draft.leftFirst = !session.draft.leftFirst; await persist(); workout(); break;
    case 'end-timed': if (!document.querySelector('#set-form').reportValidity()) return; readDraft(); complete(session, session.draft); await persist(); render(); break;
    case 'pause': readDraft(); pause(session); await persist(); render(); break;
    case 'resume': resume(session); await persist(); render(); break;
    case 'skip-rest': finishRest(session); await persist(); render(); break;
    case 'add15': case 'add30': if (session.state === 'RESTING') { const sec = action === 'add15' ? 15 : 30; session.timerEnd += sec*1000; session.restPlannedSeconds += sec; await persist(); render(); } break;
    case 'abandon': if (!confirm('Encerrar esta sessão antes de completar todas as séries? Seus resultados serão preservados.')) return; endWorkout(session);await persist(); summary(); break;
    case 'cardio-start': {
      if (session.cardio.state === 'READY') { const target = Number(document.querySelector('#cardio-target').value); if (!Number.isInteger(target) || target < 1 || target > 240) throw new Error('Escolha uma meta de 1 a 240 minutos.'); session.cardio.sessionTargetSeconds = target*60; }
      cardioAction(session, 'start'); await persist(); summary(); break;
    }
    case 'cardio-pause': cardioAction(session, 'pause'); await persist(); summary(); break;
    case 'cardio-finish': cardioAction(session, 'finish'); await persist(); summary(); break;
    case 'finalize': if (session.cardio.state === 'ACTIVE') { if (!confirm('Concluir o cardio e finalizar a sessão agora?')) return; cardioAction(session,'finish'); } else if (session.cardio.state === 'PAUSED') cardioAction(session,'finish'); session.finalized = true; session.endedAt ||= Date.now(); if (!session.steps.length && session.cardio.state !== 'COMPLETED') session.status = 'interrompido'; await persist(); session = null; sessions = await allSessions(); home(); break;
    case 'export': {
      await writes; const b = { format:'meu-treino', schema:1, exportedAt:Date.now(), settings, sessions:await allSessions() }; const url = URL.createObjectURL(new Blob([JSON.stringify(b,null,2)], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = `meu-treino-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); break;
    }
    case 'reset-rests': settings = {...settings, rests:{}, transition:45, circuitRest:10, roundRest:60}; await saveSettings(settings); settingsPage(); notice('Descansos padrão restaurados.'); break;
    case 'edit-result': {
      const s = sessions.find(x => x.id === el.dataset.id), index = Number(el.dataset.index), r = s.results[index];
      const dialog = document.createElement('dialog'); dialog.innerHTML = `<form id="edit-form"><h2>Editar registro</h2><p>${esc(r.name)} · série ${r.set}</p>${r.durationSeconds != null ? `<label>Duração real (segundos)<input type="number" name="durationSeconds" min="0" max="36000" step="0.1" required value="${r.durationSeconds}"></label>` : repFields({unilateral:r.right != null},r)}${loadField(r)}<label>Observação<input name="side" maxlength="80" value="${esc(r.side)}"></label><button type="submit" class="primary">SALVAR REGISTRO</button>${button('Cancelar','close-dialog','secondary')}</form>`; document.body.append(dialog); dialog.showModal();
      dialog.querySelector('form').onsubmit = async ev => { ev.preventDefault(); const f = new FormData(ev.target); const updated = {...r}; for (const key of ['reps','right','left','durationSeconds','load']) if (f.has(key)) updated[key] = f.get(key) === '' ? null : Number(f.get(key)); updated.side = f.get('side'); updated.editedAt = Date.now(); s.results[index] = updated; try { await saveSession(s); dialog.remove(); await history(); } catch(err) { notice(err.message); } }; break;
    }
    case 'close-dialog': el.closest('dialog').remove(); break;
    case 'install': if(!deferredInstall) return;await deferredInstall.prompt(); deferredInstall = null; home(); break;
    case 'update': if (session && !session.finalized && (view==='workout' || session.cardio.state==='ACTIVE')) { notice('Pause e volte ao início antes de atualizar.'); return; } await writes; registration.waiting?.postMessage('SKIP_WAITING'); break;
  }
  wakeControl();
}
app.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-action]'); if (!el) return; ev.preventDefault(); if (busy) return; busy = true;
  try { await handle(el.dataset.action, el); } catch(err) { notice(err.message || 'Não foi possível salvar os dados.'); } finally { busy = false; }
});
document.addEventListener('click', ev => { const el = ev.target.closest('[data-action="close-dialog"]'); if (el) el.closest('dialog').remove(); });
app.addEventListener('submit', async ev => {
  ev.preventDefault(); if (busy) return; busy = true;
  try {
    if (ev.target.id === 'set-form') { readDraft(); complete(session, session.draft); await persist(); render(); }
    if (ev.target.id === 'settings-form') { const f = new FormData(ev.target); const next = {...settings, rests:{},vibrationMode:f.get('vibrationMode')}; for (const key of ['start','deadline']) next[key] = f.get(key); for (const key of ['vibration','wakeLock']) next[key] = f.has(key); for (const key of ['transition','circuitRest','roundRest']) next[key] = Number(f.get(key)); for (const [key,value] of f) if (key.startsWith('rest-')) next.rests[key.slice(5)] = Number(value); validateBackup({format:'meu-treino', schema:1, settings:next, sessions:[]}); await saveSettings(next); settings = next; notice('Ajustes salvos.'); }
  } catch(err) { notice(err.message); } finally { busy = false; }
});
app.addEventListener('input', () => { if (view === 'workout' && document.querySelector('#set-form')) { readDraft(); persist().catch(err => notice(err.message)); } });
app.addEventListener('error',ev=>{
  if(ev.target.id!=='exercise-image') return;
  const e=current(session)?.exercise;if(!e) return;brokenImages.add(e.image);
  const container=ev.target.closest('.demo');container.classList.add('pending');container.innerHTML=`<span class="pending-symbol">↔</span><strong>${esc(e.name)}</strong><span>DEMONSTRAÇÃO INDISPONÍVEL</span>`;
  document.querySelector('.image-note')?.remove();
},true);
app.addEventListener('keydown',ev=>{const target=ev.target.closest('svg [data-action]');if(target && ['Enter',' '].includes(ev.key)) {ev.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
app.addEventListener('change', async ev => {
  if(ev.target.hasAttribute('data-session-select')) {const id=ev.target.dataset.sessionSelect;if(ev.target.checked) selectedIds.add(id);else selectedIds.delete(id);const b=document.querySelector('[data-action="delete-selected"]');b.disabled=!selectedIds.size;b.textContent=`Excluir selecionados (${selectedIds.size})`;}
  const filterIds={'evolution-exercise':'exercise','evolution-range':'range','evolution-metric':'metric','evolution-side':'side','week-anchor':'week'};
  if(filterIds[ev.target.id]) {filters[filterIds[ev.target.id]]=ev.target.value;if(ev.target.id==='evolution-exercise'){const e=Object.values(WORKOUTS).flatMap(w=>w.exercises).find(e=>e.id===filters.exercise);filters.metric=e?.seconds ? 'seconds' : 'reps';}await evolution();}
  if (ev.target.id === 'workout-choice') { selected = ev.target.value || null; home(); }
  if (ev.target.id === 'compare') { const id = ev.target.value; document.querySelector('#comparison').innerHTML = id ? `<div class="comparison">${sessions.filter(s => s.results.some(r => r.exerciseId === id)).sort((a,b) => a.startedAt-b.startedAt).map(s => `<p><strong>${date(s.startedAt)}</strong><br>${s.results.filter(r => r.exerciseId === id).map(r => `${r.durationSeconds != null ? `${Math.round(r.durationSeconds)}s` : r.right != null ? `D ${r.right}/E ${r.left}` : `${r.reps} reps`}${r.load != null ? ` (${r.load} kg)` : ''}`).join(' · ')}</p>`).join('')}</div>` : ''; }
  if (ev.target.id === 'import') {
    try { const file = ev.target.files[0]; if (!file) return; if (file.size > 20000000) throw new Error('Backup muito grande (máximo 20 MB).'); const b = validateBackup(JSON.parse(await file.text())); if (!confirm(`Substituir todos os dados deste dispositivo por ${b.sessions.length} sessões e as configurações do backup? Exporte os dados atuais antes, se necessário.`)) return; await writes; await importBackup(b); settings = {...DEFAULTS,...b.settings}; sessions = await allSessions(); session = null;selecting=false;selectedIds.clear(); home(); notice('Backup restaurado sem duplicações.'); } catch(err) { notice(`Não foi possível importar: ${err.message}`); }
  }
});
async function timerTick() {
  if (busy || !session || !['workout','summary'].includes(view)) return;
  if (view === 'workout' && tick(session)) {
    busy = true; try { await persist();await notifyRest(); render(); } catch(err) { notice(err.message); } finally { busy = false; } return;
  }
  if(view==='workout' && session.state==='REST_FINISHED' && !session.restSkipped && !session.restAlerted) {busy=true;try {await notifyRest();}catch(err){notice(err.message);}finally{busy=false;}return;}
  const remaining = (session.timerEnd-Date.now())/1000;
  document.querySelectorAll('[data-timer]').forEach(e => e.textContent = ['RESTING','REST_FINISHED'].includes(session.state) ? signedRest(session) : fmt(remaining));
  for (const id of ['rest-progress','timed-progress']) { const p = document.getElementById(id); if (p) p.value = Math.max(0,id==='rest-progress' ? restRemaining(session) : remaining); }
  const excess=document.querySelector('[data-rest-excess]');if(excess && session.state==='REST_FINISHED') excess.textContent=`Excedente: ${fmt(Math.floor(restStats(session).excessSeconds))} · descanso real: ${fmt(Math.floor(restStats(session).actualSeconds))}`;
  document.querySelectorAll('[data-cardio]').forEach(e => e.textContent = fmt(cardioElapsed(session.cardio)));
  if (view === 'summary' && session.cardio.state === 'ACTIVE' && !session.cardio.targetNotified && cardioElapsed(session.cardio) >= (session.cardio.sessionTargetSeconds || session.cardio.plannedSeconds)) { session.cardio.targetNotified = true; await persist(); notice('Meta de cardio atingida. Conclua quando decidir.'); }
}
setInterval(() => {
  if(view==='settings' && registration?.waiting && !document.querySelector('[data-action="update"]')) document.querySelector('main')?.insertAdjacentHTML('beforeend',button('APLICAR ATUALIZAÇÃO','update','secondary'));
  timerTick(); const left = deadlineRemaining(settings || DEFAULTS); const line = document.querySelector('.morning'); if (!line) return;
  line.classList.toggle('urgent', left <= 300); line.classList.toggle('short', left > 300 && left <= 900);
  document.querySelector('[data-clock]').textContent = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit',hour12:false});
  document.querySelector('[data-limit]').textContent = left > 0 ? `${Math.floor(left/60)} min até ${(settings || DEFAULTS).deadline}` : `Horário-limite ${(settings || DEFAULTS).deadline} atingido`;
}, 250);
let frame = 1;
setInterval(() => { const img = document.querySelector('#exercise-image'); if (!img || matchMedia('(prefers-reduced-motion: reduce)').matches) return; frame = frame % 3 + 1; img.src = img.src.replace(/frame-\d\.svg$/, `frame-${frame}.svg`); }, 1600);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { timerTick(); wakeControl(); } });
window.addEventListener('beforeunload', ev => { if (session && (view === 'workout' || session.cardio.state === 'ACTIVE')) { ev.preventDefault(); ev.returnValue = ''; } });
window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); deferredInstall = ev; if (view === 'home') home(); });
try { await openDB(); settings = {...DEFAULTS, ...await getSettings()}; sessions = await allSessions(); home(); }
catch { app.innerHTML = '<main><h1>Armazenamento indisponível.</h1><p>Permita dados de sites neste navegador e recarregue. O app precisa salvar seus registros antes de iniciar um treino.</p></main>'; }
if ('serviceWorker' in navigator) {
  let wasControlled = !!navigator.serviceWorker.controller, refreshing=false;
  // Escute antes do registro para não perder a primeira ativação.
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!wasControlled) {wasControlled=true;return;}
    if(!refreshing) {refreshing=true;location.reload();}
  });
  try {
    registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      worker?.addEventListener('statechange',()=>{if(worker.state==='installed' && navigator.serviceWorker.controller) notice('Atualização disponível nos Ajustes.');});
    });
  } catch {notice('Cache offline indisponível. Use HTTPS ou localhost.');}
}
