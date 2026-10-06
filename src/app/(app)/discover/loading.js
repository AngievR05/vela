import DiscoverShell from "@/components/discover/DiscoverShell";
import SkeletonLoader from "@/components/states/SkeletonLoader";
export default function DiscoverLoading(){return <DiscoverShell title="Discover" subtitle="Loading"><SkeletonLoader variant="library" label="Loading Discover"/></DiscoverShell>;}
