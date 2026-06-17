import type { Metadata } from "next";
import { siteConfig } from "@/site.config";
import LegalPage from "../_components/LegalPage";

const { company, contact } = siteConfig;

export const metadata: Metadata = {
  title: `Privacy Policy — ${company.name}`,
  description: `How ${company.name} collects, uses, and protects your personal data.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="June 17, 2026"
      intro={`This Privacy Policy explains how ${company.name} ("we", "us") collects, uses, and shares information when you use our website, dashboard, and API.`}
      sections={[
        {
          heading: "Information we collect",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Account data</strong> — your email address and
                authentication details when you sign up.
              </li>
              <li>
                <strong>Content you create</strong> — QR codes, destination
                URLs, folders, tags, and related metadata.
              </li>
              <li>
                <strong>Scan analytics</strong> — when one of your QR codes is
                scanned we record timestamp, approximate location (derived from
                IP), referrer, and device/user-agent information.
              </li>
              <li>
                <strong>Usage and technical data</strong> — log data, API
                request metadata, and error reports used to operate and secure
                the service.
              </li>
            </ul>
          ),
        },
        {
          heading: "How we use information",
          body: (
            <p>
              We use the information we collect to provide and maintain the
              service, generate the scan analytics you ask us to track, secure
              and prevent abuse of the platform, communicate with you about your
              account, and comply with our legal obligations. We do not sell
              your personal data.
            </p>
          ),
        },
        {
          heading: "Sharing and processors",
          body: (
            <p>
              We share data with infrastructure providers who process it on our
              behalf — including our hosting, database, error-monitoring, and
              URL-safety partners — under contracts that require them to protect
              it. We may also disclose information where required by law.
            </p>
          ),
        },
        {
          heading: "Data retention",
          body: (
            <p>
              We retain account and content data for as long as your account is
              active. Scan analytics and audit logs are retained according to
              your plan and our retention schedule, after which they are deleted
              or anonymized.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              Depending on your location, you may have the right to access,
              correct, export, or delete your personal data. You can export or
              delete your account data from your dashboard, or contact us to
              exercise these rights.
            </p>
          ),
        },
        {
          heading: "Contact us",
          body: (
            <p>
              Questions about this policy? Email us at{" "}
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
