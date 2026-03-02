import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const apiBaseUrl = process.env.API_BASE_URL;
  const cookieDomain = deriveCookieDomain(apiBaseUrl);
  const secure = apiBaseUrl?.startsWith("https://") ?? false;

  response.cookies.set("th_session", "", {
    path: "/",
    domain: cookieDomain,
    httpOnly: true,
    secure,
    sameSite: "lax",
    expires: new Date(0)
  });
  response.cookies.set("th_discord_id", "", {
    path: "/",
    domain: cookieDomain,
    httpOnly: true,
    secure,
    sameSite: "lax",
    expires: new Date(0)
  });

  return response;
}

function deriveCookieDomain(baseUrl?: string): string | undefined {
  if (!baseUrl) {
    return undefined;
  }

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
