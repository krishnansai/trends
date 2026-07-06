#!/usr/bin/env python3
"""Upload local fashion images to Supabase Storage and insert garment metadata."""

from __future__ import annotations

import argparse
import csv
import mimetypes
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from uuid import uuid4

from dotenv import load_dotenv
from supabase import Client, create_client
from tqdm import tqdm

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
VALID_CATEGORIES = {
    "tops",
    "bottoms",
    "outerwear",
    "dresses",
    "skirts",
    "blouses",
    "footwear",
    "accessories",
}
VALID_DEMOGRAPHICS = {"menswear", "womenswear", "unisex"}


@dataclass(frozen=True)
class ImageMetadata:
    year: int
    category: str
    demographic: str
    style_tags: list[str]
    color_palette: list[str]
    age_group: str
    description: str
    source_url: str


def parse_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.replace("|", ",").split(",") if item.strip()]


def load_metadata_csv(path: Path | None) -> dict[str, ImageMetadata]:
    if not path:
        return {}

    if not path.exists():
        raise FileNotFoundError(f"Metadata CSV not found: {path}")

    rows: dict[str, ImageMetadata] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            filename = (row.get("filename") or "").strip()
            if not filename:
                continue

            rows[filename] = ImageMetadata(
                year=int(row.get("year") or 2026),
                category=(row.get("category") or "tops").strip().lower(),
                demographic=(row.get("demographic") or "unisex").strip().lower(),
                style_tags=parse_list(row.get("style_tags")),
                color_palette=parse_list(row.get("color_palette")),
                age_group=(row.get("age_group") or "unknown").strip(),
                description=(row.get("description") or "").strip(),
                source_url=(row.get("source_url") or "").strip(),
            )

    return rows


def iter_images(folder: Path) -> Iterable[Path]:
    for path in sorted(folder.rglob("*")):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            yield path


def get_supabase_client() -> Client:
    load_dotenv()

    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running ingestion.")

    return create_client(supabase_url, service_role_key)


def upload_image(client: Client, bucket: str, image_path: Path) -> str:
    content_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    object_path = f"garments/{uuid4()}{image_path.suffix.lower()}"

    with image_path.open("rb") as handle:
        client.storage.from_(bucket).upload(
            path=object_path,
            file=handle,
            file_options={"content-type": content_type, "upsert": "false"},
        )

    public_url = client.storage.from_(bucket).get_public_url(object_path)
    return public_url


def metadata_for_file(
    image_path: Path,
    metadata_by_filename: dict[str, ImageMetadata],
    default_year: int,
    default_category: str,
) -> ImageMetadata:
    metadata = metadata_by_filename.get(image_path.name)
    if metadata:
        category = metadata.category
        if category not in VALID_CATEGORIES:
            raise ValueError(f"{image_path.name}: invalid category '{category}'")
        if metadata.demographic not in VALID_DEMOGRAPHICS:
            raise ValueError(f"{image_path.name}: invalid demographic '{metadata.demographic}'")
        return metadata

    if default_category not in VALID_CATEGORIES:
        raise ValueError(f"Invalid default category '{default_category}'")

    return ImageMetadata(
        year=default_year,
        category=default_category,
        demographic="unisex",
        style_tags=[],
        color_palette=[],
        age_group="unknown",
        description=image_path.stem.replace("_", " ").replace("-", " "),
        source_url="",
    )


def insert_garment(client: Client, image_url: str, metadata: ImageMetadata) -> None:
    row = {
        "image_url": image_url,
        "year": metadata.year,
        "category": metadata.category,
        "demographic": metadata.demographic,
        "style_tags": metadata.style_tags,
        "color_palette": metadata.color_palette,
        "age_group": metadata.age_group,
        "description": metadata.description,
        "source_url": metadata.source_url,
    }
    client.table("garments").insert(row).execute()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image_folder", type=Path, help="Folder containing fashion images")
    parser.add_argument("--metadata", type=Path, help="CSV with filename, year, category, tags, palette")
    parser.add_argument("--bucket", default=os.getenv("SUPABASE_STORAGE_BUCKET", "fashion-garments"))
    parser.add_argument("--default-year", type=int, default=2026)
    parser.add_argument("--default-category", default="tops")
    args = parser.parse_args()

    if not args.image_folder.exists():
        print(f"Image folder not found: {args.image_folder}", file=sys.stderr)
        return 1

    client = get_supabase_client()
    metadata_by_filename = load_metadata_csv(args.metadata)
    image_paths = list(iter_images(args.image_folder))

    if not image_paths:
        print(f"No images found in {args.image_folder}", file=sys.stderr)
        return 1

    failures: list[tuple[Path, str]] = []

    for image_path in tqdm(image_paths, desc="Ingesting fashion images"):
        try:
            metadata = metadata_for_file(
                image_path,
                metadata_by_filename,
                args.default_year,
                args.default_category.lower(),
            )
            public_url = upload_image(client, args.bucket, image_path)
            insert_garment(client, public_url, metadata)
        except Exception as exc:  # noqa: BLE001 - continue batch and summarize failures.
            failures.append((image_path, str(exc)))

    if failures:
        print("\nCompleted with failures:", file=sys.stderr)
        for path, reason in failures:
            print(f"- {path}: {reason}", file=sys.stderr)
        return 2

    print(f"\nInserted {len(image_paths)} garments.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
