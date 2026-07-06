import { ExternalLink, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Trend } from "@/lib/types";

export function TrendLookbook({
  trends,
  isUsingSampleData
}: {
  trends: Trend[];
  isUsingSampleData: boolean;
}) {
  return (
    <section className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Trend Forecasting</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Forward lookbook</h1>
        </div>
        <div className="flex items-center gap-3">
          {isUsingSampleData ? <Badge>Sample data</Badge> : <Badge>Original data</Badge>}
          <Badge>{trends.length} forecasts</Badge>
        </div>
      </div>

      {trends.length === 0 ? (
        <div className="mt-6 border border-border bg-muted/35 p-6">
          <p className="text-base font-semibold">No original trend data ingested yet.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add sourced trend rows locally with `npm run ingest:trends -- ./dataset/trends.csv` or
            configure Supabase and ingest there. Bundled sample forecasts are disabled by default.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {trends.map((trend) => (
          <article
            key={trend.id}
            className="grid overflow-hidden border border-border bg-background lg:grid-rows-[320px_auto]"
          >
            <div className="relative min-h-80 overflow-hidden bg-muted">
              <img
                src={trend.forecast_image_url}
                alt={trend.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-4 top-4 border border-background bg-foreground px-3 py-1 text-xs font-medium text-background">
                {trend.season}
              </div>
            </div>
            <div className="flex flex-col gap-5 p-5">
              <div>
                <p className="text-sm text-muted-foreground">{trend.forecast_year}</p>
                <h2 className="mt-1 text-2xl font-semibold leading-tight">{trend.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{trend.description}</p>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Gauge className="size-4" />
                    Confidence Meter
                  </span>
                  <span>{trend.confidence_score}%</span>
                </div>
                <Progress value={trend.confidence_score} />
              </div>

              {trend.source_url ? (
                <a
                  href={trend.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({
                    variant: "outline",
                    className: "mt-auto w-full"
                  })}
                >
                  View original source
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
