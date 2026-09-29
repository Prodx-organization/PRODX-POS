import type { Order } from '../domain/order';
const API_BASE_URL=import.meta.env.VITE_AUTH_API_BASE_URL;
const baseUrl=()=>{if(!API_BASE_URL)throw new Error('Production order API is not configured: VITE_AUTH_API_BASE_URL is missing.');return API_BASE_URL.replace(/\/$/,'');};
const requireToken=(token:string)=>{if(!token.trim())throw new Error('Authenticated session token is required for order access.');return token.trim();};
export interface IProductionOrderReadApi{getOrders(limit?:number):Promise<readonly Order[]>;}
export function createProductionOrderReadApi(token:string):IProductionOrderReadApi{return{async getOrders(limit=50){const response=await fetch(`${baseUrl()}/api/v1/orders?limit=${encodeURIComponent(String(limit))}`,{credentials:'include',headers:{Accept:'application/json',Authorization:`Bearer ${requireToken(token)}`}});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.error?.message??'Order request failed.');return body as readonly Order[];}};}
