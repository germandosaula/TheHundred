import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: Request) {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const discordId = (await cookies()).get("th_discord_id")?.value;
  const url = new URL(request.url);
  const query = new URLSearchParams();
  const memberId = url.searchParams.get("memberId");
  const searchQuery = url.searchParams.get("query");

  if (memberId) {
    query.set("memberId", memberId);
  }
  if (searchQuery) {
    query.set("query", searchQuery);
  }

  const response = await fetch(
    `${apiBaseUrl}/performance/member-weapons${query.toString() ? `?${query.toString()}` : ""}`,
    {
      cache: "no-store",
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
