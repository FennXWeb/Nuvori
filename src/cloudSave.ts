import type {SupabaseClient} from '@supabase/supabase-js';
import type {Save} from './game';

function saveError(error:{message?:string}|null){
 return new Error(error?.message||'Your cloud adventure could not be saved. Please reconnect and try again.');
}
/** UPDATE existing adventures: UPSERT runs BEFORE INSERT guards even on conflicts.
 * Nursery escrow is created only by Clover's RPC, so replaying it as an INSERT fails.
 * Keep every server guard; insert only for a genuinely new account. */
export async function writeCloudAdventure(client:SupabaseClient,userId:string,save:Save){
 const row={data:save,updated_at:new Date().toISOString()};
 const update=()=>client.from('keeper_saves').update(row).eq('user_id',userId).select('user_id').maybeSingle();
 const result=await update();
 if(result.error)throw saveError(result.error);
 if(result.data)return;
 const inserted=await client.from('keeper_saves').insert({...row,user_id:userId});
 if(!inserted.error)return;
 // Another tab may create the first save between our UPDATE and INSERT.
 if(inserted.error.code==='23505'){
  const retry=await update();if(retry.error)throw saveError(retry.error);
  if(retry.data)return;
 }
 throw saveError(inserted.error);
}
