/**
 * Long-form guides served at /guides/<slug>.
 *
 * Deliberately plain data rather than MDX: the content is prose with headings
 * and lists, which `sections` covers, and this keeps the Worker bundle free of
 * a markdown pipeline. Add an entry here and it appears in the listing, the
 * sitemap, and the internal links automatically.
 *
 * `updated` is the date shown to readers and sent as dateModified in Article
 * structured data — bump it when you materially change a guide, not for typos.
 */

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "steps"; items: string[] };

export type Guide = {
  slug: string;
  title: string; // <h1> and <title> base
  description: string; // meta description and listing blurb
  published: string; // ISO date
  updated: string; // ISO date
  readingMinutes: number;
  body: GuideBlock[];
};

export const guides: Guide[] = [
  {
    slug: "dynamic-vs-static-qr-codes",
    title: "Dynamic vs static QR codes: which one do you actually need?",
    description:
      "Static QR codes bake the destination in forever. Dynamic codes point at a link you control. Here's how they differ in practice, and when the cheaper option costs more.",
    published: "2026-07-29",
    updated: "2026-07-29",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "Every QR code is a picture of some text. The only real question is what that text says: your destination URL, or a short link that redirects to it. That single choice decides whether the code you print is editable for the rest of its life or frozen the moment it leaves the printer.",
      },
      { type: "h2", text: "What a static QR code is" },
      {
        type: "p",
        text: "A static code encodes your destination directly. Scan it and the phone reads https://example.com/summer-menu straight out of the pattern — nothing sits in between. That has genuine advantages: there is no service to depend on, no redirect hop, and nothing to pay for. If the URL never changes, a static code is the honest answer.",
      },
      {
        type: "p",
        text: "The catch is that the URL is the pattern. Change the destination and every printed copy is dead. There is no way to fix a static code after the fact, because the fix would be a different code.",
      },
      { type: "h2", text: "What a dynamic QR code is" },
      {
        type: "p",
        text: "A dynamic code encodes a short tracking link — something like qrbuilderstudio.com/r/a1B2c3 — that you own and control. The scan hits that link, the server looks up where it currently points, and the phone lands on your destination. Because the printed pattern only ever refers to the short link, you can repoint it as often as you like.",
      },
      {
        type: "p",
        text: "The redirect hop also gives you a place to count. That is where scan analytics come from: a static code cannot be measured at all, because nothing you control is ever contacted.",
      },
      { type: "h2", text: "The practical differences" },
      {
        type: "ul",
        items: [
          "Editable destination: dynamic only. A static code's target is permanent.",
          "Scan analytics: dynamic only. There is no way to count scans of a static code.",
          "Pattern density: dynamic codes encode a short link, so the pattern is simpler and scans more reliably at small sizes or on rough surfaces.",
          "Dependency: a static code works forever with no provider. A dynamic code depends on the redirect service staying up.",
          "Cost: static codes are free to generate anywhere. Dynamic codes need an account, though a small number is usually free.",
          "Scheduling, password gates, and A/B splits: dynamic only — all three need a server in the path.",
        ],
      },
      { type: "h2", text: "The density point is underrated" },
      {
        type: "p",
        text: "A long URL with campaign parameters can push a code to a high version with a dense grid of tiny modules. Printed on a coffee cup or a crumpled flyer, that scans badly. A short redirect link keeps the pattern coarse, which means bigger modules, more error-correction headroom, and a code that still works when it is scuffed, curved, or read from an angle.",
      },
      { type: "h2", text: "When static is the right call" },
      {
        type: "ul",
        items: [
          "A permanent link that will never move — a homepage, a wifi network, a phone number, a plain-text vCard.",
          "You genuinely do not want a third party in the path, for privacy or reliability reasons.",
          "The code is single-use and disposable, like a code on a screen for one meeting.",
        ],
      },
      { type: "h2", text: "When dynamic pays for itself" },
      {
        type: "p",
        text: "Anything with a print run and a shelf life. Menus, packaging, signage, badges, business cards, direct mail. The rule of thumb: if reprinting the material costs more than an account does, the code should be dynamic — you are buying the option to be wrong about the destination.",
      },
      {
        type: "p",
        text: "The same applies if you need to know whether the code worked at all. Without a redirect in the path there is nothing to report on, and a campaign you cannot measure is one you cannot improve.",
      },
      { type: "h2", text: "Can you convert a static code to a dynamic one?" },
      {
        type: "p",
        text: "Not the printed one. The pattern encodes the destination, so converting means generating a new code and reprinting. What you can do, if you control the destination URL, is turn that URL into a redirect of your own — then the old static code inherits some of the flexibility. If the URL points at a domain you own, this is often the cheapest rescue for material already in the wild.",
      },
    ],
  },
  {
    slug: "qr-code-for-restaurant-menu",
    title: "How to make a QR code for a restaurant menu that you can update daily",
    description:
      "A step-by-step guide to putting your menu behind a QR code you can change without reprinting table talkers — including sizing, placement, and the mistakes that cost restaurants scans.",
    published: "2026-07-29",
    updated: "2026-07-29",
    readingMinutes: 7,
    body: [
      {
        type: "p",
        text: "Menu QR codes went from novelty to furniture in about two years. Most of them are done badly: a static code pointing at a PDF that was current last spring, printed too small, laminated to a table where nobody can angle a phone at it. Here is how to do it so the code stays useful for years.",
      },
      { type: "h2", text: "Use a dynamic code, not a static one" },
      {
        type: "p",
        text: "Menus change. Prices change, specials change, whole sections disappear when a supplier falls through. If the code encodes your menu URL directly, every one of those changes means new table talkers. A dynamic code encodes a short link instead, so you repoint it and the tables stay exactly as they are.",
      },
      { type: "h2", text: "Step by step" },
      {
        type: "steps",
        items: [
          "Put your menu somewhere with a stable web address — a page on your own site is best, a hosted PDF is acceptable.",
          "Create a dynamic QR code pointing at that address and give it a name you will recognise later, like \"Dining room tables\".",
          "Download the SVG rather than the PNG. SVG is vector, so your printer can scale it to any size without softening the edges.",
          "Print a test at the exact final size, on the actual material, and scan it from a seated position with an older phone before you order hundreds.",
          "When the menu changes, edit the destination. The printed codes pick it up on the next scan.",
        ],
      },
      { type: "h2", text: "Make the menu itself work on a phone" },
      {
        type: "p",
        text: "The most common failure is not the code — it is what the code opens. A PDF designed for A4 arrives on a phone as a wall of unreadable text that has to be pinched and dragged. Diners give up. A plain HTML page that reflows to the screen beats a beautiful PDF every time. If you must use a PDF, set it in a single column at large type.",
      },
      { type: "h2", text: "Size and placement" },
      {
        type: "ul",
        items: [
          "Print at least 2 x 2 cm (about 0.8 inches). On a table tent where people scan from a metre away, go to 3 cm.",
          "Keep a quiet margin of clear space around the pattern equal to about four modules — codes crowded by artwork fail to scan.",
          "Maintain strong contrast: dark pattern on a light background. Inverted codes and low-contrast brand colours are the second most common cause of failed scans.",
          "Avoid the middle of a glossy laminated surface where overhead lights reflect straight back into the camera.",
          "Add a short line of text — \"Scan for our menu\" — so people know what they are pointing at.",
        ],
      },
      { type: "h2", text: "Use separate codes for separate places" },
      {
        type: "p",
        text: "Make one code for the dining room, one for the bar, one for the window, one for takeaway bags. They can all point at the same menu today. The reason to split them is measurement: once scans are coming in by code, you can see that the window code outperforms the table tents four to one, which tells you where to put the next print run.",
      },
      { type: "h2", text: "Scheduling lunch and dinner" },
      {
        type: "p",
        text: "If your lunch and dinner menus differ, you have two options. Point one code at a single page with both menus on it, or use scheduling to switch the destination automatically at a set time each day. The first is simpler and usually better; the second is worth it when the menus are long enough that combining them makes the page unwieldy.",
      },
      { type: "h2", text: "Always keep a paper fallback" },
      {
        type: "p",
        text: "Some diners cannot or will not scan a code — an old phone, a flat battery, poor eyesight, no data. Several jurisdictions also require a non-digital menu on request. Keep printed copies behind the bar. A QR menu should be the convenient path, not the only one.",
      },
    ],
  },
  {
    slug: "tracking-qr-code-scans",
    title: "How to track QR code scans (and what the numbers actually mean)",
    description:
      "How QR code scan tracking actually works, what a code can and cannot tell you about the people scanning it, how to structure codes so the data is worth reading, and why your scan count is lower than your raw hit count.",
    published: "2026-07-29",
    updated: "2026-08-15",
    readingMinutes: 8,
    body: [
      {
        type: "p",
        text: "A QR code is not measurable by itself. The pattern is just text, and a phone reading text does not report back to anyone. Everything you can learn about scans comes from putting a link you control in the middle — which is exactly what a dynamic QR code does.",
      },
      { type: "h2", text: "How do you track QR codes?" },
      {
        type: "p",
        text: "You track a QR code by changing what it encodes. Instead of the pattern carrying your destination URL, it carries a short link on a domain you control. The scan hits that link first, the server records it and looks up where the code currently points, and the phone is forwarded on — usually inside a second, and invisibly to the person scanning. That redirect hop is the entire tracking mechanism. There is no pixel, no tag on your landing page, and no app for the person holding the phone.",
      },
      {
        type: "p",
        text: "This is also why tracking and editability arrive together. The same indirection that lets you count a scan is what lets you repoint the code afterwards, so any tool offering one is offering the other.",
      },
      { type: "h2", text: "Can you track how many times a QR code is scanned?" },
      {
        type: "p",
        text: "Yes, provided the code is dynamic. You get a running total per code and a day-by-day count you can chart over whatever window you care about. The total is the number most people ask for and the least useful one they get: it tells you the code worked, but not when, not where, and not whether it is still working. The per-day series answers all three, and it is where a poster that stopped earning scans in week two becomes obvious.",
      },
      {
        type: "p",
        text: "A static code cannot be counted at all. Nothing you own is ever contacted, so there is no event to record — and no provider can retrofit tracking onto a pattern that is already printed.",
      },
      { type: "h2", text: "What you can know" },
      {
        type: "ul",
        items: [
          "How many times the code was scanned, and when — the trend over days and weeks is usually more useful than the total.",
          "Roughly where from: country, region, and often city, derived from the network the request arrived on.",
          "Which of your codes performed best, if you gave each placement its own code.",
          "Which destination won, if you split scans between two landing pages.",
        ],
      },
      { type: "h2", text: "What you cannot know" },
      {
        type: "p",
        text: "Not who scanned it. A scan is an anonymous web request; there is no identity attached unless the person later signs in or fills something out on your page. You cannot get a name, a phone number, or an email from a scan, and any service claiming otherwise is either inferring it from something else or overselling.",
      },
      {
        type: "p",
        text: "Location is also coarser than it looks. It comes from network routing, so a mobile scan can resolve to the city where the carrier's gateway sits rather than the street the person is standing on. Treat city-level data as a strong hint, not a fact, and be sceptical of any tool that shows you a precise pin.",
      },
      { type: "h2", text: "Why your scan count looks low" },
      {
        type: "p",
        text: "A well-behaved analytics pipeline throws requests away, and it should. When someone pastes your tracking link into a chat app, that app fetches it to build a preview — sometimes several times. Uptime monitors, search crawlers, and security scanners all hit it too. None of those are people holding a phone.",
      },
      {
        type: "p",
        text: "Filtering those out means your reported number is lower than the raw hit count and much closer to the truth. Rapid repeat requests from one source are also usually collapsed, so a person who scans twice while waiting is not counted as two customers. If a provider's numbers look suspiciously high, ask what they filter.",
      },
      { type: "h2", text: "Structure your codes so the data says something" },
      {
        type: "p",
        text: "One code across every surface gives you one number, and one number answers no questions. The fix is boring and effective: a separate code per placement, named for where it went.",
      },
      {
        type: "steps",
        items: [
          "Create one code per physical placement — per poster site, per print run, per packaging SKU.",
          "Name each one for the place, not the campaign: \"Bar window, Oct print\" beats \"Autumn 3\".",
          "Tag them by channel so you can group print against packaging against events later.",
          "Add UTM parameters to the destination as well, so the visit shows up correctly in your web analytics too.",
          "Compare scans per placement after a fortnight and put the next print budget where the scans are.",
        ],
      },
      { type: "h2", text: "Can you track a QR code that is already printed?" },
      {
        type: "p",
        text: "Only if it was dynamic when you generated it. If the pattern on the page encodes your destination directly, adding tracking means generating a different pattern and reprinting — there is no software fix, because the code is the URL.",
      },
      {
        type: "p",
        text: "There is one rescue worth knowing. If the printed destination sits on a domain you control, turn that URL into a redirect of your own. The old static codes then pass through a hop you own, and you can count them and repoint them from that point on. It will not work for a code pointing at someone else's domain, which is the usual reason a print run is unrecoverable.",
      },
      { type: "h2", text: "Connect scans to what happened next" },
      {
        type: "p",
        text: "Scan counts tell you the code worked. They say nothing about whether the visit was worth anything. Because the destination is a normal URL, add campaign parameters and let your existing web analytics take over from there — that is how you find out that the code with half the scans drove twice the orders.",
      },
      { type: "h2", text: "Privacy is not optional" },
      {
        type: "p",
        text: "Scan data is behavioural data about people, even when it is not identifiable. Keep raw IP addresses out of storage, tell visitors what you collect in your privacy policy, and only retain what you will actually look at. Reasonable providers hash or discard IPs by default; if yours stores them in the clear and shows them to you, that is a liability you have taken on, not a feature.",
      },
    ],
  },
  {
    slug: "qr-code-best-practices",
    title: "QR code best practices: 12 rules for codes that always scan",
    description:
      "Sizing, contrast, quiet zones, error correction, and the design choices that quietly break QR codes. A practical checklist to run before any print job.",
    published: "2026-07-29",
    updated: "2026-07-29",
    readingMinutes: 7,
    body: [
      {
        type: "p",
        text: "Most QR code failures are not exotic. They are a code printed too small, or squeezed by artwork, or set in a brand colour with no contrast, or stretched to fit a layout. Run through this list before anything goes to print and almost all of it stops happening.",
      },
      { type: "h2", text: "Size and spacing" },
      {
        type: "ul",
        items: [
          "Minimum 2 x 2 cm (0.8 in) for something held in the hand. Scale up with distance — roughly one tenth of the scanning distance is a reliable rule, so a code read from 3 m wants to be about 30 cm.",
          "Leave a quiet zone of clear space about four modules wide on all sides. This is the single most common design mistake: text or a border pressed against the pattern stops the scanner finding the code at all.",
          "Never stretch or skew. Scale proportionally only — a distorted grid is unreadable no matter how good the camera.",
        ],
      },
      { type: "h2", text: "Colour and contrast" },
      {
        type: "ul",
        items: [
          "Dark pattern on a light background. Aim for the same contrast you would demand of body text.",
          "Do not invert (light pattern on dark) unless you have tested it on several phones. Many scanners cope, some do not.",
          "Avoid gradients and photographic backgrounds behind the pattern.",
          "If you must use a brand colour, use it for the pattern and keep the background white — not the other way round.",
        ],
      },
      { type: "h2", text: "Keep the encoded text short" },
      {
        type: "p",
        text: "The more characters you encode, the denser the grid and the smaller each module at a given print size. A long URL with five campaign parameters can double the module count against a short redirect link. Encode a short link and put the parameters on the destination instead — the pattern stays coarse and forgiving.",
      },
      { type: "h2", text: "Logos and error correction" },
      {
        type: "p",
        text: "QR codes carry redundant data, which is why a code with a logo punched through the middle still works. That headroom is finite. Keep any overlay under roughly 15 percent of the area, keep it central and away from the three corner squares, and test it — the corners are the position markers and covering one kills the code outright.",
      },
      { type: "h2", text: "Print and material" },
      {
        type: "ul",
        items: [
          "Use vector output (SVG or PDF) for print so edges stay crisp at any size. Reserve PNG for screens.",
          "Watch for ink bleed on absorbent stock like uncoated card or fabric — bleed merges adjacent modules, so print larger than the minimum.",
          "Avoid the reflective sweet spot of glossy laminate and the fold line of a leaflet.",
          "On curved surfaces like bottles and cups, keep the code small and near the flattest area available.",
        ],
      },
      { type: "h2", text: "Tell people why they should scan" },
      {
        type: "p",
        text: "A bare code is a question mark. A short label — \"Scan for the menu\", \"Scan to see the spec sheet\" — measurably lifts scans, because scanning is a small act of trust and people want to know what they are getting. Add the destination domain in text nearby if there is room.",
      },
      { type: "h2", text: "Test like a sceptic" },
      {
        type: "steps",
        items: [
          "Print at final size on the final material — not a laser proof on office paper.",
          "Scan with both an iPhone and an Android device, using the built-in camera rather than a dedicated app.",
          "Try it in the lighting the code will actually live in, including dim restaurant light.",
          "Scan from the realistic distance and at an angle, not straight on from 20 cm.",
          "Have someone who has not seen it try, without instructions.",
        ],
      },
      { type: "h2", text: "Make it fixable" },
      {
        type: "p",
        text: "The last rule covers the other eleven failing anyway. Use a dynamic code so that when the destination turns out to be wrong — and on a long enough run it will — you repoint the link instead of pulping the print run. Every other rule on this list is about the code being read. This one is about being able to change your mind.",
      },
    ],
  },
];

export const guideBySlug = (slug: string): Guide | undefined =>
  guides.find((g) => g.slug === slug);
