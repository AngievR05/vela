"use client";
import DiscoverShell from "@/components/discover/DiscoverShell";
import Button from "@/components/ui/Button";
export default function DiscoverError({ reset }) { return <DiscoverShell title="Discover" subtitle="Please try again"><h2>This page could not load.</h2><p>Your Library and reading choices are safe.</p><Button onClick={reset}>Retry</Button><Button href="/library" variant="secondary">Open Library</Button></DiscoverShell>; }
