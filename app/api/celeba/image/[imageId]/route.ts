import { NextResponse } from "next/server";
import { openCelebAImage } from "@/lib/celeba";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await params;
  const stream = openCelebAImage(imageId);

  if (!stream) {
    return NextResponse.json({ error: "Invalid image id" }, { status: 400 });
  }

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "image/jpeg"
    }
  });
}
