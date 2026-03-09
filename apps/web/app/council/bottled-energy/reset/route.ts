import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function POST() {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const discordId = (await cookies()).get("th_discord_id")?.value;

  const response = await fetch(`${apiBaseUrl}/council/bottled-energy/reset`, {
    method: "POST",
    headers: {
      ...(sessionToken ? { "x-session-token": sessionToken } : {}),
      ...(discordId ? { "x-discord-id": discordId } : {})
    }
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}
