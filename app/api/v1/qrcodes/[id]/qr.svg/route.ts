import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createUserClient } from "@/lib/supabase/server";

// GET /api/v1/qrcodes/[id]/qr.svg            -> scannable SVG of the tracking URL
// GET /api/v1/qrcodes/[id]/qr.svg?format=png -> PNG (256px)
// The QR encodes the tracking URL (/r/<slug>), never the destination, so the
// printed image stays valid when the destination changes.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: code } = await supabase
    .from("qr_codes")
    .select("short_slug")
    .eq("id", id)
    .maybeSingle();
  if (!code) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const trackingUrl = `${process.env.NEXT_PUBLIC_REDIRECT_DOMAIN}/r/${code.short_slug}`;
  const format = new URL(request.url).searchParams.get("format");
  const filename = `qr-${code.short_slug}`;

  if (format === "png") {
    const png = await QRCode.toBuffer(trackingUrl, { type: "png", width: 256, margin: 2 });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}.png"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const svg = await QRCode.toString(trackingUrl, { type: "svg", margin: 2 });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `inline; filename="${filename}.svg"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
