import { Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function LandingPage() {
  return (
    <main className="page page--narrow">
      <p className="eyebrow">Transparent AI personalisation</p>
      <h1 className="heading">VELA</h1>
      <p className="lead">Your reading life, intelligently organised.</p>

      <div className="heroActions">
        <Button href="/signup">
          Create account
        </Button>
        <Button href="/login" variant="secondary">
          Log in
        </Button>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Card>
          <Sparkles aria-hidden="true" size={22} />
          <h2 className="subheading" style={{ marginTop: "0.75rem" }}>
            Track → Reflect → Learn → Recommend → Correct → Read
          </h2>
          <p className="muted">
            Create your private reading space. Library tracking, Reading DNA
            and AI recommendations are coming next.
          </p>
        </Card>
      </div>
    </main>
  );
}
