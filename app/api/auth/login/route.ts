import { NextResponse } from "next/server";
import {
  createSiteSession,
  matchesSiteCredentials,
  safeReturnTo,
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
  const childUsername = process.env.CHILD_AUTH_USERNAME;
  const childPassword = process.env.CHILD_AUTH_PASSWORD;
  const secret = process.env.SITE_AUTH_SECRET;
  if (!expectedUsername || !expectedPassword || !childUsername || !childPassword || !secret) return new NextResponse("Авторизация не настроена", { status: 503 });

  const form = await request.formData();
  const username = String(form.get("username") ?? "").slice(0, 100);
  const password = String(form.get("password") ?? "").slice(0, 200);
  const returnTo = safeReturnTo(String(form.get("returnTo") ?? "/"));
  const credentialsMatch = await matchesSiteCredentials(username, password, [
    { username: expectedUsername, password: expectedPassword },
    { username: childUsername, password: childPassword },
  ]);
  if (!credentialsMatch) {
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
