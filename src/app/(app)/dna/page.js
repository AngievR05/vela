import {getReader} from "@/lib/auth/server";
import ReadingDNAScreen from "@/components/dna/ReadingDNAScreen";
export const metadata={title:"Reading DNA"};
export default async function DnaPage({searchParams}){const {user}=await getReader();const {view}=await searchParams;return <ReadingDNAScreen key={user.id} userId={user.id} initialView={view}/>;}
