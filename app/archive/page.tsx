import { HistoricalArchive } from "@/components/archive/historical-archive";
import { getGarments, getTrends, isUsingSampleData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const [garments, trends] = await Promise.all([getGarments(), getTrends()]);

  return (
    <HistoricalArchive
      garments={garments}
      isUsingSampleData={isUsingSampleData()}
      trends={trends}
    />
  );
}
