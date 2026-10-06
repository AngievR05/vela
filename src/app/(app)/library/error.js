"use client";
import LibraryShell from "@/components/library/LibraryShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
export default function Error({ reset }) { return <LibraryShell title="Library" subtitle="Try again" code="D15"><Card><h2>We couldn’t load your books.</h2><p>Your Library is safe. Please try again.</p><Button onClick={reset}>Retry</Button><Button href="/library" variant="secondary">Back to Library</Button></Card></LibraryShell>; }
