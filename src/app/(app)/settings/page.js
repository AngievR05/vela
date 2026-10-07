import {getReader} from "@/lib/auth/server";
import {loadReaderSettings} from "@/lib/reader-settings";
import SettingsScreen from "@/components/settings/SettingsScreen";
export const metadata={title:"Settings"};
export default async function SettingsPage({searchParams}){const {user,supabase}=await getReader();const {view}=await searchParams;let initial=null;try{initial=await loadReaderSettings(supabase,user);}catch{/* Retry without losing account access. */}
return <SettingsScreen initial={initial} initialView={["ai","signals"].includes(view)?view:"root"} userId={user.id} email={user.email||""} createdAt={user.created_at}/>;}
