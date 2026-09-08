export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ error: "Analytics storage is available in the VDS build." }, { status: 501 });
}
