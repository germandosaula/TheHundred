import { redirect } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { getDiscordId, getJson, getSessionToken, type CtaEntry, type MeData } from "../lib";
import { PageEntryLoader } from "../PageEntryLoader";

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();
  const [me, ctas] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<CtaEntry[]>("/ctas", sessionToken, discordId)
  ]);

  if (!me || !ctas) {
    redirect("/");
  }

  return (
    <PageEntryLoader message={`Bienvenido ${me.displayName}`}>
      <AppSidebar me={me}>{children}</AppSidebar>
    </PageEntryLoader>
  );
}
