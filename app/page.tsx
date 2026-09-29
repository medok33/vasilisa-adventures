import Adventure from "./Adventure";
import { cookies } from "next/headers";
import { readSiteSession, SITE_SESSION_COOKIE } from "./site-auth";

export default async function Home() {
  const secret = process.env.SITE_AUTH_SECRET;
  const cookieStore = await cookies();
  const session = secret ? await readSiteSession(cookieStore.get(SITE_SESSION_COOKIE)?.value, secret) : null;
  return <Adventure canViewAdultAnalytics={session?.role === "adult"} />;
}
