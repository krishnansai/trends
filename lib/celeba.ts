import { createReadStream } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

export const CELEBA_ROOT = "/home/krishnansai/Documents/CelebFaces Attributes (CelebA) Dataset";
export const CELEBA_IMAGE_DIR = join(CELEBA_ROOT, "img_align_celeba", "img_align_celeba");
export const CELEBA_TOTAL_IMAGES = 202_599;

export type CelebARecord = {
  id: string;
  imageUrl: string;
  attributes: string[];
};

function parseCsvLine(line: string) {
  return line.split(",");
}

export async function hasCelebADataset() {
  try {
    await access(join(CELEBA_ROOT, "list_attr_celeba.csv"));
    await access(CELEBA_IMAGE_DIR);
    return true;
  } catch {
    return false;
  }
}

export async function getCelebASamples(limit = 24): Promise<CelebARecord[]> {
  const contents = await readFile(join(CELEBA_ROOT, "list_attr_celeba.csv"), "utf8");
  const lines = contents.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]).slice(1);

  return lines.slice(1, limit + 1).map((line) => {
    const [id, ...values] = parseCsvLine(line);
    const attributes = headers.filter((header, index) => values[index] === "1");

    return {
      id,
      attributes,
      imageUrl: `/api/celeba/image/${id}`
    };
  });
}

export function openCelebAImage(imageId: string) {
  if (!/^\d{6}\.jpg$/.test(imageId)) {
    return null;
  }

  return createReadStream(join(CELEBA_IMAGE_DIR, imageId));
}
