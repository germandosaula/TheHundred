import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("th_session")?.value;
  const discordId = cookieStore.get("th_discord_id")?.value;

  if (!sessionToken && !discordId) {
    return NextResponse.json({ authenticated: false, hasPrivateAccess: false }, { status: 200 });
  }

  const [meResponse, accessResponse] = await Promise.all([
    fetch(`${apiBaseUrl}/me`, {
      headers: {
        ...(sessionToken ? { "x-session-token": sessionToken } : {}),
        ...(discordId ? { "x-discord-id": discordId } : {})
      },
      cache: "no-store"
    }),
    fetch(`${apiBaseUrl}/private/access`, {
      headers: {
        ...(sessionToken ? { "x-session-token": sessionToken } : {}),
        ...(discordId ? { "x-discord-id": discordId } : {})
      },
      cache: "no-store"
    })
  ]);

  if (!meResponse.ok) {
    return NextResponse.json({ authenticated: false, hasPrivateAccess: false }, { status: 200 });
  }

  return NextResponse.json({
    authenticated: true,
    hasPrivateAccess: accessResponse.ok
  });
}
