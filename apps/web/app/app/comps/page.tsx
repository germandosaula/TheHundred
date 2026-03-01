import { redirect } from "next/navigation";
import { CompsOverview } from "./CompsOverview";
import { getPrivateCompsData, getPrivateDashboardData } from "../../lib";

export default async function CompsPage() {
  const { me, comps } = await getPrivateCompsData();

  if (!me) {
    redirect("/");
  }

  const canEdit = me.role === "OFFICER" || me.role === "ADMIN";

  return <CompsOverview canEdit={canEdit} comps={comps} />;
}
