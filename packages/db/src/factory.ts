import { DomainError } from "@thehundred/domain";
import { createSeedRepository } from "./memory.ts";
import type { DatabaseRepository } from "./repository.ts";
import { createSupabaseRepository } from "./supabase.ts";

export interface RepositoryConfig {
  provider: "memory" | "supabase";
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
}

export function createRepository(config: RepositoryConfig): DatabaseRepository {
  if (config.provider === "memory") {
    return createSeedRepository();
  }

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new DomainError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  return createSupabaseRepository({
    url: config.supabaseUrl,
    serviceRoleKey: config.supabaseServiceRoleKey
  });
}
