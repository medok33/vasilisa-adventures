import { NextResponse } from "next/server";
import {
  createSiteSession,
  safeReturnTo,
  secureTextEqual,
  secureUsernameEqual,
  SITE_SESSION_COOKIE,
  SITE_SESSION_TTL_SECONDS,
} from "../../../site-auth";

function relativeRedirect(location: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      "cache-control": "no-store",
      location,
    },
  });
}

export async function POST(request: Request) {
  const expectedUsername = process.env.SITE_AUTH_USERNAME;
  const expectedPassword = process.env.SITE_AUTH_PASSWORD;
  const secret = process.env.SITE_AUTH_SECRET;
  if (!expectedUsername || !expectedPassword || !secret) return new NextResponse("Авторизация не настроена", { status: 503 });

  const form = await request.formData();
  const username = String(form.get("username") ?? "").slice(0, 100);
  const password = String(form.get("password") ?? "").slice(0, 200);
  const returnTo = safeReturnTo(String(form.get("returnTo") ?? "/"));
  const [usernameMatches, passwordMatches] = await Promise.all([
    secureUsernameEqual(username, expectedUsername),
    secureTextEqual(password, expectedPassword),
  ]);
  if (!usernameMatches || !passwordMatches) {
    const failureParams = new URLSearchParams({ error: "1", returnTo });
    return relativeRedirect(`/login?${failureParams.toString()}`);
  }

  const response = relativeRedirect(returnTo);
  response.cookies.set(SITE_SESSION_COOKIE, await createSiteSession(secret), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SITE_SESSION_TTL_SECONDS,
  });
  return response;
}
