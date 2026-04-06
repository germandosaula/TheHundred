import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("th_session")?.value;
  if (!sessionToken) {
    return NextResponse.next();
  }

  const secure = request.nextUrl.protocol === "https:";
  const response = NextResponse.next();

  response.cookies.set("th_session", sessionToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
  });

  const discordId = request.cookies.get("th_discord_id")?.value;
  if (discordId) {
    response.cookies.set("th_discord_id", discordId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
    });
  }

  const sessionVersion = request.cookies.get("th_session_v")?.value;
  if (sessionVersion) {
    response.cookies.set("th_session_v", sessionVersion, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
