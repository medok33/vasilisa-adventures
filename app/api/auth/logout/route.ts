import { NextResponse } from "next/server";
import { SITE_SESSION_COOKIE } from "../../../site-auth";

export async function POST() {
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      "cache-control": "no-store",
      location: "/login",
    },
  });
  response.cookies.set(SITE_SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
