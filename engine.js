import { WORKOUTS, WEEK, VERSION } from './config.js';
import { initializeTiming, changeTiming, closeTiming, activeSince } from './timing.js';
export function plan(workout) {
  if (!workout) return [];
  if (workout.mode === 'circuit') return Array.from({ length: workout.rounds }, (_, r) => workout.exercises.map(e => ({ exercise: structuredClone(e), set: r + 1, round: r + 1 }))).flat();
  return workout.exercises.flatMap(e => Array.from({ length: e.sets }, (_, i) => ({ exercise: structuredClone(e), set: i + 1 })));
}
export function createSession(key, settings, now = Date.now(), day = new Date(now).getDay()) {
  const workout = WORKOUTS[key];
  const s = { id: crypto.randomUUID(), version: VERSION, workoutKey: key || null, name: workout?.name || 'Cardio', mode: workout?.mode || 'cardio', startedAt: now, endedAt: null, state: workout ? 'READY' : 'COMPLETED', status: 'interrompido', steps: plan(workout), index: 0, results: [], rests: [], settings: structuredClone(settings), cardio: { name: WEEK[day].cardio, plannedSeconds: WEEK[day].minutes * 60, actualSeconds: 0, state: 'READY' } };
  initializeTiming(s,now,true); return s;
}
export function current(s) { return s.steps[s.index]; }
export function start(s, now = Date.now()) {
  if (!['READY', 'REST_FINISHED'].includes(s.state)) return;
  if (s.state === 'REST_FINISHED') finalizeRest(s,now);
  changeTiming(s,'active',now);
  const e = current(s).exercise;
  s.state = e.seconds ? 'ACTIVE_TIMED' : 'ACTIVE_REPS';
  s.stepStartedAt = now;
  delete s.completedSides;
  s.stepTimingComplete = s.timing?.full || s.timing?.coveredFrom <= now;
  if (e.seconds) { s.timerEnd = now + e.seconds * 1000; s.timerRemaining = e.seconds * 1000; }
}
function restDuration(s, step) {
  if (s.mode === 'circuit') return s.steps[s.index].round !== step.round ? s.settings.roundRest : s.settings.circuitRest;
  return s.steps[s.index].exercise.id !== step.exercise.id ? s.settings.transition : (s.settings.rests[step.exercise.id] ?? step.exercise.rest);
}
export function complete(s, values = {}, now = Date.now()) {
  if (!['ACTIVE_REPS', 'ACTIVE_TIMED'].includes(s.state)) return false;
  const step = current(s), e = step.exercise;
  const validRep = n => Number.isInteger(n) && n >= 0 && n <= 999;
  if (!e.seconds && (e.unilateral ? !validRep(values.right) || !validRep(values.left) : !validRep(values.reps))) throw new Error('Preencha as repetições realizadas, incluindo os dois lados.');
  if (values.load != null && (!Number.isFinite(values.load) || values.load < 0 || values.load > 1000)) throw new Error('Informe uma carga válida ou deixe em branco.');
  return recordCompletion(s, values, now);
}
// A execução e o preenchimento são independentes. Null representa dado desconhecido.
export function finishExecution(s, now = Date.now()) {
  if (!['ACTIVE_REPS','ACTIVE_TIMED'].includes(s.state)) return false;
  const e=current(s).exercise;
  if(e.unilateral && !(s.completedSides?.right && s.completedSides?.left)) throw new Error('Conclua os dois lados antes de registrar a série.');
  return recordCompletion(s, {...(e.unilateral ? {right:null,left:null} : {reps:null}),load:null,...s.draft},now);
}
export function updateResult(s,index,values,now=Date.now()) {
  const r=s.results[index];if(!r) throw new Error('Série não encontrada.');
  for(const key of ['reps','right','left','load','durationSeconds']) if(key in values) {
    const n=values[key],max=key==='load'?1000:key==='durationSeconds'?36000:999;
    if(n!=null && (!Number.isFinite(n)||n<0||n>max||(['reps','right','left'].includes(key)&&!Number.isInteger(n)))) throw new Error('Informe um valor válido ou deixe em branco.');
  }
  Object.assign(r,values,{editedAt:now});return r;
}
function recordCompletion(s, values, now) {
  const step=current(s),e=step.exercise;
  const activeSeconds=activeSince(s,s.stepStartedAt,now);
  s.results.push({ exerciseId: e.id, name: e.name, set: step.set, round: step.round || null, ...values, activeSeconds, activeTimingPartial:!s.stepTimingComplete, durationSeconds: e.seconds ? Math.max(0, (e.seconds * 1000 - Math.max(0, s.timerEnd - now)) / 1000) : null, completedAt: now });
  s.index++;
  delete s.draft;
  if (s.index === s.steps.length) { closeTiming(s,now); s.state = 'COMPLETED'; s.status = 'concluído'; s.endedAt = now; }
  else { changeTiming(s,'rest',now); const seconds = restDuration(s, step); s.state = 'RESTING'; s.restStartedAt = now; s.restPauseMs = 0; s.restPlannedSeconds = seconds; s.timerEnd = now + seconds * 1000; s.restTrackingVersion=2; delete s.restSkipped; s.restAlerted=false; }
  return true;
}
export function finishRest(s, now = Date.now()) {
  if (s.state !== 'RESTING') return;
  s.restSkipped=now<s.timerEnd;
  s.state = 'REST_FINISHED';
}
export function restStats(s,now=Date.now()) {
  const paused=s.state==='PAUSED' && ['RESTING','REST_FINISHED'].includes(s.previousState) ? Math.max(0,now-s.pausedAt) : 0;
  const actualSeconds=Math.max(0,(now-s.restStartedAt-(s.restPauseMs || 0)-paused)/1000);
  return {plannedSeconds:s.restPlannedSeconds,actualSeconds,excessSeconds:Math.max(0,actualSeconds-s.restPlannedSeconds)};
}
export function restRemaining(s,now=Date.now()) { return s.restPlannedSeconds-restStats(s,now).actualSeconds; }
function finalizeRest(s,now) {
  // Intervalos antigos já gravados não são reescritos nem extrapolados.
  if(s.restTrackingVersion!==2) return;
  s.rests.push({afterStep:s.index-1,startedAt:s.restStartedAt,endedAt:now,...restStats(s,now),skipped:!!s.restSkipped});
  s.restTrackingVersion=0;
}
export function endWorkout(s,now=Date.now()) {
  if (s.state==='COMPLETED') return;
  if (['RESTING','REST_FINISHED'].includes(s.state) || (s.state==='PAUSED' && ['RESTING','REST_FINISHED'].includes(s.previousState))) finalizeRest(s,now);
  closeTiming(s,now); s.endedAt=now; s.state='COMPLETED'; s.status='interrompido';
}
export function tick(s, now = Date.now()) {
  if (s.state === 'RESTING' && now >= s.timerEnd) { finishRest(s, s.timerEnd); return true; }
  if (s.state === 'ACTIVE_TIMED' && now >= s.timerEnd) { finishExecution(s, s.timerEnd); return true; }
  return false;
}
export function pause(s, now = Date.now()) {
  tick(s, now);
  if (['COMPLETED', 'PAUSED'].includes(s.state)) return;
  changeTiming(s,'pause',now);
  s.previousState = s.state; s.pausedAt = now; s.timerRemaining = (s.timerEnd || now) - now; s.state = 'PAUSED'; s.status = 'pausado';
}
export function resume(s, now = Date.now()) {
  if (s.state !== 'PAUSED') return;
  const pauseMs=Math.max(0,now-s.pausedAt);
  s.state = s.previousState;
  if (['RESTING','REST_FINISHED','ACTIVE_TIMED'].includes(s.state)) { s.timerEnd = now + s.timerRemaining; if (['RESTING','REST_FINISHED'].includes(s.state)) s.restPauseMs = (s.restPauseMs || 0) + pauseMs; }
  changeTiming(s,['RESTING','REST_FINISHED'].includes(s.state) ? 'rest' : ['ACTIVE_REPS','ACTIVE_TIMED'].includes(s.state) ? 'active' : 'preparation',now);
  s.status = 'interrompido';
}
export function cardioElapsed(c, now = Date.now()) { return c.actualSeconds + (c.state === 'ACTIVE' ? (now - c.startedAt) / 1000 : 0); }
export function cardioAction(s, action, now = Date.now()) {
  const c = s.cardio;
  if (action === 'start' && ['READY', 'PAUSED'].includes(c.state)) { c.startedAt = now; c.state = 'ACTIVE'; }
  if (['pause', 'finish'].includes(action) && ['ACTIVE', 'PAUSED'].includes(c.state)) { c.actualSeconds = Math.max(0, cardioElapsed(c, now)); c.state = action === 'pause' ? 'PAUSED' : 'COMPLETED'; if (action === 'finish') { c.endedAt = now; if (!s.steps.length) s.status = 'concluído'; if (!s.endedAt) s.endedAt = now; } }
}
export function deadlineRemaining(settings, now = new Date()) {
  const end = new Date(now); const [h, m] = settings.deadline.split(':').map(Number); end.setHours(h, m, 0, 0); return Math.max(0, (end - now) / 1000);
}
