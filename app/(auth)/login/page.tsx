import AuthForm from "../AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // /auth/callback bounces failed OAuth attempts here with ?error=oauth.
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      initialError={error === "oauth" ? "Google sign-in failed or was cancelled. Please try again." : null}
    />
  );
}
