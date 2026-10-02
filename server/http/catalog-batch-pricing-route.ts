import crypto from 'node:crypto';
import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import type { TransactionalSqlExecutor } from '../db/transaction';

type Direction = 'increase' | 'decrease';
type RoundingStrategy = 'exact_cents' | 'round_whole' | 'charm_99' | 'charm_95';
type ProductRow = { id:string; store_id:string; sku:string; name:string; price_amount:string; currency:string; };

const hashPayload=(value:unknown)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const dto=(row:ProductRow)=>({id:row.id,storeId:row.store_id,sku:row.sku,name:row.name,oldPriceCents:0,newPriceCents:Math.round(Number(row.price_amount)*100),deltaCents:0,percentageEffective:0,currency:row.currency});

export const registerCatalogBatchPricingRoute=(app:Express,db:TransactionalSqlExecutor):void=>{
  app.post('/api/v1/catalog/pricing/batch',requirePermission('catalog.write'),async(request:Request,response:Response)=>{
    const context=request.prodxContext;
    if(!context){response.status(500).json({error:{code:'REQUEST_CONTEXT_MISSING',message:'Request context is required.',requestId:request.id}});return;}
    const body=request.body as {productIds?:unknown;direction?:unknown;percentage?:unknown;roundingStrategy?:unknown;reasonNotes?:unknown;idempotencyKey?:unknown};
    const productIds=Array.isArray(body.productIds)?[...new Set(body.productIds.filter((v):v is string=>typeof v==='string'&&!!v.trim()).map(v=>v.trim()))]:[];
    const direction=body.direction as Direction;
    const percentage=body.percentage;
    const roundingStrategy=(body.roundingStrategy??'exact_cents') as RoundingStrategy;
    const idempotencyKey=typeof body.idempotencyKey==='string'?body.idempotencyKey.trim():'';
    const reasonNotes=typeof body.reasonNotes==='string'?body.reasonNotes.trim():undefined;
    if(productIds.length===0||productIds.length>100){response.status(400).json({error:{code:'INVALID_PRODUCT_IDS',message:'Between 1 and 100 product IDs are required.',requestId:request.id}});return;}
    if(!['increase','decrease'].includes(direction)){response.status(400).json({error:{code:'INVALID_PRICE_DIRECTION',message:'Invalid price adjustment direction.',requestId:request.id}});return;}
    if(typeof percentage!=='number'||!Number.isFinite(percentage)||percentage<0||percentage>100){response.status(400).json({error:{code:'INVALID_PRICE_PERCENTAGE',message:'Percentage must be between 0 and 100.',requestId:request.id}});return;}
    if(!['exact_cents','round_whole','charm_99','charm_95'].includes(roundingStrategy)){response.status(400).json({error:{code:'INVALID_ROUNDING_STRATEGY',message:'Invalid rounding strategy.',requestId:request.id}});return;}
    if(!idempotencyKey){response.status(400).json({error:{code:'IDEMPOTENCY_KEY_REQUIRED',message:'Idempotency key is required.',requestId:request.id}});return;}
    const payload={productIds,direction,percentage,roundingStrategy,reasonNotes};
    const payloadHash=hashPayload(payload);
    try{
      const result=await db.transaction(async(tx)=>{
        const inserted=await tx.query<{id:string}>(`INSERT INTO prodx_catalog_pricing_operations(id,organization_id,store_id,actor_user_id,idempotency_key,payload_hash,result)
          VALUES($1,$2,$3,$4,$5,$6,'{}'::jsonb)
          ON CONFLICT(organization_id,store_id,actor_user_id,idempotency_key) DO NOTHING RETURNING id`,
          [crypto.randomUUID(),context.principal.organizationId,context.principal.storeId,context.principal.userId,idempotencyKey,payloadHash]);
        if(!inserted.rows[0]){
          const row=(await tx.query<{payload_hash:string;result:unknown}>(`SELECT payload_hash,result FROM prodx_catalog_pricing_operations
            WHERE organization_id=$1 AND store_id=$2 AND actor_user_id=$3 AND idempotency_key=$4 FOR UPDATE`,
            [context.principal.organizationId,context.principal.storeId,context.principal.userId,idempotencyKey])).rows[0];
          if(!row||row.payload_hash!==payloadHash)throw Object.assign(new Error('Idempotency key was already used for a different pricing operation.'),{statusCode:409,code:'CATALOG_PRICING_CONFLICT'});
          return row.result;
        }
        const rows=(await tx.query<ProductRow>(`SELECT id,store_id,sku,name,price_amount::text,currency FROM prodx_products
          WHERE store_id=$1 AND id=ANY($2::uuid[]) AND active=true FOR UPDATE`,[context.principal.storeId,productIds])).rows;
        if(rows.length!==productIds.length)throw Object.assign(new Error('One or more products are missing or inactive in this store.'),{statusCode:409,code:'CATALOG_PRODUCT_SCOPE_CONFLICT'});
        const factor=direction==='increase'?'(1 + $3::numeric / 100)':'(1 - $3::numeric / 100)';
        const priceExpression=roundingStrategy==='exact_cents'?\`ROUND(price_amount * \${factor}, 2)\`:roundingStrategy==='round_whole'?\`ROUND(price_amount * \${factor}, 0)\`:roundingStrategy==='charm_99'?\`FLOOR(price_amount * \${factor}) + 0.99\`:\`FLOOR(price_amount * \${factor}) + 0.95\`;
        const updated=(await tx.query<ProductRow>(\`WITH old_prices AS (SELECT id,price_amount AS old_price FROM prodx_products WHERE store_id=$1 AND id=ANY($2::uuid[]) AND active=true)
          UPDATE prodx_products p SET price_amount=GREATEST(0,\${priceExpression}),updated_at=CURRENT_TIMESTAMP
          WHERE p.store_id=$1 AND p.id=ANY($2::uuid[]) AND p.active=true
          RETURNING p.id,p.store_id,p.sku,p.name,p.price_amount::text,p.currency\`,[context.principal.storeId,productIds,percentage])).rows;
        const oldMap=new Map(rows.map(row=>[row.id,Math.round(Number(row.price_amount)*100)]));
        const items=updated.map(row=>{const oldPriceCents=oldMap.get(row.id)??0;const newPriceCents=Math.round(Number(row.price_amount)*100);return{...dto(row),oldPriceCents,newPriceCents,deltaCents:newPriceCents-oldPriceCents,percentageEffective:oldPriceCents?((newPriceCents-oldPriceCents)/oldPriceCents)*100:0};});
        const result={batchReference:`PRC-${inserted.rows[0].id.slice(0,8).toUpperCase()}`,updatedCount:items.length,previousTotalRetailValueCents:items.reduce((s,i)=>s+i.oldPriceCents,0),newTotalRetailValueCents:items.reduce((s,i)=>s+i.newPriceCents,0),deltaRetailValueCents:items.reduce((s,i)=>s+i.deltaCents,0),items,updatedProducts:[],timestamp:new Date().toISOString()};
        await tx.query('UPDATE prodx_catalog_pricing_operations SET result=$1::jsonb WHERE id=$2',[JSON.stringify(result),inserted.rows[0].id]);
        await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,user_id,action,severity,details)
          VALUES($1,$2,$3,$4,'catalog_batch_price_adjusted','info',$5::jsonb)`,
          [crypto.randomUUID(),context.principal.organizationId,context.principal.storeId,context.principal.userId,JSON.stringify({batchReference:result.batchReference,productIds,direction,percentage,roundingStrategy,reasonNotes})]);
        return result;
      });
      response.status(200).json(result);
    }catch(error){
      const typed=error as {statusCode?:number;code?:string;message?:string};
      if(typed.statusCode===409){response.status(409).json({error:{code:typed.code??'CATALOG_PRICING_CONFLICT',message:typed.message??'Pricing operation conflicts with current state.',requestId:request.id}});return;}
      throw error;
    }
  });
};
