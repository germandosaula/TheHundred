import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("th_session")?.value;
  const discordId = cookieStore.get("th_discord_id")?.value;
  const name = request.nextUrl.searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const response = await fetch(
    `${apiBaseUrl}/albion/players/search?name=${encodeURIComponent(name)}`,
    {
      method: "GET",
      headers: {
        ...(sessionToken ? { "x-session-token": sessionToken } : {}),
        ...(discordId ? { "x-discord-id": discordId } : {})
      }
    }
  );

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}
