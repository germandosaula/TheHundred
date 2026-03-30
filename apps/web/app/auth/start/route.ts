import { NextResponse } from "next/server";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const invite = url.searchParams.get("invite")?.trim();
  const cookieDomain = deriveCookieDomain(apiBaseUrl);
  const secure = apiBaseUrl.startsWith("https://");

  let inviteCookieHeader: string | null = null;
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
      inviteCookieHeader = buildCookie("th_invite_code", invite, {
        maxAge: 60 * 60 * 24 * 7,
        secure
      });
    } else {
      inviteCookieHeader = buildExpiredCookie("th_invite_code", secure);
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

  const redirectResponse = NextResponse.redirect(payload.authorizationUrl);

  if (inviteCookieHeader) {
    redirectResponse.headers.append("Set-Cookie", inviteCookieHeader);
  }

  for (const cookieName of ["th_session", "th_discord_id", "th_session_v"]) {
    redirectResponse.headers.append("Set-Cookie", buildExpiredCookie(cookieName, secure));
    if (cookieDomain) {
      redirectResponse.headers.append(
        "Set-Cookie",
        buildExpiredCookie(cookieName, secure, cookieDomain)
      );
    }
  }

  return redirectResponse;
}

function buildCookie(
  name: string,
  value: string,
  options: { maxAge: number; secure: boolean; domain?: string }
): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${options.maxAge}`
  ];
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function buildExpiredCookie(name: string, secure: boolean, domain?: string): string {
  return buildCookie(name, "", { maxAge: 0, secure, domain });
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
