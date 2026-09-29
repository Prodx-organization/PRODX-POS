import type { InventoryLedgerEntry, StockMovementReason } from '../domain/catalog';
const API_BASE_URL=import.meta.env.VITE_AUTH_API_BASE_URL;
const baseUrl=()=>{if(!API_BASE_URL)throw new Error('Production inventory API is not configured: VITE_AUTH_API_BASE_URL is missing.');return API_BASE_URL.replace(/\/$/,'');};
const tokenOf=(token:string)=>{if(!token.trim())throw new Error('Authenticated session token is required for inventory operations.');return token.trim();};
type Result={idempotencyCached:boolean;adjustmentId:string;entries:InventoryLedgerEntry[]};
const request=async(token:string,body:unknown):Promise<Result>=>{const response=await fetch(`${baseUrl()}/api/v1/inventory/adjustments`,{method:'POST',credentials:'include',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${tokenOf(token)}`},body:JSON.stringify(body)});const payload=await response.json().catch(()=>null);if(!response.ok)throw new Error(payload?.error?.message??'Inventory adjustment failed.');return payload as Result;};
export function createProductionInventoryAdjustmentApi(token:string){
 return {
  adjustStock:(storeId:string,productId:string,quantityDelta:number,reason:StockMovementReason,userId:string,notes?:string)=>request(token,{storeId,productIds:[productId],quantityDelta,reason,userId,notes,idempotencyKey:`inventory:${productId}:${quantityDelta}:${reason}:${crypto.randomUUID()}`}).then(r=>r.entries[0]),
  bulkAdjustStock:(storeId:string,productIds:readonly string[],quantityDelta:number,reason:StockMovementReason,userId:string,notes?:string)=>request(token,{storeId,productIds,quantityDelta,reason,userId,notes,idempotencyKey:`inventory-bulk:${crypto.randomUUID()}`}).then(r=>r.entries),
 };
}
