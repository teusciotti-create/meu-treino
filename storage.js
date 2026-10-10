let db;
export async function openDB() {
  db = await new Promise((resolve, reject) => { const r = indexedDB.open('meu-treino', 1); r.onupgradeneeded = () => { r.result.createObjectStore('sessions', { keyPath: 'id' }); r.result.createObjectStore('settings'); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
function transaction(store, mode, run) {
  return new Promise((resolve, reject) => { const tx = db.transaction(store, mode); const r = run(tx.objectStore(store)); tx.oncomplete = () => resolve(r?.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}
export const allSessions = () => transaction('sessions', 'readonly', s => s.getAll());
export const saveSession = s => transaction('sessions', 'readwrite', store => store.put(structuredClone(s)));
export const getSettings = () => transaction('settings', 'readonly', s => s.get('preferences'));
export const saveSettings = s => transaction('settings', 'readwrite', store => store.put(s, 'preferences'));
export function validateBackup(b) {
  const time = v => typeof v === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
  const duration = v => Number.isFinite(v) && v >= 0 && v <= 600;
  if (!b || b.format !== 'meu-treino' || b.schema !== 1 || !Array.isArray(b.sessions) || b.sessions.length > 20000) throw new Error('Formato ou versão do backup inválidos.');
  const p = b.settings;
  if (!p || !time(p.start) || !time(p.deadline) || typeof p.vibration !== 'boolean' || typeof p.wakeLock !== 'boolean' || ![p.transition, p.circuitRest, p.roundRest].every(duration) || !p.rests || !Object.values(p.rests).every(duration)) throw new Error('Configurações inválidas no backup.');
  const states = ['READY','ACTIVE_REPS','ACTIVE_TIMED','RESTING','REST_FINISHED','PAUSED','COMPLETED'];
  const number = (n, max = 1000) => n == null || (Number.isFinite(n) && n >= 0 && n <= max);
  const text = n => n == null || (typeof n === 'string' && n.length <= 500);
  const preferences = p => p && time(p.start) && time(p.deadline) && [p.transition,p.circuitRest,p.roundRest].every(duration) && p.rests && Object.values(p.rests).every(duration);
  const ids = new Set();
  for (const s of b.sessions) {
    if (!s || typeof s.id !== 'string' || ids.has(s.id) || typeof s.name !== 'string' || !Number.isFinite(s.startedAt) || !states.includes(s.state) || !Array.isArray(s.steps) || !Array.isArray(s.results) || !Array.isArray(s.rests) || !Number.isInteger(s.index) || s.index < 0 || s.index > s.steps.length || !s.cardio || !['READY','ACTIVE','PAUSED','COMPLETED'].includes(s.cardio.state) || !Number.isFinite(s.cardio.actualSeconds) || !Number.isFinite(s.cardio.plannedSeconds) || !s.settings) throw new Error('Sessão inválida no backup.');
    if (s.state !== 'COMPLETED' && s.index >= s.steps.length) throw new Error('Etapa inválida no backup.');
    if (!preferences(s.settings) || !['straight_sets','circuit','cardio'].includes(s.mode) || !text(s.version) || !text(s.cardio.name) || s.cardio.actualSeconds < 0 || s.cardio.plannedSeconds < 0 || !number(s.cardio.sessionTargetSeconds,14400) || (s.cardio.state === 'ACTIVE' && !Number.isFinite(s.cardio.startedAt))) throw new Error('Dados de sessão inválidos no backup.');
    if (s.steps.length > 200 || s.results.length > s.steps.length || s.results.length !== s.index || s.steps.some(t => !t.exercise || typeof t.exercise.id !== 'string' || typeof t.exercise.name !== 'string' || !Number.isInteger(t.set) || t.set < 1 || !number(t.round,100) || !Number.isInteger(t.exercise.sets) || !text(t.exercise.target) || !text(t.exercise.cue) || !duration(t.exercise.rest) || !number(t.exercise.seconds,3600) || (t.exercise.image && !/^[a-z0-9-]+$/.test(t.exercise.image)))) throw new Error('Exercício inválido no backup.');
    if (s.results.some(r => !r || !text(r.name) || !text(r.exerciseId) || !Number.isInteger(r.set) || !number(r.round,100) || !number(r.reps,999) || !number(r.right,999) || !number(r.left,999) || !number(r.durationSeconds,36000) || !number(r.load) || !text(r.side) || !Number.isFinite(r.completedAt))) throw new Error('Resultado inválido no backup.');
    if (s.rests.some(r => !Number.isInteger(r.afterStep) || !number(r.actualSeconds,86400) || !number(r.plannedSeconds,86400))) throw new Error('Descanso inválido no backup.');
    if (s.draft && (!number(s.draft.load) || !number(s.draft.reps,999) || !number(s.draft.right,999) || !number(s.draft.left,999) || !text(s.draft.side))) throw new Error('Série em andamento inválida no backup.');
    if (s.state === 'PAUSED' && (!states.includes(s.previousState) || s.previousState === 'PAUSED' || !number(s.timerRemaining,86400000))) throw new Error('Pausa inválida no backup.');
    if (['ACTIVE_TIMED','RESTING'].includes(s.state) && !Number.isFinite(s.timerEnd)) throw new Error('Cronômetro inválido no backup.');
    ids.add(s.id);
  }
  return b;
}
export function importBackup(b) {
  validateBackup(b);
  return new Promise((resolve, reject) => { const tx = db.transaction(['sessions', 'settings'], 'readwrite'); const sessions = tx.objectStore('sessions'); sessions.clear(); for (const s of b.sessions) sessions.put(s); tx.objectStore('settings').put(b.settings, 'preferences'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}
