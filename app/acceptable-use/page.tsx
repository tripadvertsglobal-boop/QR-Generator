import type { Metadata } from "next";
import { siteConfig } from "@/site.config";
import LegalPage from "../_components/LegalPage";

const { company, contact } = siteConfig;

export const metadata: Metadata = {
  title: `Acceptable Use Policy — ${company.name}`,
  description: `The rules for what you can and cannot do with ${company.name}.`,
};

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      lastUpdated="June 17, 2026"
      intro={`This Acceptable Use Policy sets out the rules for using ${company.name}. It applies to everyone who uses the service, including via the API.`}
      sections={[
        {
          heading: "Prohibited content and destinations",
          body: (
            <p>
              You may not create QR codes that point to malware, phishing pages,
              illegal content, or material that infringes the rights of others.
              Destinations are checked against URL-safety services, and unsafe
              links are rejected.
            </p>
          ),
        },
        {
          heading: "Prohibited activities",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Distributing spam, scams, or deceptive redirects.</li>
              <li>
                Attempting to disrupt, overload, or gain unauthorized access to
                the service or its infrastructure.
              </li>
              <li>
                Circumventing rate limits, quotas, or other technical
                restrictions.
              </li>
              <li>
                Reselling or sharing API keys in violation of your plan.
              </li>
            </ul>
          ),
        },
        {
          heading: "Enforcement",
          body: (
            <p>
              We may disable QR codes, suspend, or terminate accounts that
              violate this policy, with or without notice depending on the
              severity. We may also report unlawful activity to the relevant
              authorities.
            </p>
          ),
        },
        {
          heading: "Reporting abuse",
          body: (
            <p>
              To report a QR code or account that violates this policy, email us
              at{" "}
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
