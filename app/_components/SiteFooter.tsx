import Link from "next/link";
import { siteConfig } from "@/site.config";

export default function SiteFooter() {
  const { company, contact, social, footer } = siteConfig;
  const socialLinks = Object.entries(social).filter(([, url]) => url);

  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Acceptable Use", href: "/acceptable-use" },
  ];

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-base font-semibold">{company.name}</p>
          <p className="mt-2 max-w-xs text-sm text-muted">{footer.note}</p>
        </div>

        <div className="text-sm">
          <p className="font-medium">Contact</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>
              <a href={`mailto:${contact.email}`} className="hover:text-foreground">
                {contact.email}
              </a>
            </li>
            {contact.phone && <li>{contact.phone}</li>}
            {contact.address && <li>{contact.address}</li>}
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-medium">Product</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/qr-code-tracking" className="hover:text-foreground">
                QR code tracking
              </Link>
            </li>
            <li>
              <Link href="/guides" className="hover:text-foreground">
                Guides
              </Link>
            </li>
            <li>
              <Link href={siteConfig.links.logIn} className="hover:text-foreground">
                Log in
              </Link>
            </li>
            {socialLinks.length > 0 && (
              <li className="flex gap-3 pt-1 capitalize">
                {socialLinks.map(([name, url]) => (
                  <a key={name} href={url} className="hover:text-foreground">
                    {name}
                  </a>
                ))}
              </li>
            )}
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-medium">Legal</p>
          <ul className="mt-2 space-y-1 text-muted">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-6 py-6 text-center text-xs text-muted-2">
        © {new Date().getFullYear()} {company.name}. All rights reserved.
      </div>
    </footer>
  );
}
