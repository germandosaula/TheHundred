import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const discordId = (await cookies()).get("th_discord_id")?.value;
  const payload = (await request.json()) as {
    memberId?: string;
    startsAt?: string;
    endsAt?: string;
    reason?: string;
  };

  if (!payload.memberId || !payload.startsAt || !payload.endsAt) {
    return NextResponse.json(
      { error: "memberId, startsAt and endsAt are required" },
      { status: 400 }
    );
  }

  const response = await fetch(`${apiBaseUrl}/members/${payload.memberId}/activity-exclusion`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { "x-session-token": sessionToken } : {}),
      ...(discordId ? { "x-discord-id": discordId } : {})
    },
    body: JSON.stringify({
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      reason: payload.reason
    })
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
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId")?.trim();

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl}/members/${memberId}/activity-exclusion`, {
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
