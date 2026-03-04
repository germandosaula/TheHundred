import { NextResponse } from "next/server";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  const query = month ? `?month=${encodeURIComponent(month)}` : "";

  const response = await fetch(`${apiBaseUrl}/public/performance${query}`, {
    cache: "no-store"
  });

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}
