import { WORKOUTS, WEEK, VERSION } from './config.js';
export function plan(workout) {
  if (!workout) return [];
  if (workout.mode === 'circuit') return Array.from({ length: workout.rounds }, (_, r) => workout.exercises.map(e => ({ exercise: structuredClone(e), set: r + 1, round: r + 1 }))).flat();
  return workout.exercises.flatMap(e => Array.from({ length: e.sets }, (_, i) => ({ exercise: structuredClone(e), set: i + 1 })));
}
export function createSession(key, settings, now = Date.now(), day = new Date(now).getDay()) {
  const workout = WORKOUTS[key];
  return { id: crypto.randomUUID(), version: VERSION, workoutKey: key || null, name: workout?.name || 'Cardio', mode: workout?.mode || 'cardio', startedAt: now, endedAt: null, state: workout ? 'READY' : 'COMPLETED', status: 'interrompido', steps: plan(workout), index: 0, results: [], rests: [], settings: structuredClone(settings), cardio: { name: WEEK[day].cardio, plannedSeconds: WEEK[day].minutes * 60, actualSeconds: 0, state: 'READY' } };
}
export function current(s) { return s.steps[s.index]; }
export function start(s, now = Date.now()) {
  if (!['READY', 'REST_FINISHED'].includes(s.state)) return;
  const e = current(s).exercise;
  s.state = e.seconds ? 'ACTIVE_TIMED' : 'ACTIVE_REPS';
  s.stepStartedAt = now;
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
  s.results.push({ exerciseId: e.id, name: e.name, set: step.set, round: step.round || null, ...values, durationSeconds: e.seconds ? Math.max(0, (e.seconds * 1000 - Math.max(0, s.timerEnd - now)) / 1000) : null, completedAt: now });
  s.index++;
  delete s.draft;
  if (s.index === s.steps.length) { s.state = 'COMPLETED'; s.status = 'concluído'; s.endedAt = now; }
  else { const seconds = restDuration(s, step); s.state = 'RESTING'; s.restStartedAt = now; s.restPauseMs = 0; s.restPlannedSeconds = seconds; s.timerEnd = now + seconds * 1000; }
  return true;
}
export function finishRest(s, now = Date.now()) {
  if (s.state !== 'RESTING') return;
  s.rests.push({ afterStep: s.index - 1, plannedSeconds: s.restPlannedSeconds, actualSeconds: Math.max(0, (Math.min(now, s.timerEnd) - s.restStartedAt - (s.restPauseMs || 0)) / 1000) });
  s.state = 'REST_FINISHED';
}
export function tick(s, now = Date.now()) {
  if (s.state === 'RESTING' && now >= s.timerEnd) { finishRest(s, s.timerEnd); return true; }
  if (s.state === 'ACTIVE_TIMED' && now >= s.timerEnd) { complete(s, s.draft || {}, s.timerEnd); return true; }
  return false;
}
export function pause(s, now = Date.now()) {
  tick(s, now);
  if (['COMPLETED', 'PAUSED'].includes(s.state)) return;
  s.previousState = s.state; s.pausedAt = now; s.timerRemaining = Math.max(0, (s.timerEnd || now) - now); s.state = 'PAUSED'; s.status = 'pausado';
}
export function resume(s, now = Date.now()) {
  if (s.state !== 'PAUSED') return;
  s.state = s.previousState;
  if (['RESTING', 'ACTIVE_TIMED'].includes(s.state)) { s.timerEnd = now + s.timerRemaining; if (s.state === 'RESTING') s.restPauseMs = (s.restPauseMs || 0) + now - s.pausedAt; }
  s.status = 'interrompido';
}
export function cardioElapsed(c, now = Date.now()) { return c.actualSeconds + (c.state === 'ACTIVE' ? (now - c.startedAt) / 1000 : 0); }
export function cardioAction(s, action, now = Date.now()) {
  const c = s.cardio;
  if (action === 'start' && ['READY', 'PAUSED'].includes(c.state)) { c.startedAt = now; c.state = 'ACTIVE'; }
  if (['pause', 'finish'].includes(action) && ['ACTIVE', 'PAUSED'].includes(c.state)) { c.actualSeconds = Math.max(0, cardioElapsed(c, now)); c.state = action === 'pause' ? 'PAUSED' : 'COMPLETED'; if (action === 'finish') { c.endedAt = now; s.status = 'concluído'; if (!s.endedAt) s.endedAt = now; } }
}
export function deadlineRemaining(settings, now = new Date()) {
  const end = new Date(now); const [h, m] = settings.deadline.split(':').map(Number); end.setHours(h, m, 0, 0); return Math.max(0, (end - now) / 1000);
}
