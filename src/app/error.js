"use client";

import Button from "@/components/ui/Button";

export default function GlobalError({ reset }) {
  return (
    <main className="page page--narrow">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="heading">Vela could not load this page.</h1>
      <p className="lead">
        Reload this page. If a save was interrupted, check the current record before trying again.
      </p>
      <div className="heroActions">
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </main>
  );
}
