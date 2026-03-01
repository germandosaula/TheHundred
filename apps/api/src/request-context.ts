import type { IncomingMessage } from "node:http";
import { DomainError, type User } from "@thehundred/domain";
import type { AuthServices } from "./auth.ts";

export interface RequestContext {
  currentUser: User | null;
}

export async function createRequestContext(
  request: IncomingMessage,
  auth: AuthServices
): Promise<RequestContext> {
  return {
    currentUser: await auth.resolveCurrentUser(request)
  };
}

export function requireAuthenticatedUser(currentUser: User | null): User {
  if (!currentUser) {
    throw new DomainError("Authentication required");
  }

  return currentUser;
}
