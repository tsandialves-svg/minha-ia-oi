const buckets = new Map<string,{ count:number; reset:number }>();
export function allowed(key:string, max=20, windowMs=60000) { const now=Date.now(); const old=buckets.get(key); if(!old || old.reset<now){ buckets.set(key,{count:1,reset:now+windowMs}); return true; } if(old.count>=max)return false; old.count++; return true; }
