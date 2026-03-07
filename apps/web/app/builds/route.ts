import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

function createHeaders(sessionToken?: string, discordId?: string) {
  return {
    ...(sessionToken ? { "x-session-token": sessionToken } : {}),
    ...(discordId ? { "x-discord-id": discordId } : {})
  };
}

export async function GET() {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const discordId = (await cookies()).get("th_discord_id")?.value;

  const response = await fetch(`${apiBaseUrl}/builds`, {
    headers: createHeaders(sessionToken, discordId)
  });
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}

export async function POST(request: Request) {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const discordId = (await cookies()).get("th_discord_id")?.value;
  const payload = await request.text();

  const response = await fetch(`${apiBaseUrl}/builds`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...createHeaders(sessionToken, discordId)
    },
    body: payload
  });
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}

export async function DELETE(request: Request) {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const discordId = (await cookies()).get("th_discord_id")?.value;
  const url = new URL(request.url);
  const buildId = url.searchParams.get("buildId");

  if (!buildId) {
    return NextResponse.json({ error: "buildId is required" }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl}/builds/${buildId}`, {
    method: "DELETE",
    headers: createHeaders(sessionToken, discordId)
  });
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}
