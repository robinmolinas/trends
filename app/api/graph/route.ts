import { NextResponse } from "next/server";
import { loadGraphPayload } from "@/lib/graph-loader";

export async function GET() {
  try {
    const payload = await loadGraphPayload();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Graph API error", error);
    return NextResponse.json({ error: "Unable to load graph payload." }, { status: 500 });
  }
}
