import { NextResponse } from "next/server";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const sessionToken = requestUrl.searchParams.get("session_token")?.trim();
  const discordId = requestUrl.searchParams.get("discord_id")?.trim();
  const cookieDomain = deriveCookieDomain(apiBaseUrl);
  const secure = apiBaseUrl.startsWith("https://");

  const targetUrl = new URL("/auth/discord/callback", request.url);
  for (const [key, value] of requestUrl.searchParams.entries()) {
    targetUrl.searchParams.set(key, value);
  }

  const response = NextResponse.redirect(targetUrl);

  for (const cookieName of ["th_session", "th_discord_id", "th_session_v"]) {
    response.cookies.set(cookieName, "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
      expires: new Date(0)
    });
    if (cookieDomain) {
      response.cookies.set(cookieName, "", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure,
        domain: cookieDomain,
        expires: new Date(0)
      });
    }
  }

  if (sessionToken) {
    response.cookies.set("th_session", sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 12
    });
  }

  if (discordId) {
    response.cookies.set("th_discord_id", discordId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 30
    });
  }

  if (sessionToken?.includes(".")) {
    const sessionVersion = sessionToken.split(".")[0]?.trim();
    if (sessionVersion) {
      response.cookies.set("th_session_v", sessionVersion, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure,
        maxAge: 60 * 60 * 24 * 30
      });
    }
  }

  return response;
}

function deriveCookieDomain(baseUrl: string): string | undefined {
  try {
    const { hostname } = new URL(baseUrl);
    if (hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
      return undefined;
    }
    const segments = hostname.split(".").filter(Boolean);
    if (segments.length < 2) {
      return undefined;
    }
    return `.${segments.slice(-2).join(".")}`;
  } catch {
    return undefined;
  }
}
