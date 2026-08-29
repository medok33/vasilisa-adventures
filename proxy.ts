import { NextRequest, NextResponse } from "next/server";
import { SITE_SESSION_COOKIE, verifySiteSession } from "./app/site-auth";

const publicPaths = new Set(["/login", "/api/auth/login", "/api/auth/logout", "/api/health"]);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (publicPaths.has(path)) return NextResponse.next();

  const username = process.env.SITE_AUTH_USERNAME;
  const password = process.env.SITE_AUTH_PASSWORD;
  const secret = process.env.SITE_AUTH_SECRET;
  if (!username || !password || !secret) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Авторизация сайта не настроена" }, { status: 503 });
    return new NextResponse("Авторизация сайта не настроена", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const authenticated = await verifySiteSession(request.cookies.get(SITE_SESSION_COOKIE)?.value, secret);
  if (authenticated) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Требуется вход" }, { status: 401, headers: { "cache-control": "no-store" } });

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", `${path}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.svg|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
