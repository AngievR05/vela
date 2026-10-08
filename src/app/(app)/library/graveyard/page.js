import { getReader } from "@/lib/auth/server";
import ReadingScreen from "@/components/reading/ReadingScreen";
export const metadata={title:"Graveyard"};
export default async function GraveyardPage(){
  const {user}=await getReader();
  return <ReadingScreen userId={user.id} graveyard/>;
}
