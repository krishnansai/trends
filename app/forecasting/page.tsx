import { TrendLookbook } from "@/components/forecasting/trend-lookbook";
import { getTrends, isUsingSampleData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ForecastingPage() {
  const trends = await getTrends();

  return <TrendLookbook trends={trends} isUsingSampleData={isUsingSampleData()} />;
}
