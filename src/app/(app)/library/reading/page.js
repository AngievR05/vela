import { getReader } from "@/lib/auth/server";
import ReadingScreen from "@/components/reading/ReadingScreen";
export const metadata={title:"Current reading"};
export default async function CurrentReadingPage({searchParams}){
  const {user}=await getReader(),{book}=await searchParams;
  return <ReadingScreen userId={user.id} initialBookId={book||null}/>;
}
