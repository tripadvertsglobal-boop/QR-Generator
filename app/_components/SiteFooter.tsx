import Link from "next/link";
import { siteConfig } from "@/site.config";

export default function SiteFooter() {
  const { company, contact, social, footer } = siteConfig;
  const socialLinks = Object.entries(social).filter(([, url]) => url);

  return (
    <footer className="mt-auto border-t border-black/10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <p className="text-base font-semibold">{company.name}</p>
          <p className="mt-2 max-w-xs text-sm text-black/60">{footer.note}</p>
        </div>

        <div className="text-sm">
          <p className="font-medium">Contact</p>
          <ul className="mt-2 space-y-1 text-black/60">
            <li>
              <a href={`mailto:${contact.email}`} className="hover:text-black">
                {contact.email}
              </a>
            </li>
            <li>{contact.phone}</li>
            <li>{contact.address}</li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-medium">Product</p>
          <ul className="mt-2 space-y-1 text-black/60">
            <li>
              <Link href="/pricing" className="hover:text-black">
                Pricing
              </Link>
            </li>
            <li>
              <Link href={siteConfig.links.logIn} className="hover:text-black">
                Log in
              </Link>
            </li>
            {socialLinks.length > 0 && (
              <li className="flex gap-3 pt-1 capitalize">
                {socialLinks.map(([name, url]) => (
                  <a key={name} href={url} className="hover:text-black">
                    {name}
                  </a>
                ))}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-black/10 px-6 py-6 text-center text-xs text-black/50">
        © {new Date().getFullYear()} {company.name}. All rights reserved.
      </div>
    </footer>
  );
}
