export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ error: "Learning storage is available in the VDS build." }, { status: 501 });
}

export async function POST() {
  return Response.json({ error: "Learning storage is available in the VDS build." }, { status: 501 });
}
