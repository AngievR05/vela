"use client";

import Button from "@/components/ui/Button";

export default function GlobalError({ reset }) {
  return (
    <main className="page page--narrow">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="heading">Vela could not load this page.</h1>
      <p className="lead">
        Your data has not been changed. Try the action again.
      </p>
      <div className="heroActions">
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </main>
  );
}
