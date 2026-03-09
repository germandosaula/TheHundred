import type { DatabaseRepository } from "./repository.ts";
export interface RepositoryConfig {
    provider: "memory" | "supabase";
    supabaseUrl?: string;
    supabaseServiceRoleKey?: string;
}
export declare function createRepository(config: RepositoryConfig): DatabaseRepository;
