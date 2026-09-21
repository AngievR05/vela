import Card from "@/components/ui/Card";

export const metadata = { title: "Home" };

export default function HomePage() {
  return (
    <section className="page">
      <p className="eyebrow">Home</p>
      <h1 className="heading">Good evening, Reader</h1>
      <p className="lead">Your current reading and quickest next actions live here.</p>

      <div className="grid grid--2" style={{ marginTop: "2rem" }}>
        <Card>
          <p className="eyebrow">Currently reading</p>
          <h2 className="subheading">No book selected yet</h2>
          <p className="muted">
            Library CRUD will populate current reading, progress and status here.
          </p>
        </Card>
        <Card tone="evergreen">
          <p className="eyebrow">Ready for something new?</p>
          <h2 className="subheading">Find my next read</h2>
          <p>Vela will return three focused, explainable recommendations.</p>
        </Card>
      </div>
    </section>
  );
}
