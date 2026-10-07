import { getReader } from "@/lib/auth/server";
import ReadingStatsScreen from "@/components/stats/ReadingStatsScreen";
import { z } from "zod";
export const metadata = { title: "Reading stats" };
export default async function ReadingStatsPage({ searchParams }) {
  const { user } = await getReader();
  const { view, book } = await searchParams;
  return <ReadingStatsScreen key={user.id} userId={user.id} initialView={view} initialBook={z.uuid().safeParse(book).success ? book : null} />;
}
