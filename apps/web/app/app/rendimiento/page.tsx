import { getPublicPerformanceData } from "../../lib";
import { PerformanceView } from "../../PerformanceView";

export default async function AppPerformancePage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const performance = await getPublicPerformanceData(month);

  return <PerformanceView performance={performance} />;
}
