import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <section className="page page--narrow">
      <p className="eyebrow">Discover</p>
      <h1 className="heading">Find my next read</h1>
      <p className="lead">
        Describe what fits right now. Vela will choose only from validated Google
        Books candidates.
      </p>

      <div style={{ marginTop: "2rem" }}>
        <Card>
          <form className="stack">
            <label htmlFor="reading-request">What are you in the mood for?</label>
            <textarea
              id="reading-request"
              name="readingRequest"
              rows="5"
              placeholder="Something romantic, high-stakes and fast-paced."
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: "0.85rem",
                border: "1px solid rgba(34,32,30,0.22)",
                background: "#fbf8f2",
                resize: "vertical",
              }}
            />
            <Button type="button">Recommend 3 books</Button>
          </form>
        </Card>
      </div>

      <p className="screenNote">
        The AI route is scaffolded but not implemented yet. It will accept permitted
        Reading DNA signals and return exactly three validated selections.
      </p>
    </section>
  );
}
