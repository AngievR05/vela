import AuthForm from "@/components/auth/AuthForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
