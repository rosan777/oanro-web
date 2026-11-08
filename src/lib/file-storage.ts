// Storage for Workspace files. The database keeps only an index row (client_project_file); the bytes
// live here. Drivers:
//   OANRO_FILE_STORAGE=local  a git-ignored folder (.local-storage/) for localhost testing only. It refuses
//                             to run on Vercel, where the file system is temporary.
//   (unset)                   no storage: uploads are switched off and the UI says so.
// A production driver (object storage) needs credentials from the owner and is not configured here.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_PROJECT_BYTES = 100 * 1024 * 1024;

/** Allowed file kinds, checked by the file's first bytes (not by its name). */
const kinds: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  {
    mime: "application/pdf",
    ext: "pdf",
    test: b => b.subarray(0, 5).toString("latin1") === "%PDF-",
  },
  {
    mime: "image/png",
    ext: "png",
    test: b =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { mime: "image/jpeg", ext: "jpg", test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/webp",
    ext: "webp",
    test: b =>
      b.subarray(0, 4).toString("latin1") === "RIFF" &&
      b.subarray(8, 12).toString("latin1") === "WEBP",
  },
  {
    mime: "application/zip",
    ext: "zip",
    test: b => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  },
];

/** The detected kind of a file, or null when it is not one of the allowed kinds. */
export function detectKind(bytes: Buffer) {
  return kinds.find(k => k.test(bytes)) ?? null;
}

function localRoot() {
  return path.join(process.cwd(), ".local-storage", "workspace");
}

/** Whether uploads can be stored in this environment. */
export function storageAvailable() {
  return process.env.OANRO_FILE_STORAGE === "local" && !process.env.VERCEL;
}

const keyOk = (key: string) => /^[a-z0-9-]{1,64}\/[a-f0-9-]{36}\.[a-z]{3,4}$/.test(key);

/** Stores bytes and returns the storage key ("<projectId>/<uuid>.<ext>"). */
export async function putFile(projectId: string, bytes: Buffer, ext: string) {
  if (!storageAvailable()) throw new Error("STORAGE_UNAVAILABLE");
  const key = `${projectId}/${randomUUID()}.${ext}`;
  if (!keyOk(key)) throw new Error("STORAGE_UNAVAILABLE");
  const file = path.join(localRoot(), key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes, { flag: "wx" });
  return key;
}

export async function getFile(key: string) {
  if (!storageAvailable() || !keyOk(key)) throw new Error("NOT_FOUND");
  return readFile(path.join(localRoot(), key));
}

export async function removeFile(key: string) {
  if (!storageAvailable() || !keyOk(key)) return;
  await rm(path.join(localRoot(), key), { force: true });
}
