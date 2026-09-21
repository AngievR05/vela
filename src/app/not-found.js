import Link from "next/link";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="page page--narrow">
      <p className="eyebrow">404</p>
      <h1 className="heading">This page is not on the shelf.</h1>
      <p className="lead">The page may have moved or does not exist.</p>
      <div className="heroActions">
        <Button as={Link} href="/">
          Return to Vela
        </Button>
      </div>
    </main>
  );
}
