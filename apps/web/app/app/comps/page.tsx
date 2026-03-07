import { redirect } from "next/navigation";
import { CompsOverview } from "./CompsOverview";
import { getPrivateCompsOverviewData } from "../../lib";

export default async function CompsPage() {
  const { me, comps, canEditCompsAndCtas } = await getPrivateCompsOverviewData();

  if (!me) {
    redirect("/");
  }

  const canEdit = canEditCompsAndCtas;

  return <CompsOverview canEdit={canEdit} comps={comps} />;
}
