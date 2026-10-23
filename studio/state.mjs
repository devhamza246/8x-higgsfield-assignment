/** Pure demo economy. No real money, provider telemetry or inference. */
export const ACTIVE = ['queued', 'processing'];
export function createState() {
  return {version:1, initialBalance:120, projects:[{id:'vela',name:'Vela · Botanical',budget:80,createdAt:Date.now()}],jobs:[],ledger:[]};
}
export function available(state) {return state.initialBalance + state.ledger.reduce((sum,e)=>sum+e.amount,0);}
export function used(state, projectId) {return Math.max(0,-state.ledger.filter(e=>e.projectId===projectId).reduce((sum,e)=>sum+e.amount,0));}
export function quote(settings) {
  if(!['fast','balanced','quality'].includes(settings.priority)) throw new Error('Choose a generation priority.');
  if(![5,8,10].includes(settings.duration)) throw new Error('Choose a supported duration.');
  if(!['16:9','9:16','1:1'].includes(settings.ratio)) throw new Error('Choose a supported aspect ratio.');
  const rate={fast:5,balanced:8,quality:14}[settings.priority];
  return {cost:Math.ceil(rate*settings.duration/5),estimated:{fast:'20–40 sec',balanced:'40–60 sec',quality:'1–2 min'}[settings.priority],model:{fast:'Swift · Draft',balanced:'Studio · Balanced',quality:'Cinema · Detail'}[settings.priority]};
}
export function setBudget(state,projectId,value) {
  if(!Number.isInteger(value)||value<0||value>10000) throw new Error('Budget must be a whole number from 0 to 10,000.');
  if(!state.projects.some(p=>p.id===projectId)) throw new Error('Project not found.');
  if(value<used(state,projectId)) throw new Error('Budget cannot be below committed credits.');
  const next=structuredClone(state); next.projects.find(p=>p.id===projectId).budget=value; return next;
}
export function startJob(state,input,now=Date.now()) {
  const project=state.projects.find(p=>p.id===input.projectId);
  if(!project) throw new Error('Project not found.');
  if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>2000) throw new Error('Add a creative brief of 1–2,000 characters.');
  if(!['forest','golden','noir'].includes(input.preset)) throw new Error('Choose a visual direction.');
  if(!['success','failure'].includes(input.outcome)) throw new Error('Choose a valid demo outcome.');
  if(state.jobs.some(j=>j.projectId===project.id&&ACTIVE.includes(j.status))) throw new Error('A generation is already running in this project.');
  const q=quote(input.settings);
  if(q.cost>available(state)) throw new Error('Not enough demo credits in your balance.');
  if(q.cost+used(state,project.id)>project.budget) throw new Error('This generation exceeds your project budget. Increase the limit or try Fast.');
  const next=structuredClone(state),id=crypto.randomUUID();
  next.jobs.push({id,...structuredClone(input),cost:q.cost,model:q.model,createdAt:now,status:'queued',accepted:false,report:null});
  next.ledger.push({id:crypto.randomUUID(),jobId:id,projectId:project.id,amount:-q.cost,type:'reserved',at:now});
  return next;
}
export function advanceJobs(state,now=Date.now()) {
  const next=structuredClone(state);
  for(const job of next.jobs){
    if(!ACTIVE.includes(job.status))continue;
    if(now-job.createdAt>=14000){
      job.status=job.outcome==='failure'?'failed':'completed';job.finishedAt=now;
      if(job.status==='failed') refund(next,job,'failure',now);
    } else if(now-job.createdAt>=4500) job.status='processing';
  }
  return next;
}
function refund(state,job,reason,now){
  if(!state.ledger.some(e=>e.jobId===job.id&&e.type==='returned'))state.ledger.push({id:crypto.randomUUID(),jobId:job.id,projectId:job.projectId,amount:job.cost,type:'returned',reason,at:now});
}
export function cancelJob(state,id,now=Date.now()) {
  const next=advanceJobs(state,now),job=next.jobs.find(j=>j.id===id);
  if(!job)throw new Error('Generation not found.');
  if(job.status==='processing')throw new Error('Processing has started. Credits return automatically if the sample fails.');
  if(job.status!=='queued')return next;
  job.status='cancelled';job.finishedAt=now;refund(next,job,'cancellation',now);return next;
}
