import PasswordForm from "./PasswordForm";

// Public interstitial for password-gated links.
export default async function UnlockPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <PasswordForm slug={slug} />
    </main>
  );
}
