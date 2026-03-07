import { redirect } from "next/navigation";
import { CompsBuilder } from "../CompsBuilder";
import { getPrivateCompsEditorData } from "../../../lib";

interface NewCompPageProps {
  searchParams: Promise<{
    comp?: string;
  }>;
}

export default async function NewCompPage({ searchParams }: NewCompPageProps) {
  const params = await searchParams;
  const { me, comps, builds, canEditCompsAndCtas } = await getPrivateCompsEditorData();

  if (!me) {
    redirect("/");
  }

  const canEdit = canEditCompsAndCtas;
  const isViewingExistingComp = Boolean(params.comp);

  if (!canEdit && !isViewingExistingComp) {
    redirect("/app/comps");
  }

  const initialComps = params.comp
    ? comps.filter((comp) => comp.id === params.comp)
    : [];

  return (
    <CompsBuilder
      canEdit={canEdit}
      initialBuilds={builds}
      initialActiveCompId={params.comp}
      initialComps={initialComps}
    />
  );
}
