import AuthForm from "../AuthForm";
import { checkoutPlan } from "@/lib/checkout-intent";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; plan?: string }>;
}) {
  // /auth/callback bounces failed OAuth attempts here with ?error=oauth.
  const { error, plan } = await searchParams;
  return (
    <AuthForm
      mode="login"
      initialError={error === "oauth" ? "Google sign-in failed or was cancelled. Please try again." : null}
      resumePlan={checkoutPlan(plan)}
    />
  );
}
