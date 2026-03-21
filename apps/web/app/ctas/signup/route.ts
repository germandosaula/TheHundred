import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const discordId = (await cookies()).get("th_discord_id")?.value;
  const url = new URL(request.url);
  const ctaId = url.searchParams.get("ctaId");

  if (!ctaId) {
    return NextResponse.json({ error: "ctaId is required" }, { status: 400 });
  }

  const payload = await request.text();

  const response = await fetch(`${apiBaseUrl}/ctas/${ctaId}/signup`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { "x-session-token": sessionToken } : {}),
      ...(discordId ? { "x-discord-id": discordId } : {})
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
  const ctaId = url.searchParams.get("ctaId");

  if (!ctaId) {
    return NextResponse.json({ error: "ctaId is required" }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl}/ctas/${ctaId}/signup`, {
    method: "DELETE",
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
