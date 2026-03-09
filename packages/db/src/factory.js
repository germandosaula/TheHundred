import { DomainError } from "@thehundred/domain";
import { createSeedRepository } from "./memory.ts";
import { createSupabaseRepository } from "./supabase.ts";
export function createRepository(config) {
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
//# sourceMappingURL=factory.js.map