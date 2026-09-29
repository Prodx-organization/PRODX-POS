import type { InventoryLedgerEntry, StockMovementReason } from '../domain/catalog';

const API_BASE_URL=import.meta.env.VITE_AUTH_API_BASE_URL;
const baseUrl=()=>{if(!API_BASE_URL)throw new Error('Production inventory API is not configured: VITE_AUTH_API_BASE_URL is missing.');return API_BASE_URL.replace(/\/$/,'');};
const requireToken=(token:string)=>{if(!token.trim())throw new Error('Authenticated session token is required for inventory operations.');return token.trim();};

type ServerEntry={id:string;store_id:string;product_id:string;quantity_delta:number;resulting_stock:number;reason:StockMovementReason;reference_id:string;performed_by_user_id:string;created_at:string};
type ServerResult={idempotencyCached:boolean;adjustmentId:string;entries:ServerEntry[]};
const mapEntry=(e:ServerEntry):InventoryLedgerEntry=>({id:e.id,storeId:e.store_id,productId:e.product_id,quantityDelta:e.quantity_delta,resultingStock:e.resulting_stock,reason:e.reason,referenceId:e.reference_id,performedByUserId:e.performed_by_user_id,timestamp:e.created_at});

async function request(token:string,body:unknown):Promise<ServerResult>{
 const response=await fetch(`${baseUrl()}/api/v1/inventory/adjustments`,{method:'POST',credentials:'include',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${requireToken(token)}`},body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(payload?.error?.message??'Inventory adjustment failed.');
 return payload as ServerResult;
}
export function createProductionInventoryAdjustmentApi(token:string){
 return {
  adjustStock:async (_storeId:string,productId:string,quantityDelta:number,reason:StockMovementReason,_userId:string,notes?:string)=>{
   const result=await request(token,{productIds:[productId],quantityDelta,reason,notes,idempotencyKey:`inventory-adjust:${crypto.randomUUID()}`});
   return mapEntry(result.entries[0]);
  },
  bulkAdjustStock:async (_storeId:string,productIds:readonly string[],quantityDelta:number,reason:StockMovementReason,_userId:string,notes?:string)=>{
   const result=await request(token,{productIds,quantityDelta,reason,notes,idempotencyKey:`inventory-bulk-adjust:${crypto.randomUUID()}`});
   return result.entries.map(mapEntry);
  },
 };
}
