import Card from "@/components/ui/Card";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <section className="page page--narrow">
      <p className="eyebrow">Settings</p>
      <h1 className="heading">Control Vela</h1>
      <p className="lead">
        Account, accessibility, personalisation and privacy controls live here.
      </p>

      <div className="stack" style={{ marginTop: "2rem" }}>
        <Card>
          <h2 className="subheading">AI + personalisation</h2>
          <p className="muted">
            Personalised recommendations and approved DNF learning controls will be
            implemented here.
          </p>
        </Card>
        <Card>
          <h2 className="subheading">Privacy + data</h2>
          <p className="muted">
            Turning personalisation off must never disable Library CRUD.
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
