import { getReader } from "@/lib/auth/server";
import AddBookScreen from "@/components/library/AddBookScreen";
export const metadata={title:"Add a book"};
export default async function AddBookPage() { const { user }=await getReader(); return <AddBookScreen key={user.id} userId={user.id}/>; }
