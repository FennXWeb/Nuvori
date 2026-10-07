import { supabase } from "./online";
import { validateSave, type Save } from "./game";
import { normalizeSave } from "./nursery";
import type { NurseryAction } from "./NurseryPanel";
export async function nurseryCloud(action: NurseryAction): Promise<Save> {
  if (!supabase) throw new Error("Reconnect your account to visit the nursery.");
  const {data,error}=await supabase.rpc("nuvori_nursery",{operation:action.type,parent_a:action.type==="start"?action.parents[0]:null,parent_b:action.type==="start"?action.parents[1]:null,visit_id:action.type==="start"?null:action.jobId});
  if(error)throw new Error(error.message);
  if(!validateSave(data))throw new Error("The nursery returned an unreadable adventure. Reload your cloud save before continuing.");
  return normalizeSave(data);
}

