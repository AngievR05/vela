import Card from "@/components/ui/Card";
import LogoutButton from "@/components/auth/LogoutButton";
import Button from "@/components/ui/Button";
import { getReader } from "@/lib/auth/server";
import { loadReadingSetup } from "@/lib/reading-setup-server";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, supabase } = await getReader();
  const setup = await loadReadingSetup(supabase, user.id);
  return (
    <section className="page page--narrow">
      <p className="eyebrow">Settings</p>
      <h1 className="heading">Control Vela</h1>
      <p className="lead">
        Account, accessibility, personalisation and privacy controls live here.
      </p>

      <div className="stack" style={{ marginTop: "2rem" }}>
        <Card>
          <h2 className="subheading">Account</h2>
          <LogoutButton />
        </Card>
        <Card>
          <h2 className="subheading">AI + personalisation</h2>
          <p className="muted">
            Personalisation is {setup.enabled ? "on" : "off"}. Your choices remain editable.
          </p>
          <Button href="/setup">{setup.completed ? "Edit reading setup" : "Set up Reading DNA"}</Button>
        </Card>
        <Card>
          <h2 className="subheading">Privacy + data</h2>
          <p className="muted">
            Ratings: {setup.permissions.ratings ? "On" : "Off"} · DNF reasons: {setup.permissions.dnf ? "On" : "Off"} · Reading history: {setup.permissions.history ? "On" : "Off"}.
            Your Library works with every optional signal off.
          </p>
        </Card>
        <Card>
          <h2 className="subheading">Accessibility + appearance</h2>
          <p className="muted">
            Keep persistent labels, visible focus, adequate contrast and clear state
            feedback.
          </p>
        </Card>
      </div>
    </section>
  );
}
