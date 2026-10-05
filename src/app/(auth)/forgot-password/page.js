import AuthForm from "@/components/auth/AuthForm";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({ searchParams }) {
  const params = await searchParams;
  return <AuthForm mode="forgot" next={params.next} />;
}
