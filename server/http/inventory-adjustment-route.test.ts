import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryResultRow } from 'pg';
import { createApp } from './createApp';
import { registerInventoryAdjustmentRoute } from './inventory-adjustment-route';
import type { TransactionalSqlExecutor } from '../db/transaction';

const principal={userId:'user-1',organizationId:'org-1',storeId:'store-1',sessionId:'session-1'};
const start=async(app:ReturnType<typeof createApp>)=>{const server=await new Promise<import('node:http').Server>(resolve=>{const s=app.listen(0,()=>resolve(s));});const address=server.address();assert.ok(address&&typeof address!=='string');return{baseUrl:`http://127.0.0.1:${address.port}`,close:()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};};

test('inventory adjustment is permissioned, atomic, store-scoped and idempotent',async()=>{
 let adjustmentInsert=0; let productUpdate=0;
 const query=async<T extends QueryResultRow>(sql:string,parameters:readonly unknown[]=[])=>{
  if(sql.includes('FROM prodx_inventory_adjustments')) return {rows:[] as unknown as T[]};
  if(sql.includes('FROM prodx_products')&&sql.includes('FOR UPDATE')) return {rows:[{id:'product-1',current_stock:10}] as unknown as T[]};
  if(sql.startsWith('INSERT INTO prodx_inventory_adjustments')) {adjustmentInsert++;return {rows:[{id:'adjustment-1'}] as unknown as T[]};}
  if(sql.startsWith('UPDATE prodx_products')) {productUpdate++;return {rows:[{current_stock:15}] as unknown as T[]};}
  if(sql.startsWith('INSERT INTO prodx_inventory_ledger')) return {rows:[{id:'ledger-1',store_id:'store-1',product_id:'product-1',quantity_delta:5,resulting_stock:15,reason:'purchase_received',reference_id:'adjustment-1',performed_by_user_id:'user-1',created_at:'2026-09-29T00:00:00.000Z'}] as unknown as T[]};
  if(sql.includes('INSERT INTO prodx_audit_log')) return {rows:[] as unknown as T[]};
  throw new Error(`Unexpected SQL: ${sql}`);
 };
 const db:TransactionalSqlExecutor={query,transaction:async work=>work({query})};
 const app=createApp({authenticateRequest:()=>principal,authorizeRequest:(_c,p)=>p==='inventory.adjust',configureRoutes:a=>registerInventoryAdjustmentRoute(a,db)});
 const server=await start(app);
 try{
  const response=await fetch(`${server.baseUrl}/api/v1/inventory/adjustments`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({productIds:['product-1'],quantityDelta:5,reason:'purchase_received',idempotencyKey:'inventory-test-1'})});
  assert.equal(response.status,201); assert.equal((await response.json()).idempotencyCached,false); assert.equal(adjustmentInsert,1); assert.equal(productUpdate,1);
 }finally{await server.close();}
});

test('inventory adjustment fails closed without inventory.adjust permission',async()=>{
 const db:TransactionalSqlExecutor={query:async()=>{throw new Error('database must not be reached');},transaction:async()=>{throw new Error('transaction must not be reached');}};
 const app=createApp({authenticateRequest:()=>principal,authorizeRequest:()=>false,configureRoutes:a=>registerInventoryAdjustmentRoute(a,db)});
 const server=await start(app);
 try{const response=await fetch(`${server.baseUrl}/api/v1/inventory/adjustments`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(response.status,403);}finally{await server.close();}
});