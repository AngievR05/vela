import LibraryShell from "@/components/library/LibraryShell";
import SkeletonLoader from "@/components/states/SkeletonLoader";
export default function Loading() { return <LibraryShell title="Library" subtitle="Loading your books…" code="D15"><SkeletonLoader variant="library" label="Loading your books"/></LibraryShell>; }
