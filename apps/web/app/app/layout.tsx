import { redirect } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { getDiscordId, getJson, getSessionToken, type MeData } from "../lib";
import { PageEntryLoader } from "../PageEntryLoader";

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();
  const [me, privateAccessProbe, managementProbe, councilProbe] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<{ ok: true }>("/private/access", sessionToken, discordId),
    getJson<unknown[]>("/comps/assignable-players", sessionToken, discordId),
    getJson<unknown[]>("/council/members", sessionToken, discordId)
  ]);

  if (!me || !privateAccessProbe) {
    redirect("/");
  }

  return (
    <PageEntryLoader message={`Bienvenido ${me.displayName}`} storageKey="entry-loader-app">
      <AppSidebar canManageCouncil={Boolean(managementProbe)} isCouncil={Boolean(councilProbe)} me={me}>
        {children}
      </AppSidebar>
    </PageEntryLoader>
  );
}
