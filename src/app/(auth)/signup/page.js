import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <main className="page page--narrow">
      <p className="eyebrow">Account</p>
      <h1 className="heading">Create your account</h1>
      <p className="lead">
        Start with only the details Vela needs to create your private reading space.
      </p>

      <div style={{ marginTop: "2rem" }}>
        <Card>
          <form className="stack">
            <label>
              Display name
              <input name="displayName" placeholder="Reader" style={fieldStyle} />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="reader@example.com"
                style={fieldStyle}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                style={fieldStyle}
              />
            </label>
            <Button type="button">Create account</Button>
          </form>
        </Card>
      </div>

      <p className="muted">
        Already have an account? <Link href="/login">Log in</Link>.
      </p>
      <p className="screenNote">
        Personalisation is configured after sign-up. The Library will remain usable
        even when personalised recommendations are disabled.
      </p>
    </main>
  );
}

const fieldStyle = {
  width: "100%",
  minHeight: "44px",
  marginTop: "0.4rem",
  padding: "0.75rem",
  border: "1px solid rgba(34,32,30,0.22)",
  borderRadius: "0.75rem",
  background: "#fbf8f2",
  color: "#22201e",
};
