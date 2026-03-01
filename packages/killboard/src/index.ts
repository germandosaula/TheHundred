export interface KillboardEvent {
  id: string;
  occurredAt: string;
  participants: string[];
}

export interface KillboardClient {
  fetchRecentGuildEvents(guildId: string): Promise<KillboardEvent[]>;
}

export function createKillboardClient(): KillboardClient {
  return {
    async fetchRecentGuildEvents() {
      return [];
    }
  };
}

