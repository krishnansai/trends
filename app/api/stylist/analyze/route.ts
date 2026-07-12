import { NextResponse } from "next/server";
import { analyzeImageWithOllama, isOllamaVisionEnabled } from "@/lib/ollama-vision";
import { createVisionProfile, type VisionProfile } from "@/lib/vision";

export const runtime = "nodejs";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function formJsonValue(formData: FormData, key: string) {
  const value = formValue(formData, key);

  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function"
  );
}

function getFallbackVisionProfile(formData: FormData): VisionProfile {
  return createVisionProfile({
    demographic: formValue(formData, "demographic"),
    detected_face_shape: formValue(formData, "detected_face_shape"),
    primary_color_undertone: formValue(formData, "primary_color_undertone"),
    recommended_color_palette: formJsonValue(formData, "recommended_color_palette"),
    suggested_fit_profile: formValue(formData, "suggested_fit_profile")
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const photo = formData.get("photo");
  const fallback = getFallbackVisionProfile(formData);

  if (!isUploadedFile(photo)) {
    return NextResponse.json(
      {
        enabled: isOllamaVisionEnabled(),
        error: "No photo file was provided.",
        model: null,
        source: "browser-fallback",
        visionData: fallback
      },
      { status: 400 }
    );
  }

  const result = await analyzeImageWithOllama(photo, fallback);

  return NextResponse.json({
    enabled: isOllamaVisionEnabled(),
    error: result.error,
    model: result.model,
    source: result.source,
    visionData: result.profile
  });
}
