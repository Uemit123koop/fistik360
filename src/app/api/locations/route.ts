import { NextResponse } from "next/server";
import { getLocationOptions } from "@/lib/turkiye-locations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  const parentId = searchParams.get("parentId") ?? undefined;

  if (level !== "provinces" && level !== "districts" && level !== "settlements") {
    return NextResponse.json({ error: "Konum seviyesi geçersiz." }, { status: 400 });
  }

  try {
    const items = await getLocationOptions(level, parentId);
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Konumlar alınamadı." },
      { status: 503 },
    );
  }
}

