/**
 * Site configuration — edit everything here.
 *
 * This is the single place to change your company name, contact details,
 * brand colors, fonts, marketing copy, and pricing plans. The landing page
 * (`/`) and pricing page (`/pricing`) read from this file, so any change
 * here updates both pages.
 */

export const siteConfig = {
  /* ---------------------------------------------------------------- */
  /* Company / brand identity                                          */
  /* ---------------------------------------------------------------- */
  company: {
    name: "QR Studio",
    // Shown in the browser tab and used for SEO metadata.
    tagline: "Dynamic QR codes that you can edit, track, and trust.",
    // One or two sentences describing the product. Used in the hero section.
    description:
      "Create QR codes whose destination you can change anytime — no reprinting. Track every scan, organize at scale, and automate with a developer API.",
  },

  /* ---------------------------------------------------------------- */
  /* Contact details                                                   */
  /* ---------------------------------------------------------------- */
  contact: {
    email: "hello@qrstudio.com",
    phone: "+1 (555) 010-2030",
    address: "123 Market Street, San Francisco, CA",
  },

  /* Social links — leave a value empty ("") to hide that link. */
  social: {
    twitter: "https://twitter.com/",
    github: "https://github.com/",
    linkedin: "https://linkedin.com/",
  },

  /* ---------------------------------------------------------------- */
  /* Look & feel — colors and fonts                                    */
  /* ---------------------------------------------------------------- */
  theme: {
    // Primary brand color (buttons, accents). Use any valid CSS color.
    brand: "#4f46e5",
    // Text color that sits on top of the brand color (e.g. button labels).
    brandForeground: "#ffffff",
    // Hover shade for primary buttons.
    brandHover: "#4338ca",
    // Font family applied across the marketing pages. Any CSS font stack.
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },

  /* ---------------------------------------------------------------- */
  /* Calls to action / app links                                       */
  /* ---------------------------------------------------------------- */
  links: {
    signUp: "/signup",
    logIn: "/login",
    dashboard: "/dashboard",
  },

  /* ---------------------------------------------------------------- */
  /* Landing page content                                              */
  /* ---------------------------------------------------------------- */
  hero: {
    headline: "QR codes that work as hard as you do",
    subheadline:
      "Generate dynamic QR codes in seconds, edit where they point at any time, and see exactly who scanned them.",
    primaryCta: "Get started free",
    secondaryCta: "View pricing",
  },

  // Feature cards shown on the landing page.
  features: [
    {
      title: "Editable links",
      description:
        "Change a QR code's destination whenever you want — the printed code keeps working.",
    },
    {
      title: "Scan analytics",
      description:
        "See total scans, trends over time, and a country-by-country breakdown of your audience.",
    },
    {
      title: "Organized at scale",
      description:
        "Group codes into folders, add tags, and find anything fast with filters and search.",
    },
    {
      title: "Developer API",
      description:
        "Create and manage codes programmatically with API keys, rate limits, and webhooks.",
    },
    {
      title: "Bulk export",
      description:
        "Generate codes in batches and export print-ready SVGs whenever you need them.",
    },
    {
      title: "Private & secure",
      description:
        "Row-level security, audit logs, and GDPR data export keep your data yours.",
    },
  ],

  /* ---------------------------------------------------------------- */
  /* Pricing plans (shown on /pricing)                                 */
  /* ---------------------------------------------------------------- */
  pricing: {
    heading: "Simple, transparent pricing",
    subheading: "Start free. Upgrade when you grow. Cancel anytime.",
    plans: [
      {
        name: "Free",
        price: "$0",
        period: "/month",
        description: "Everything you need to get started.",
        features: [
          "Up to 10 dynamic QR codes",
          "Basic scan analytics",
          "1 folder",
          "Community support",
        ],
        cta: "Get started",
        href: "/signup",
        highlighted: false,
      },
      {
        name: "Pro",
        price: "$19",
        period: "/month",
        description: "For creators and small teams.",
        features: [
          "Unlimited QR codes",
          "Full analytics with geography",
          "Unlimited folders & tags",
          "API access & webhooks",
          "Bulk export",
          "Email support",
        ],
        cta: "Start Pro",
        href: "/signup",
        highlighted: true,
      },
      {
        name: "Business",
        price: "$49",
        period: "/month",
        description: "For organizations that need more.",
        features: [
          "Everything in Pro",
          "Higher API rate limits",
          "Audit logs & GDPR export",
          "Priority support",
          "Onboarding assistance",
        ],
        cta: "Contact sales",
        href: "/signup",
        highlighted: false,
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Footer                                                            */
  /* ---------------------------------------------------------------- */
  footer: {
    // Shown beside the copyright year.
    note: "Built for teams who care about where their codes lead.",
  },
} as const;

export type SiteConfig = typeof siteConfig;
