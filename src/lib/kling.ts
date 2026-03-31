import { SignJWT } from "jose";

/** Generate a short-lived Kling API JWT token. */
export async function getKlingToken(): Promise<string> {
  const accessKey = process.env.KLING_ACCESS_KEY!;
  const secretKey = process.env.KLING_SECRET_KEY!;

  if (!accessKey || !secretKey) {
    throw new Error("KLING_ACCESS_KEY and KLING_SECRET_KEY must be set in .env.local");
  }

  const now = Math.floor(Date.now() / 1000);
  const secret = new TextEncoder().encode(secretKey);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(accessKey)
    .setIssuedAt(now - 5)
    .setExpirationTime(now + 1800)
    .sign(secret);

  return token;
}

export const KLING_BASE = "https://api.klingai.com";
