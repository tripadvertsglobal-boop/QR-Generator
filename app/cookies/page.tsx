import type { Metadata } from "next";
import { siteConfig } from "@/site.config";
import LegalPage from "../_components/LegalPage";

const { company, contact } = siteConfig;

export const metadata: Metadata = {
  title: `Cookie Policy — ${company.name}`,
  description: `How ${company.name} uses cookies and similar technologies.`,
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      lastUpdated="June 17, 2026"
      intro={`This Cookie Policy explains how ${company.name} uses cookies and similar technologies when you visit our site or use our dashboard.`}
      sections={[
        {
          heading: "What cookies are",
          body: (
            <p>
              Cookies are small text files stored on your device. We use them,
              along with similar technologies such as local storage, to keep you
              signed in and to understand how the service is used.
            </p>
          ),
        },
        {
          heading: "Cookies we use",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Essential</strong> — authentication and session cookies
                required to sign in and use the dashboard securely.
              </li>
              <li>
                <strong>Preferences</strong> — remember choices such as your
                view settings.
              </li>
              <li>
                <strong>Analytics</strong> — help us measure aggregate site
                performance and usage so we can improve the product.
              </li>
            </ul>
          ),
        },
        {
          heading: "Managing cookies",
          body: (
            <p>
              Most browsers let you block or delete cookies through their
              settings. Blocking essential cookies may prevent you from signing
              in or using parts of the service.
            </p>
          ),
        },
        {
          heading: "Contact us",
          body: (
            <p>
              Questions about our use of cookies? Email us at{" "}
              <a
                href={`mailto:${contact.email}`}
                className="text-[var(--brand)] hover:underline"
              >
                {contact.email}
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
