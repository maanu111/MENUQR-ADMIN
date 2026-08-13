import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth/session";

const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/* Where each kind of image is allowed to land. Anything else is rejected, so
   a caller can never write outside public/uploads. */
const FOLDERS = new Set(["dishes", "logos", "payment", "proofs", "banners"]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Sign in first." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const folder = String(form?.get("folder") ?? "dishes");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file received." }, { status: 400 });
  }
  if (!FOLDERS.has(folder)) {
    return NextResponse.json({ message: "Unknown folder." }, { status: 400 });
  }
  if (!EXTENSION[file.type]) {
    return NextResponse.json(
      { message: "Use a JPG, PNG, WebP or GIF." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { message: "That image is over 5 MB — compress it first." },
      { status: 413 },
    );
  }

  const name = `${randomUUID()}.${EXTENSION[file.type]}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, name),
      Buffer.from(await file.arrayBuffer()),
    );
  } catch {
    return NextResponse.json({ message: "Couldn't save that file." }, { status: 500 });
  }

  /* A path, never an absolute URL — moving hosts is then one SQL update. */
  return NextResponse.json({ url: `/uploads/${folder}/${name}` }, { status: 201 });
}
