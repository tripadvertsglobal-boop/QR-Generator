import AuthForm from "../AuthForm";
import { checkoutPlan } from "@/lib/checkout-intent";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  // /pricing sends ?plan= here when a signed-out visitor clicks a paid CTA.
  const { plan } = await searchParams;
  return <AuthForm mode="signup" resumePlan={checkoutPlan(plan)} />;
}
