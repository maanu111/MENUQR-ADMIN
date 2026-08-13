import "server-only";
import QRCode from "qrcode";

/**
 * Where a scanned code lands. Each restaurant gets its own subdomain, so the
 * host itself carries the tenant — a code can only ever open its own menu.
 *
 * NEXT_PUBLIC_GUEST_HOST is the bare apex ("tablet.app"). In development,
 * NEXT_PUBLIC_GUEST_URL points at the local guest app and subdomains are
 * built as <slug>.localhost, which browsers resolve without any hosts file.
 */
export function guestUrl(slug: string, token: string) {
  const host = process.env.NEXT_PUBLIC_GUEST_HOST;
  if (host) return `https://${slug}.${host}/t/${token}`;

  const base = process.env.NEXT_PUBLIC_GUEST_URL ?? "https://tablet.app";
  try {
    const url = new URL(base);
    if (url.hostname === "localhost") {
      return `${url.protocol}//${slug}.localhost:${url.port || "3003"}/t/${token}`;
    }
    return `${url.origin}/r/${slug}/t/${token}`;
  } catch {
    return `${base.replace(/\/$/, "")}/r/${slug}/t/${token}`;
  }
}

/**
 * One code for the whole restaurant. It opens the menu and asks which table
 * the guest is at — useful on a poster, a counter card, or when a restaurant
 * would rather print one sticker than forty.
 */
export function restaurantUrl(slug: string) {
  const host = process.env.NEXT_PUBLIC_GUEST_HOST;
  if (host) return `https://${slug}.${host}/`;

  const base = process.env.NEXT_PUBLIC_GUEST_URL ?? "https://tablet.app";
  try {
    const url = new URL(base);
    if (url.hostname === "localhost") {
      return `${url.protocol}//${slug}.localhost:${url.port || "3003"}/`;
    }
    return `${url.origin}/r/${slug}`;
  } catch {
    return `${base.replace(/\/$/, "")}/r/${slug}`;
  }
}

/**
 * Inline SVG, colours stripped so the code inherits whatever surface it sits
 * on. Error correction M survives a smudged sticker without bloating the grid.
 */
export async function qrSvg(value: string) {
  const svg = await QRCode.toString(value, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
  });
  return svg
    .replace(/<\?xml[^>]*\?>/, "")
    .replace(/\swidth="\d+"/, "")
    .replace(/\sheight="\d+"/, "")
    .replace(/#000000/gi, "currentColor")
    .replace(/fill="#ffffff"/gi, 'fill="none"')
    .trim();
}
