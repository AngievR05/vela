import { getReader } from "@/lib/auth/server";
import LibraryScreen from "@/components/library/LibraryScreen";
import { libraryStatuses } from "@/lib/library-data";
export const metadata={title:"Library"};
export default async function LibraryPage({ searchParams }) {
  const { user }=await getReader();const { tab }=await searchParams;
  return <LibraryScreen key={user.id} userId={user.id} initialTab={libraryStatuses.some(item=>item.value===tab)?tab:"all"} />;
}
