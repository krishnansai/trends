import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CELEBA_ROOT, CELEBA_TOTAL_IMAGES, getCelebASamples, hasCelebADataset } from "@/lib/celeba";

export const dynamic = "force-dynamic";

function formatAttribute(value: string) {
  return value.replace(/_/g, " ");
}

export default async function CelebAPage() {
  const isAvailable = await hasCelebADataset();
  const samples = isAvailable ? await getCelebASamples(32) : [];

  return (
    <section className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Local Dataset Preview</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            CelebFaces Attributes Dataset
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge>{isAvailable ? "Dataset found" : "Missing dataset"}</Badge>
          <Badge>{CELEBA_TOTAL_IMAGES.toLocaleString("en-IN")} images</Badge>
          <Badge>{samples.length} preview rows</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="border border-border bg-background p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Dataset status</h2>
            <ImageIcon className="size-5" />
          </div>
          <dl className="space-y-4 text-sm">
            <div className="border border-border bg-muted/35 p-3">
              <dt className="text-muted-foreground">Location</dt>
              <dd className="mt-1 break-words font-medium">{CELEBA_ROOT}</dd>
            </div>
            <div className="border border-border bg-muted/35 p-3">
              <dt className="text-muted-foreground">Metadata</dt>
              <dd className="mt-1 font-medium">Attributes, bbox, landmarks, partitions</dd>
            </div>
            <div className="border border-border bg-muted/35 p-3">
              <dt className="text-muted-foreground">UI mode</dt>
              <dd className="mt-1 font-medium">Local preview only</dd>
            </div>
          </dl>
        </aside>

        {isAvailable ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {samples.map((sample) => (
              <article key={sample.id} className="overflow-hidden border border-border bg-background">
                <img
                  src={sample.imageUrl}
                  alt={`CelebA sample ${sample.id}`}
                  className="aspect-[4/5] w-full bg-muted object-cover"
                  loading="lazy"
                />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold">{sample.id}</h2>
                    <Badge>{sample.attributes.length} tags</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sample.attributes.slice(0, 5).map((attribute) => (
                      <Badge key={attribute} className="bg-muted">
                        {formatAttribute(attribute)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-border bg-muted/35 p-6">
            <p className="text-base font-semibold">CelebA dataset was not found.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Expected files under `{CELEBA_ROOT}`.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
