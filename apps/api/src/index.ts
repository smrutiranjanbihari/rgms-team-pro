import { createRemoteJWKSet, jwtVerify } from "jose";

interface Env { DB: D1Database; APP_ENV: string; SUPABASE_URL: string; }
interface Principal { userId: string; displayName: string; platformAdmin: boolean; villageRoles: Map<string, Set<string>>; }
type Obj = Record<string, unknown>;
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const uuid=()=>crypto.randomUUID();
const clean=(v:unknown,max=120)=>typeof v==="string"?v.trim().slice(0,max):"";
const isObj=(v:unknown):v is Obj=>typeof v==="object"&&v!==null&&!Array.isArray(v);

async function authenticate(req:Request,env:Env):Promise<Principal|null>{
 const token=(req.headers.get("authorization")??"").match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token||!env.SUPABASE_URL)return null;
 try{
  const issuer=env.SUPABASE_URL.replace(/\/$/,"")+"/auth/v1";
  const jwks=createRemoteJWKSet(new URL(issuer+"/.well-known/jwks.json"));
  const {payload}=await jwtVerify(token,jwks,{issuer,audience:"authenticated"});
  const sub=typeof payload.sub==="string"?payload.sub:""; if(!sub)return null;
  const meta=isObj(payload.user_metadata)?payload.user_metadata:{};
  const display=clean(meta.full_name??meta.name??payload.email??"RGMS User");
  await env.DB.prepare("INSERT OR IGNORE INTO users(id,auth_subject,display_name) VALUES(?,?,?)").bind(sub,sub,display).run();
  const admin=await env.DB.prepare("SELECT auth_subject FROM platform_admins WHERE auth_subject=?").bind(sub).first();
  const rows=await env.DB.prepare("SELECT village_id,role FROM user_village_roles WHERE user_id=? AND status='ACTIVE'").bind(sub).all<{village_id:string;role:string}>();
  const map=new Map<string,Set<string>>();
  for(const row of rows.results??[]){const s=map.get(row.village_id)??new Set<string>();s.add(row.role);map.set(row.village_id,s);}
  return {userId:sub,displayName:display,platformAdmin:Boolean(admin),villageRoles:map};
 }catch{return null;}
}
const hasRole=(p:Principal,v:string,roles:string[])=>p.platformAdmin||Boolean(p.villageRoles.get(v)&&roles.some(r=>p.villageRoles.get(v)!.has(r)));
async function body(req:Request):Promise<Obj|null>{try{const x:unknown=await req.json();return isObj(x)?x:null;}catch{return null;}}
const rid=(req:Request)=>req.headers.get("cf-ray")??uuid();
async function audit(db:D1Database,village:string|null,actor:string,action:string,type:string,target:string,requestId:string,details:Obj={}){
 await db.prepare("INSERT INTO audit_events(id,village_id,actor_user_id,action,target_type,target_id,request_id,details_json) VALUES(?,?,?,?,?,?,?,?)")
 .bind(uuid(),village,actor,action,type,target,requestId,JSON.stringify(details)).run();
}
async function handle(req:Request,env:Env):Promise<Response>{
 const u=new URL(req.url),requestId=rid(req);
 if(req.method==="GET"&&u.pathname==="/health")return json({ok:true,service:"rgms-team-pro-api",environment:env.APP_ENV,requestId});
 if(req.method==="OPTIONS")return new Response(null,{status:204});
 const p=await authenticate(req,env);
 if(!p)return json({error:"unauthorized",message:"A valid Supabase access token is required.",requestId},401);
 if(req.method==="GET"&&u.pathname==="/v1/me")return json({userId:p.userId,displayName:p.displayName,platformAdmin:p.platformAdmin,villageRoles:[...p.villageRoles].map(([v,r])=>({villageId:v,roles:[...r]}))});
 if(req.method==="GET"&&u.pathname==="/v1/villages"){
  const result=p.platformAdmin?await env.DB.prepare("SELECT id,village_code,name,status FROM villages ORDER BY name").all():
   p.villageRoles.size?await env.DB.prepare(`SELECT id,village_code,name,status FROM villages WHERE id IN (${[...p.villageRoles.keys()].map(()=>"?").join(",")}) ORDER BY name`).bind(...p.villageRoles.keys()).all():{results:[]};
  return json({villages:result.results??[]});
 }
 if(req.method==="POST"&&u.pathname==="/v1/villages"){
  if(!p.platformAdmin)return json({error:"forbidden",requestId},403);
  const b=await body(req),parentId=clean(b?.parentNodeId,80),name=clean(b?.name,100);
  if(!parentId||!name)return json({error:"parentNodeId and name are required"},400);
  const parent=await env.DB.prepare("SELECT id,node_type FROM hierarchy_nodes WHERE id=?").bind(parentId).first<{id:string;node_type:string}>();
  if(!parent||parent.node_type!=="GRAM_PANCHAYAT")return json({error:"invalid_parent",message:"Village must be attached to an existing Gram Panchayat node."},400);
  const year=new Date().getUTCFullYear();
  const seq=await env.DB.prepare("INSERT INTO village_sequences(year,last_value) VALUES(?,1) ON CONFLICT(year) DO UPDATE SET last_value=last_value+1 RETURNING last_value").bind(year).first<{last_value:number}>();
  if(!seq)return json({error:"sequence_allocation_failed"},500);
  const id=uuid(),code=`VIL-${year}-${String(seq.last_value).padStart(2,"0")}`;
  try{
   await env.DB.batch([
    env.DB.prepare("INSERT INTO hierarchy_nodes(id,parent_id,node_type,name,code) VALUES(?,?,'VILLAGE',?,?)").bind(id,parentId,name,code),
    env.DB.prepare("INSERT INTO villages(id,hierarchy_node_id,village_code,name,status) VALUES(?,?,?,?, 'PENDING')").bind(id,id,code,name),
    env.DB.prepare("INSERT INTO audit_events(id,village_id,actor_user_id,action,target_type,target_id,request_id,details_json) VALUES(?,?,?,?,?,?,?,?)").bind(uuid(),id,p.userId,"VILLAGE_CREATED","VILLAGE",id,requestId,JSON.stringify({code,name,parentId}))
   ]);
  }catch{return json({error:"village_create_failed"},409);}
  return json({village:{id,villageCode:code,name,status:"PENDING"}},201);
 }
 const tm=u.pathname.match(/^\/v1\/villages\/([^/]+)\/teams$/);
 if(req.method==="POST"&&tm){
  const village=tm[1];if(!hasRole(p,village,["VILLAGE_ADMIN","TOURNAMENT_ADMIN","TEAM_MANAGER"]))return json({error:"forbidden"},403);
  const b=await body(req),name=clean(b?.name,80);if(!name)return json({error:"name is required"},400);
  const id=uuid();try{await env.DB.prepare("INSERT INTO teams(id,village_id,name) VALUES(?,?,?)").bind(id,village,name).run();}catch{return json({error:"team_create_failed"},409);}
  await audit(env.DB,village,p.userId,"TEAM_CREATED","TEAM",id,requestId,{name});return json({team:{id,villageId:village,name}},201);
 }
 const tr=u.pathname.match(/^\/v1\/villages\/([^/]+)\/tournaments$/);
 if(req.method==="POST"&&tr){
  const village=tr[1];if(!hasRole(p,village,["VILLAGE_ADMIN","TOURNAMENT_ADMIN"]))return json({error:"forbidden"},403);
  const b=await body(req),name=clean(b?.name,100),format=clean(b?.format??"LEAGUE",20).toUpperCase();
  if(!name||!["LEAGUE","KNOCKOUT","GROUP_KNOCKOUT"].includes(format))return json({error:"valid name and format are required"},400);
  const id=uuid();await env.DB.prepare("INSERT INTO tournaments(id,village_id,name,format,status,start_date,end_date) VALUES(?,?,?,?,'DRAFT',?,?)").bind(id,village,name,format,clean(b?.startDate,10)||null,clean(b?.endDate,10)||null).run();
  await audit(env.DB,village,p.userId,"TOURNAMENT_CREATED","TOURNAMENT",id,requestId,{name,format});return json({tournament:{id,villageId:village,name,format,status:"DRAFT"}},201);
 }
 const dm=u.pathname.match(/^\/v1\/villages\/([^/]+)\/dashboard$/);
 if(req.method==="GET"&&dm){
  const village=dm[1];if(!hasRole(p,village,["VILLAGE_ADMIN","TOURNAMENT_ADMIN","SCORER","VIEWER","TEAM_MANAGER","PLAYER"]))return json({error:"forbidden"},403);
  const [players,teams,tournaments,matches]=await Promise.all([
   env.DB.prepare("SELECT COUNT(*) AS count FROM players WHERE village_id=?").bind(village).first(),
   env.DB.prepare("SELECT COUNT(*) AS count FROM teams WHERE village_id=?").bind(village).first(),
   env.DB.prepare("SELECT COUNT(*) AS count FROM tournaments WHERE village_id=?").bind(village).first(),
   env.DB.prepare("SELECT COUNT(*) AS count FROM matches WHERE village_id=? AND status='LIVE'").bind(village).first()
  ]);
  return json({villageId:village,counts:{players:players?.count??0,teams:teams?.count??0,tournaments:tournaments?.count??0,liveMatches:matches?.count??0}});
 }
 return json({error:"not_found",requestId},404);
}
export default {fetch:handle};
