import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const discordId = (await cookies()).get("th_discord_id")?.value;
  const payload = (await request.json()) as {
    memberId?: string;
    albionName?: string;
  };

  if (!payload.memberId || !payload.albionName?.trim()) {
    return NextResponse.json({ error: "memberId and albionName are required" }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl}/members/${payload.memberId}/albion-name`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { "x-session-token": sessionToken } : {}),
      ...(discordId ? { "x-discord-id": discordId } : {})
    },
    body: JSON.stringify({ albionName: payload.albionName.trim() })
  });

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}
