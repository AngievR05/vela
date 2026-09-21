import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="page page--narrow">
      <p className="eyebrow">Account</p>
      <h1 className="heading">Welcome back</h1>
      <p className="lead">
        Log in to continue to your private library and Reading DNA.
      </p>

      <div style={{ marginTop: "2rem" }}>
        <Card>
          <form className="stack">
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
                autoComplete="current-password"
                placeholder="••••••••"
                style={fieldStyle}
              />
            </label>
            <Button type="button">Log in</Button>
          </form>
        </Card>
      </div>

      <p className="muted">
        New to Vela? <Link href="/signup">Create an account</Link>.
      </p>
      <p className="screenNote">
        Authentication UI only. Supabase form actions are intentionally added during
        the authentication sprint.
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
