import { BrandCollaborations } from "@/components/collaborations/brand-collaborations";
import { getTrends, isUsingSampleData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CollaborationsPage({
  searchParams
}: {
  searchParams?: Promise<{ trend?: string }>;
}) {
  const params = await searchParams;
  const trends = await getTrends();

  return (
    <BrandCollaborations
      trends={trends}
      defaultTrendId={params?.trend}
      isUsingSampleData={isUsingSampleData()}
    />
  );
}
