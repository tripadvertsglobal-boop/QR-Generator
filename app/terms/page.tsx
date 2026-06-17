import type { Metadata } from "next";
import { siteConfig } from "@/site.config";
import LegalPage from "../_components/LegalPage";

const { company, contact } = siteConfig;

export const metadata: Metadata = {
  title: `Terms of Service — ${company.name}`,
  description: `The terms that govern your use of ${company.name}.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="June 17, 2026"
      intro={`These Terms of Service ("Terms") govern your access to and use of ${company.name}. By creating an account or using the service, you agree to these Terms.`}
      sections={[
        {
          heading: "Your account",
          body: (
            <p>
              You must provide accurate information when registering and are
              responsible for safeguarding your credentials and API keys. You
              are responsible for all activity that occurs under your account.
            </p>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <p>
              You agree to use the service in compliance with our{" "}
              <a
                href="/acceptable-use"
                className="text-[var(--brand)] hover:underline"
              >
                Acceptable Use Policy
              </a>
              . We may suspend or terminate accounts that point QR codes to
              malicious, illegal, or abusive destinations.
            </p>
          ),
        },
        {
          heading: "Plans and billing",
          body: (
            <p>
              Paid plans are billed in advance on a recurring basis. Fees are
              non-refundable except where required by law. We may change pricing
              with reasonable notice, and you can cancel at any time.
            </p>
          ),
        },
        {
          heading: "Your content",
          body: (
            <p>
              You retain ownership of the content you create. You grant us the
              limited rights needed to host, process, and display it in order to
              operate the service on your behalf.
            </p>
          ),
        },
        {
          heading: "Warranty and liability",
          body: (
            <p>
              The service is provided &ldquo;as is&rdquo; without warranties of
              any kind. To the maximum extent permitted by law, we are not
              liable for indirect, incidental, or consequential damages arising
              from your use of the service.
            </p>
          ),
        },
        {
          heading: "Termination",
          body: (
            <p>
              You may stop using the service at any time. We may suspend or
              terminate access if you breach these Terms. Provisions that by
              their nature should survive termination will continue to apply.
            </p>
          ),
        },
        {
          heading: "Contact us",
          body: (
            <p>
              Questions about these Terms? Email us at{" "}
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
