import Card from "@/components/ui/Card";

export const metadata = { title: "Reading DNA" };

const sampleSignals = [
  ["Fantasy", "Strong", "Onboarding + high ratings"],
  ["Romance", "Strong", "Onboarding + completed books"],
  ["Fast pacing", "Emerging", "Ratings + approved DNF evidence"],
  ["Found family", "Emerging", "Repeated high ratings"],
];

export default function DnaPage() {
  return (
    <section className="page">
      <p className="eyebrow">Reading DNA</p>
      <h1 className="heading">Inspect + correct</h1>
      <p className="lead">
        Reading DNA is structured, editable evidence. Internal weights stay hidden
        behind qualitative labels rather than fake percentages.
      </p>

      <div className="grid grid--2" style={{ marginTop: "2rem" }}>
        {sampleSignals.map(([name, strength, evidence]) => (
          <Card key={name}>
            <p className="eyebrow">{strength}</p>
            <h2 className="subheading">{name}</h2>
            <p className="muted">{evidence}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
