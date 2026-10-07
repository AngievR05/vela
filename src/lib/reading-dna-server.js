import { allReaderRows, loadHome } from "./reader-library.js";
import { describeDNASignals } from "./reading-dna.js";
export async function loadReadingDNA(supabase,userId){
  const refreshed=await supabase.rpc("refresh_reading_activity");
  if(refreshed.error && !["PGRST202","42883"].includes(refreshed.error.code))throw new Error("Reading activity could not refresh");
  const [home,profile,settings,signals]=await Promise.all([
    loadHome(supabase,userId),
    supabase.from("profiles").select("reading_setup_completed_at,reading_dna_reset_at").eq("id",userId).single(),
    supabase.from("ai_settings").select("personalisation_enabled,use_recent_ratings,use_dnf_reasons,use_recent_history").eq("user_id",userId).single(),
    allReaderRows(supabase,"reading_dna_signals","id,category,label,source_type,evidence,active,internal_weight,influence_state,created_at,updated_at",userId),
  ]);
  if(profile.error||settings.error)throw new Error("Reading DNA unavailable");
  const latest=await supabase.from("reading_dna_changes").select("id,signal_id,action,saved_at,undone").eq("user_id",userId).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle();
  if(latest.error)throw new Error("Saved changes unavailable");
  const change=latest.data;
  const undoable=change&&!change.undone&&["keep","reduce","remove"].includes(change.action)&&signals.some(signal=>signal.id===change.signal_id&&signal.updated_at===change.saved_at)?{id:change.id,signalId:change.signal_id,action:change.action}:null;
  return {userId,fetchedAt:Date.now(),enabled:settings.data.personalisation_enabled,completed:Boolean(profile.data.reading_setup_completed_at),resetAt:profile.data.reading_dna_reset_at,
    undoable,signals:describeDNASignals(signals,home.books,settings.data,profile.data.reading_dna_reset_at)};
}
