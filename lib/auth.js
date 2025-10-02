// lib/auth.js
import { cookies as nextCookies, headers as nextHeaders } from "next/headers";

function readCookie(rawCookie, name) {
  if (!rawCookie) return null;
  const m = rawCookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function getCurrentUserId(req) {
  if (req?.headers) {
    const dev = req.headers.get("x-user-id");
    if (dev) return dev;

    const rawCookie = req.headers.get("cookie") || "";
    const uid = readCookie(rawCookie, "tj_uid");
    if (uid) return uid;
  }

  try {
    const h = await nextHeaders();
    const dev2 = h.get("x-user-id");
    if (dev2) return dev2;

    const c = await nextCookies();
    const uid2 = c.get("tj_uid")?.value;
    if (uid2) return uid2;
  } catch {
  }

  return "default";
}