import { AIPersonalStylist } from "@/components/stylist/ai-personal-stylist";
import { getGarments, isUsingSampleData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StylistPage() {
  const garments = await getGarments();

  return (
    <AIPersonalStylist
      archiveLookCount={garments.length}
      isUsingSampleData={isUsingSampleData()}
    />
  );
}
