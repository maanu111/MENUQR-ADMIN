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

/**
 * Two places a file can go, chosen by where the app is running.
 *
 * A normal server (Hostinger, a VPS, this laptop) has a disk, so files go in
 * public/uploads and are served straight from there. Serverless hosts give the
 * app no writable disk at all, so when a blob token is present we hand the file
 * to blob storage instead. Both return the same shape, so nothing that calls
 * this route knows or cares which one ran.
 */
async function store(file: File, folder: string, name: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${folder}/${name}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  /* A path, never an absolute URL — moving hosts is then one SQL update. */
  return `/uploads/${folder}/${name}`;
}

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

  try {
    const url = await store(file, folder, name);
    return NextResponse.json({ url }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Couldn't save that file." }, { status: 500 });
  }
}
