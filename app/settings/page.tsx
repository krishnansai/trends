import { CheckCircle2, CircleDashed, Database, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDataSourceLabel } from "@/lib/data";

export const dynamic = "force-dynamic";

const checks = [
  {
    label: "Supabase URL",
    value: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  },
  {
    label: "Supabase anon key",
    value: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  }
];

export default function SettingsPage() {
  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Data operations</h1>
        </div>
        <Badge>{getDataSourceLabel()}</Badge>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="border border-border bg-background p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Supabase status</h2>
            <Database className="size-5" />
          </div>
          <div className="space-y-3">
            {checks.map((check) => (
              <div
                key={check.label}
                className="flex items-center justify-between border border-border p-3"
              >
                <span className="text-sm">{check.label}</span>
                {check.value ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <CircleDashed className="size-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="border border-border bg-background p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Ingestion command</h2>
            <UploadCloud className="size-5" />
          </div>
          <div className="border border-border bg-muted p-4 font-mono text-sm leading-6">
            npm run ingest:kaggle -- ./dataset/fashion-catalog.csv
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            The default target stores normalized rows in `data/garments.json`. Use
            `--target supabase` when PostgreSQL is configured.
          </p>
        </section>
      </div>
    </section>
  );
}
