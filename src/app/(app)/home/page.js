import { getReader } from "@/lib/auth/server";
import HomeScreen from "@/components/home/HomeScreen";

export const metadata = { title: "Home" };

export default async function HomePage({ searchParams }) {
  const { user } = await getReader();
  const { action } = await searchParams;
  return <HomeScreen key={user.id} userId={user.id} initialAction={action} />;
}
