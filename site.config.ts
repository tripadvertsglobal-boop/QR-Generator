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
  /* These are the contact details of record in the Terms and Privacy Policy.
     Any value still prefixed with TODO_ fails the production build — see
     lib/env.ts. Replace all three before going live. */
  contact: {
    email: "TODO_SET_CONTACT_EMAIL",
    phone: "TODO_SET_CONTACT_PHONE",
    address: "TODO_SET_CONTACT_ADDRESS",
  },

  /* Social links — leave a value empty ("") to hide that link. */
  social: {
    twitter: "",
    github: "",
    linkedin: "",
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
    /* Every feature listed here is either enforced in lib/plan.ts or available
       to all accounts. Do not add a bullet that nothing enforces.
       `available: false` renders the plan without a working CTA — self-serve
       upgrades open when billing ships. */
    plans: [
      {
        name: "Free",
        price: "$0",
        period: "/month",
        description: "Everything you need to get started.",
        features: [
          "Up to 3 dynamic QR codes",
          "Create, edit, and delete anytime",
          "Basic scan analytics",
          "1 folder",
          "Audit log & GDPR data export",
          "Community support",
        ],
        cta: "Get started",
        href: "/signup",
        highlighted: false,
        available: true,
      },
      {
        name: "Pro",
        price: "$19",
        period: "/month",
        description: "For creators and small teams.",
        features: [
          "Unlimited QR codes",
          "Archive & restore codes",
          "Full analytics with geography",
          "Unlimited folders & tags",
          "API access & webhooks",
          "Bulk create & CSV export",
          "Email support",
        ],
        cta: "Start Pro",
        href: "/signup",
        highlighted: true,
        available: false,
      },
      {
        name: "Business",
        price: "$49",
        period: "/month",
        description: "For organizations that need more.",
        features: [
          "Everything in Pro",
          "10× higher API rate limits",
          "Priority support",
          "Onboarding assistance",
        ],
        cta: "Contact sales",
        href: "/signup",
        highlighted: false,
        available: false,
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
