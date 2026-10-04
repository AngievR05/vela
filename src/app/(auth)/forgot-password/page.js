import AuthForm from "@/components/auth/AuthForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return <main className="page page--narrow">
    <p className="eyebrow">Account</p>
    <h1 className="heading">Reset your password</h1>
    <p className="lead">Enter your email to request a reset link.</p>
    <div style={{ marginTop: "2rem" }}><AuthForm mode="forgot" /></div>
  </main>;
}
