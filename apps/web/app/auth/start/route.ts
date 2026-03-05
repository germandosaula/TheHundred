import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const invite = url.searchParams.get("invite")?.trim();
  const cookieStore = await cookies();

  if (invite) {
    const inviteValidationResponse = await fetch(
      `${apiBaseUrl}/public/invites/validate?code=${encodeURIComponent(invite)}`,
      {
        method: "GET",
        cache: "no-store"
      }
    ).catch(() => null);

    const inviteValidation = inviteValidationResponse?.ok
      ? ((await inviteValidationResponse.json()) as { valid?: boolean })
      : null;

    if (inviteValidation?.valid) {
      cookieStore.set("th_invite_code", invite, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7
      });
    } else {
      cookieStore.set("th_invite_code", "", {
        path: "/",
        maxAge: 0
      });
    }
  }

  const response = await fetch(`${apiBaseUrl}/auth/discord/start`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const payload = (await response.json()) as { authorizationUrl?: string };
  if (!payload.authorizationUrl) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(payload.authorizationUrl);
}
