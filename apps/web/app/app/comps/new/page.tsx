import { redirect } from "next/navigation";
import { CompsBuilder } from "../CompsBuilder";
import { getPrivateCompsData, getPrivateDashboardData } from "../../../lib";

interface NewCompPageProps {
  searchParams: Promise<{
    comp?: string;
  }>;
}

export default async function NewCompPage({ searchParams }: NewCompPageProps) {
  const params = await searchParams;
  const { me, comps, assignablePlayers } = await getPrivateCompsData();

  if (!me) {
    redirect("/");
  }

  const canEdit = me.role === "OFFICER" || me.role === "ADMIN";
  const isViewingExistingComp = Boolean(params.comp);

  if (!canEdit && !isViewingExistingComp) {
    redirect("/app/comps");
  }

  const initialComps = params.comp
    ? comps.filter((comp) => comp.id === params.comp)
    : [];

  return (
    <CompsBuilder
      assignablePlayers={assignablePlayers}
      canEdit={canEdit}
      initialActiveCompId={params.comp}
      initialComps={initialComps}
    />
  );
}
