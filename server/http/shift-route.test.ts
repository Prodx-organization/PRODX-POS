import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './createApp';
import { registerShiftRoute } from './shift-route';

const principal = { userId:'user-1', organizationId:'org-1', storeId:'store-1' };

const start=async(app:ReturnType<typeof createApp>)=>{
 const server=await new Promise<import('node:http').Server>((resolve)=>{const instance=app.listen(0,()=>resolve(instance));});
 const address=server.address(); assert.ok(address&&typeof address!=='string');
 return {baseUrl:`http://127.0.0.1:${address.port}`,close:()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
};

test('shift open route requires authorization and server principal identity',async()=>{
 const calls:string[]=[];
 const db={query:async<T extends Record<string,unknown>>(sql:string,_params:readonly unknown[]=[])=>{calls.push(sql);
   if(sql.includes('INSERT INTO prodx_shift_operations'))return {rows:[{id:'op-1'}] as unknown as T[]};
   if(sql.includes('SELECT r.status,s.currency FROM prodx_registers'))return {rows:[{status:'active',currency:'THB'}] as unknown as T[]};
   if(sql.includes('SELECT id FROM prodx_shifts WHERE register_id'))return {rows:[] as unknown as T[]};
   if(sql.includes('SELECT s.id,s.store_id'))return {rows:[{id:'shift-1',store_id:'store-1',register_id:'reg-1',cashier_id:'user-1',cashier_name:'Cashier',opened_at:'2026-09-29T00:00:00Z',closed_at:null,status:'open',opening_float_amount:'100.00',actual_counted_cash_amount:null,currency:'THB'}] as unknown as T[]};
   if(sql.includes('FROM prodx_cash_movements'))return {rows:[{id:'mov-1',shift_id:'shift-1',type:'opening_float',amount:'100.00',reason:'Initial opening cash drawer float',performed_by_user_id:'user-1',currency:'THB',created_at:'2026-09-29T00:00:00Z'}] as unknown as T[]};
   return {rows:[] as unknown as T[]};
 },transaction:async(work:any)=>work({query:db.query})};
 const app=createApp({authenticateRequest:()=>principal,authorizeRequest:(_c,p)=>p==='cash.shift.open',configureRoutes:(x)=>registerShiftRoute(x,db)});
 const server=await start(app);
 try{
  const res=await fetch(`${server.baseUrl}/api/v1/shifts/open`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({registerId:'reg-1',openingFloat:{amountInCents:10000,currency:'THB'},cashierId:'attacker',idempotencyKey:'open-1'})});
  assert.equal(res.status,201);
  assert.ok(calls.some(x=>x.includes('INSERT INTO prodx_audit_log')));
 }finally{await server.close();}
});

test('shift route denies unauthorized access before database work',async()=>{
 let queried=false;
 const db={query:async<T extends Record<string,unknown>>(_sql:string,_p:readonly unknown[]=[])=>{queried=true;return {rows:[] as unknown as T[]};},transaction:async(work:any)=>work({query:db.query})};
 const app=createApp({authenticateRequest:()=>principal,authorizeRequest:()=>false,configureRoutes:(x)=>registerShiftRoute(x,db)});
 const server=await start(app);
 try{const res=await fetch(`${server.baseUrl}/api/v1/shifts/current?registerId=reg-1`);assert.equal(res.status,403);assert.equal(queried,false);}finally{await server.close();}
});