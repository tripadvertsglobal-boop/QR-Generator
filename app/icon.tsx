import QRCode from "qrcode";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Browser-tab icon: a QR code encoding the site's own URL.
export default async function Icon() {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const png = await QRCode.toBuffer(url, {
    width: size.width,
    margin: 0,
    errorCorrectionLevel: "L",
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": contentType },
  });
}
