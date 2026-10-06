import {getReader} from "@/lib/auth/server";
import {loadReaderSettings} from "@/lib/reader-settings";
import SettingsScreen from "@/components/settings/SettingsScreen";
export const metadata={title:"Settings"};
export default async function SettingsPage(){const {user,supabase}=await getReader();let initial=null;try{initial=await loadReaderSettings(supabase,user);}catch{/* Retry without losing account access. */}
return <SettingsScreen initial={initial} userId={user.id} email={user.email||""} createdAt={user.created_at}/>;}
