import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("th_session", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(0)
  });
  response.cookies.set("th_discord_id", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(0)
  });

  return response;
}
