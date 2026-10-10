import { WEEK } from './config.js';
export function localDay(n) { const d=new Date(n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function weekStart(n) { const d=new Date(n); d.setHours(0,0,0,0); d.setDate(d.getDate()-(d.getDay()+6)%7); return d; }
export function weeklyConsistency(sessions, anchor=Date.now(), count=8) {
  const end=weekStart(anchor), weeks=[];
  for(let i=count-1;i>=0;i--) {
    const from=new Date(end); from.setDate(from.getDate()-i*7); const to=new Date(from); to.setDate(to.getDate()+7);
    const inWeek=sessions.filter(s=>s.startedAt>=+from && s.startedAt<+to);
    const completed=inWeek.filter(s=>s.status==='concluído' && s.steps.length>0 && s.results.length===s.steps.length);
    const matched=new Set(); let extras=0;
    for(const s of completed.sort((a,b)=>a.startedAt-b.startedAt)) {
      const key=localDay(s.startedAt), expected=WEEK[new Date(s.startedAt).getDay()].workout;
      if (s.workoutKey===expected && expected && !matched.has(key)) matched.add(key); else extras++;
    }
    weeks.push({from:+from,to:+to,scheduled:6,completed:matched.size,extras,cardios:inWeek.filter(s=>s.cardio?.state==='COMPLETED').length});
  }
  return weeks;
}
export function exerciseProgress(sessions,id,{range='all',side='right',metric='reps',now=Date.now()}={}) {
  const from=new Date(now); from.setHours(0,0,0,0);
  if(range==='month') from.setDate(1);
  else if(range==='30' || range==='90') from.setDate(from.getDate()-Number(range)+1);
  else from.setTime(0);
  return sessions.filter(s=>s.startedAt>=+from && s.startedAt<=now).sort((a,b)=>a.startedAt-b.startedAt).flatMap(s=>{
    const candidates=s.results.filter(r=>r.exerciseId===id).map(r=>{
      const value=metric==='seconds' ? r.durationSeconds : r.durationSeconds != null ? null : r.right != null || r.left != null ? r[side] : r.reps;
      return {value,load:r.load ?? null,result:r};
    }).filter(p=>Number.isFinite(p.value) && p.value>=0 && (metric==='seconds' || Number.isInteger(p.value)));
    candidates.sort((a,b)=>b.value-a.value || (b.load ?? -Infinity)-(a.load ?? -Infinity));
    if(!candidates.length) return [];
    const p=candidates[0]; return [{sessionId:s.id,date:s.startedAt,name:p.result.name,value:p.value,load:p.load,set:p.result.set,round:p.result.round,side:p.result.right != null ? side : null,status:s.status}];
  });
}
