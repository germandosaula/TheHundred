import { redirect } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { getDiscordId, getJson, getSessionToken, type MeData } from "../lib";

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();
  const me = await getJson<MeData>("/me", sessionToken, discordId);

  if (!me) {
    redirect("/");
  }

  return <AppSidebar me={me}>{children}</AppSidebar>;
}
