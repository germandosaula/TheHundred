import { redirect } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { getDiscordId, getJson, getSessionToken, type MeData } from "../lib";
import { PageEntryLoader } from "../PageEntryLoader";

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();
  const me = await getJson<MeData>("/me", sessionToken, discordId);

  if (!me) {
    redirect("/");
  }

  return (
    <PageEntryLoader message={`Bienvenido ${me.displayName}`}>
      <AppSidebar me={me}>{children}</AppSidebar>
    </PageEntryLoader>
  );
}
