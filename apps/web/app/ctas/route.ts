import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const url = new URL(request.url);
  const ctaId = url.searchParams.get("ctaId");

  if (!ctaId) {
    return NextResponse.json({ error: "ctaId is required" }, { status: 400 });
  }

  const payload = await request.text();

  const response = await fetch(`${apiBaseUrl}/ctas/${ctaId}/slots`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { "x-session-token": sessionToken } : {})
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
