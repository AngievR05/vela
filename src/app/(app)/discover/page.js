import DiscoverScreen from "@/components/discover/DiscoverScreen";
import { getReader } from "@/lib/auth/server";

export const metadata = { title: "Discover" };

export default async function DiscoverPage() {
  const { user } = await getReader();
  return <DiscoverScreen key={user.id} userId={user.id}/>;
}
