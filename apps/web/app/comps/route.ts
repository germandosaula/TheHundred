import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const payload = await request.text();

  const response = await fetch(`${apiBaseUrl}/comps`, {
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

export async function DELETE(request: Request) {
  const sessionToken = (await cookies()).get("th_session")?.value;
  const url = new URL(request.url);
  const compId = url.searchParams.get("compId");

  if (!compId) {
    return NextResponse.json({ error: "compId is required" }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl}/comps/${compId}`, {
    method: "DELETE",
    headers: {
      ...(sessionToken ? { "x-session-token": sessionToken } : {})
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
