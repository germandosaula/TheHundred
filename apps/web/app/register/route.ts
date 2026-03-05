import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("th_session")?.value;
  const inviteCode = cookieStore.get("th_invite_code")?.value;
  const payload = (await request.json()) as {
    displayName?: string;
    discordId?: string;
    albionName?: string;
    avatarUrl?: string;
    timezone?: string;
    mainRole?: string;
    zvzExperience?: string;
    notes?: string;
  };

  const response = await fetch(`${apiBaseUrl}/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { "x-session-token": sessionToken } : {})
    },
    body: JSON.stringify({
      ...payload,
      inviteCode
    })
  });

  const body = await response.text();

  const nextResponse = new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });

  if (response.ok && inviteCode) {
    nextResponse.cookies.set("th_invite_code", "", {
      path: "/",
      maxAge: 0
    });
  }

  return nextResponse;
}
