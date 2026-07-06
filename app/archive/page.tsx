import { HistoricalArchive } from "@/components/archive/historical-archive";
import { getGarments, isUsingSampleData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const garments = await getGarments();

  return <HistoricalArchive garments={garments} isUsingSampleData={isUsingSampleData()} />;
}
