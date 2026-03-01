import type { IncomingMessage, ServerResponse } from "node:http";

export interface ResponsePayload {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: string;
}

export function json(data: unknown, statusCode = 200): ResponsePayload {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(data)
  };
}

export function send(response: ServerResponse, payload: ResponsePayload): void {
  response.writeHead(payload.statusCode, payload.headers);
  response.end(payload.body);
}

export function redirect(
  location: string,
  options?: { cookies?: string[]; statusCode?: number }
): ResponsePayload {
  const headers: Record<string, string | string[]> = {
    location
  };

  if (options?.cookies?.length) {
    headers["set-cookie"] = options.cookies;
  }

  return {
    statusCode: options?.statusCode ?? 302,
    headers,
    body: ""
  };
}

export async function parseBody<T>(request: IncomingMessage): Promise<T | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}
