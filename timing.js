// Intervalos disjuntos: cada milissegundo pertence a uma única categoria.
const kindFor = state => state === 'PAUSED' ? 'pause' : ['ACTIVE_REPS','ACTIVE_TIMED'].includes(state) ? 'active' : ['RESTING','REST_FINISHED'].includes(state) ? 'rest' : 'preparation';
export function initializeTiming(s, now, full = false) {
  if (s.timing || !s.steps.length || s.state === 'COMPLETED') return;
  s.timing = { schema:1, coveredFrom:now, full, kind:kindFor(s.state), since:now, intervals:[] };
}
export function changeTiming(s, kind, now) {
  if (!s.timing) initializeTiming(s,now);
  const t=s.timing; if (!t || t.closedAt != null) return;
  now=Math.max(now,t.since);
  if (now>t.since) t.intervals.push({kind:t.kind,from:t.since,to:now});
  t.kind=kind; t.since=now;
}
export function closeTiming(s, now) {
  changeTiming(s,'preparation',now);
  if (s.timing && s.timing.closedAt == null) s.timing.closedAt=Math.max(now,s.timing.since);
  s.workoutEndedAt=now;
}
export function timingSummary(s, now=Date.now()) {
  const end=s.workoutEndedAt ?? s.endedAt ?? (s.state === 'COMPLETED' ? null : now);
  const totalSeconds=end == null ? null : Math.max(0,(end-s.startedAt)/1000);
  if (!s.timing) return {totalSeconds,available:false};
  const t=s.timing, until=t.closedAt ?? now;
  const spans=[...t.intervals];
  if (t.closedAt == null && until>t.since) spans.push({kind:t.kind,from:t.since,to:until});
  const milliseconds={active:0,rest:0,preparation:0,pause:0};
  for(const span of spans) milliseconds[span.kind]+=Math.max(0,span.to-span.from);
  const sums=Object.fromEntries(Object.entries(milliseconds).map(([key,value])=>[key,value/1000]));
  return {totalSeconds,available:true,partial:!t.full,coveredSeconds:Object.values(milliseconds).reduce((a,b)=>a+b,0)/1000,...sums};
}
export function activeSince(s, from, now) {
  if (!s.timing || !Number.isFinite(from)) return null;
  const t=s.timing, spans=[...t.intervals];
  if (t.closedAt == null && t.kind==='active') spans.push({kind:'active',from:t.since,to:now});
  return spans.filter(x=>x.kind==='active').reduce((sum,x)=>sum+Math.max(0,Math.min(x.to,now)-Math.max(x.from,from))/1000,0);
}
