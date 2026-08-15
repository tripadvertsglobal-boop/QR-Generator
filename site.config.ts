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
    name: "QRStudio Builder",
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
     lib/env.ts. Leave a value empty ("") to omit it from the footer. */
  contact: {
    email: "hello@qrbuilderstudio.com",
    phone: "",
    address: "",
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
    brand: "#ec3013",
    // Text color that sits on top of the brand color (e.g. button labels).
    brandForeground: "#f3f2f2",
    // Hover shade for primary buttons.
    brandHover: "#dd2b0f",
    // Font family applied across the marketing pages. Any CSS font stack.
    fontFamily: 'var(--font-archivo), "Archivo", system-ui, sans-serif',
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

  /* Use cases shown on the landing page. These carry the search terms
     people actually type ("QR code for a restaurant menu"), so keep the
     wording concrete rather than abstract. */
  useCases: [
    {
      title: "Restaurant menus",
      description:
        "Print one code on the table and swap the menu it opens each season — or each day. No new table talkers, no stickers over old codes.",
    },
    {
      title: "Packaging & print",
      description:
        "Boxes and flyers ship with a code you can't recall. Point it at a fresh landing page after the print run and the old stock keeps working.",
    },
    {
      title: "Events & conferences",
      description:
        "Badges, posters, and slide decks share one code. Schedule it to open the agenda during the event and the recording afterwards.",
    },
    {
      title: "Real estate signage",
      description:
        "A yard sign outlives a listing. Re-point the code to the next property and see which boards actually get scanned.",
    },
    {
      title: "Retail & product labels",
      description:
        "Give every SKU its own code with bulk creation, then compare scans by product to see where attention really goes.",
    },
    {
      title: "Marketing campaigns",
      description:
        "Split scans between two landing pages, tag codes by channel, and pull the numbers into your own reports through the API.",
    },
  ],

  /* Landing-page FAQ. Also emitted as FAQPage structured data, which Google
     only honours when the questions are visible on the page — so every entry
     here must stay rendered, and every answer must stay true to what
     lib/plan.ts actually enforces. */
  faq: [
    {
      question: "What is a dynamic QR code?",
      answer:
        "A dynamic QR code encodes a short tracking link instead of your destination. Because the printed pattern points at that link, you can change where it leads at any time and the code on the page never has to change. A static QR code bakes the destination in permanently — if the URL changes, the code is dead.",
    },
    {
      question: "Can I change where a QR code points after it's printed?",
      answer:
        "Yes. Edit the destination in the dashboard or through the API and the next scan goes to the new URL, usually within a second. This works on every plan, including the free one.",
    },
    {
      question: "How do you track QR codes?",
      answer:
        "You track a QR code by making it dynamic. Instead of encoding your destination, the printed pattern encodes a short link on our domain, so every scan passes through a server you control before the phone lands on your page. That hop is what gets counted — a static QR code contacts nothing you own, so there is nothing to measure. Create the code, print it, and scan tracking starts on the first scan with no tag, pixel, or app to install.",
    },
    {
      question: "Can you track how many times a QR code is scanned?",
      answer:
        "Yes. Every dynamic code carries a running total plus a day-by-day count you can chart over any window up to a year. The total is deduplicated and filtered: crawler and link-preview fetches are discarded, and rapid repeat hits from the same source are collapsed, so the number reflects people rather than requests. Scan counts are included on every plan, including the free one.",
    },
    {
      question: "Can I see who scans my QR codes?",
      answer:
        "You get total scans, a per-day trend, and location down to city level. You do not get identities — a scan is an anonymous web request, so there is no name, email, or phone number attached. Scans are recorded without storing raw IP addresses, and crawler or link-preview fetches are filtered out so your numbers reflect real people. The aggregated country breakdown is a paid-plan feature.",
    },
    {
      question: "Is there a free plan?",
      answer:
        "Yes. The free plan includes 3 dynamic QR codes, one folder, basic scan analytics, an audit log, and GDPR data export. No credit card is required to start.",
    },
    {
      question: "Do the QR codes expire?",
      answer:
        "No. A code keeps resolving until you pause, archive, or delete it. You can also schedule an active window in advance if you want one to start or stop on a set date.",
    },
    {
      question: "Can I password-protect or A/B test a code?",
      answer:
        "Both. A code can sit behind a password gate, and you can split scans across two or more destinations by weight to test which landing page performs better.",
    },
    {
      question: "Is there an API for creating QR codes programmatically?",
      answer:
        "Yes. Paid plans include scoped API keys, bulk creation, webhooks, and print-ready SVG or PNG output. The full REST reference is on the API docs page.",
    },
    {
      question: "What happens if I delete a QR code?",
      answer:
        "Deleting is permanent: the slug stops resolving and its scan history is gone. To retire a code without losing its numbers, archive it instead — archived codes stop resolving but keep their history and their slug.",
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
       `plan` must match a tier in lib/plan.ts — the paid ones are what the
       /pricing CTA sends to Stripe Checkout.
       `available: false` renders the plan without a working CTA. It is now a
       kill switch for closing a tier, not a "billing hasn't shipped" flag. */
    plans: [
      {
        plan: "free",
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
        plan: "pro",
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
        available: true,
      },
      {
        plan: "business",
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
        cta: "Start Business",
        href: "/signup",
        highlighted: false,
        available: true,
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
