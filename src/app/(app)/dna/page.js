import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getReader } from "@/lib/auth/server";
import { loadReadingSetup } from "@/lib/reading-setup-server";
import { loadHome } from "@/lib/home-server";

export const metadata = { title: "Reading DNA" };

export default async function DnaPage() {
  const { user, supabase } = await getReader();
  const setup = await loadReadingSetup(supabase, user.id);
  const { signals } = await loadHome(supabase, user.id);
  return (
    <section className="page">
      <p className="eyebrow">Reading DNA</p>
      <h1 className="heading">Inspect + correct</h1>
      <p className="lead">
        {setup.enabled ? "Your reading starting point. Edit your choices whenever your taste or mood changes."
          : "Personalisation is off. You can still use your Library and reading tracker."}
      </p>

      <div className="grid grid--2" style={{ marginTop: "2rem" }}>
        {signals.map((signal) => (
          <Card key={signal.id}>
            <p className="eyebrow">{signal.category.replaceAll("_", " ")}</p>
            <h2 className="subheading">{signal.label}</h2>
            <p className="muted">{signal.source === "onboarding" ? "Chosen by you during reading setup" : "Saved reading signal"}</p>
            {signal.evidence.map((book) => <p key={book.id} className="muted">{book.title}</p>)}
          </Card>
        ))}
      </div>
      {setup.enabled && !signals.length && <p className="muted">No taste choices yet. Add some whenever you’re ready.</p>}
      <div className="heroActions"><Button href="/setup">{setup.completed ? "Edit reading setup" : "Set up Reading DNA"}</Button></div>
    </section>
  );
}
