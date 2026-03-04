import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DomainError,
  buildRanking,
  countOpenSlots,
  generateAttendancePointsEntries,
  type Attendance,
  type CTA,
  type CTAStatus,
  type GuildConfig,
  type GuildMember,
  type MemberStatus,
  type PointsEntry,
  type User,
  type UserRole
} from "@thehundred/domain";
import type {
  BattleMemberAttendanceRecord,
  BattlePerformanceBombRecord,
  BattlePerformanceSnapshotRecord,
  CtaSignupRecord,
  CompRecord,
  CompPartyRecord,
  CompSlotRecord,
  CreateCtaInput,
  DatabaseRepository,
  RecruitmentApplicationRecord,
  RecruitmentApplicationStatus,
  RegisterMemberInput,
  SaveCompInput,
  SaveRecruitmentApplicationInput
} from "./repository.ts";

interface SupabaseRepositoryOptions {
  url: string;
  serviceRoleKey: string;
}

type UserRow = {
  id: string;
  discord_id: string;
  display_name: string;
  albion_name: string | null;
  role: UserRole;
  avatar_url: string | null;
};

type GuildMemberRow = {
  id: string;
  user_id: string;
  status: MemberStatus;
  joined_at: string;
  bomb_group_name: string | null;
  discord_role_status: MemberStatus | null;
  discord_role_synced_at: string | null;
};

type CtaRow = {
  id: string;
  title: string;
  datetime_utc: string;
  status: CTAStatus;
  created_by: string;
  comp_id: string | null;
  signup_channel_id: string | null;
  signup_message_id: string | null;
};

type AttendanceRow = {
  id: string;
  cta_id: string;
  member_id: string;
  decision: Attendance["decision"];
  state: Attendance["state"];
};

type PointsEntryRow = {
  id: string;
  member_id: string;
  cta_id: string | null;
  reason: string;
  points: number;
  created_at: string;
  reversed_at: string | null;
};

type GuildConfigRow = {
  attendance_points: number;
  absence_penalty: number;
  member_cap: number;
};

type CompRow = {
  id: string;
  name: string;
  created_by: string;
  updated_at: string;
};

type CompSlotRow = {
  id: string;
  comp_id: string;
  party_key: string;
  party_name: string;
  party_position: number;
  position: number;
  label: string;
  player_user_id: string | null;
  player_name: string | null;
  role: string;
  weapon_id: string;
  weapon_name: string;
  notes: string | null;
};

type RecruitmentApplicationRow = {
  id: string;
  user_id: string;
  display_name: string;
  timezone: string;
  main_role: string;
  zvz_experience: string;
  notes: string | null;
  status: RecruitmentApplicationStatus;
  ticket_channel_id: string | null;
  created_at: string;
  updated_at: string;
};

type CtaSignupRow = {
  id: string;
  cta_id: string;
  member_id: string;
  role: string;
  slot_key: string;
  slot_label: string;
  weapon_name: string;
  player_name: string;
  reacted_at: string;
};

type BattlePerformanceSnapshotRow = {
  battle_id: string;
  start_time: string;
  guild_name: string;
  guild_players: number;
  guild_kills: number;
  guild_deaths: number;
  main_kills: number;
  main_deaths: number;
  processed_at: string;
};

type BattlePerformanceBombRow = {
  battle_id: string;
  bomb_group_name: string;
  players: number;
  kills: number;
  deaths: number;
};

type BattleMemberAttendanceRow = {
  battle_id: string;
  member_id: string;
};

export class SupabaseDatabaseRepository implements DatabaseRepository {
  private readonly client: SupabaseClient;

  constructor(options: SupabaseRepositoryOptions) {
    this.client = createClient(options.url, options.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  async getConfig(): Promise<GuildConfig> {
    const { data, error } = await this.client
      .from("guild_config")
      .select("attendance_points, absence_penalty, member_cap")
      .single<GuildConfigRow>();
    if (error || !data) {
      throw createSupabaseDomainError("Failed to load guild config from Supabase", error);
    }

    return mapGuildConfig(data);
  }

  async getUsers(): Promise<User[]> {
    const { data, error } = await this.client
      .from("users")
      .select("id, discord_id, display_name, albion_name, role, avatar_url")
      .returns<UserRow[]>();
    if (error) {
      throw createSupabaseDomainError("Failed to load users from Supabase", error);
    }

    return (data ?? []).map(mapUser);
  }

  async getUserById(userId: string): Promise<User | null> {
    const { data, error } = await this.client
      .from("users")
      .select("id, discord_id, display_name, albion_name, role, avatar_url")
      .eq("id", userId)
      .maybeSingle<UserRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to load user by id from Supabase", error);
    }

    return data ? mapUser(data) : null;
  }

  async getUserByDiscordId(discordId: string): Promise<User | null> {
    const { data, error } = await this.client
      .from("users")
      .select("id, discord_id, display_name, albion_name, role, avatar_url")
      .eq("discord_id", discordId)
      .maybeSingle<UserRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to load user by Discord id from Supabase", error);
    }

    return data ? mapUser(data) : null;
  }

  async createUser(input: RegisterMemberInput & { role?: UserRole }): Promise<User> {
    const { data, error } = await this.client
      .from("users")
      .insert({
        discord_id: input.discordId,
        display_name: input.displayName,
        albion_name: input.albionName,
        role: input.role ?? "PLAYER",
        avatar_url: input.avatarUrl ?? null
      })
      .select("id, discord_id, display_name, albion_name, role, avatar_url")
      .single<UserRow>();
    if (error || !data) {
      throw createSupabaseDomainError("Failed to create user in Supabase", error);
    }

    return mapUser(data);
  }

  async updateUserAvatar(userId: string, avatarUrl?: string): Promise<User | null> {
    const { data, error } = await this.client
      .from("users")
      .update({ avatar_url: avatarUrl ?? null })
      .eq("id", userId)
      .select("id, discord_id, display_name, albion_name, role, avatar_url")
      .maybeSingle<UserRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to update user avatar in Supabase", error);
    }

    return data ? mapUser(data) : null;
  }

  async updateUserAlbionName(userId: string, albionName: string): Promise<User | null> {
    const { data, error } = await this.client
      .from("users")
      .update({ albion_name: albionName })
      .eq("id", userId)
      .select("id, discord_id, display_name, albion_name, role, avatar_url")
      .maybeSingle<UserRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to update user Albion name in Supabase", error);
    }

    return data ? mapUser(data) : null;
  }

  async getMembers(): Promise<GuildMember[]> {
    const { data, error } = await this.client
      .from("guild_members")
      .select("id, user_id, status, joined_at, bomb_group_name, discord_role_status, discord_role_synced_at")
      .returns<GuildMemberRow[]>();
    if (error) {
      throw createSupabaseDomainError("Failed to load guild members from Supabase", error);
    }

    return (data ?? []).map(mapGuildMember);
  }

  async getMemberById(memberId: string): Promise<GuildMember | null> {
    const { data, error } = await this.client
      .from("guild_members")
      .select("id, user_id, status, joined_at, bomb_group_name, discord_role_status, discord_role_synced_at")
      .eq("id", memberId)
      .maybeSingle<GuildMemberRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to load member by id from Supabase", error);
    }

    return data ? mapGuildMember(data) : null;
  }

  async getMemberByUserId(userId: string): Promise<GuildMember | null> {
    const { data, error } = await this.client
      .from("guild_members")
      .select("id, user_id, status, joined_at, bomb_group_name, discord_role_status, discord_role_synced_at")
      .eq("user_id", userId)
      .maybeSingle<GuildMemberRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to load member by user id from Supabase", error);
    }

    return data ? mapGuildMember(data) : null;
  }

  async createMember(userId: string, status: MemberStatus = "PENDING"): Promise<GuildMember> {
    const { data, error } = await this.client
      .from("guild_members")
      .insert({ user_id: userId, status })
      .select("id, user_id, status, joined_at, bomb_group_name, discord_role_status, discord_role_synced_at")
      .single<GuildMemberRow>();
    if (error || !data) {
      throw createSupabaseDomainError("Failed to create guild member in Supabase", error);
    }

    return mapGuildMember(data);
  }

  async updateMemberStatus(memberId: string, status: MemberStatus): Promise<GuildMember | null> {
    const { data, error } = await this.client
      .from("guild_members")
      .update({ status })
      .eq("id", memberId)
      .select("id, user_id, status, joined_at, bomb_group_name, discord_role_status, discord_role_synced_at")
      .maybeSingle<GuildMemberRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to update member status in Supabase", error);
    }

    return data ? mapGuildMember(data) : null;
  }

  async updateMemberBombGroup(memberId: string, bombGroupName?: string): Promise<GuildMember | null> {
    const { data, error } = await this.client
      .from("guild_members")
      .update({ bomb_group_name: bombGroupName ?? null })
      .eq("id", memberId)
      .select("id, user_id, status, joined_at, bomb_group_name, discord_role_status, discord_role_synced_at")
      .maybeSingle<GuildMemberRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to update member bomb group in Supabase", error);
    }

    return data ? mapGuildMember(data) : null;
  }

  async setMemberDiscordRoleStatus(
    memberId: string,
    status?: MemberStatus,
    syncedAt = new Date().toISOString()
  ): Promise<GuildMember | null> {
    const { data, error } = await this.client
      .from("guild_members")
      .update({
        discord_role_status: status ?? null,
        discord_role_synced_at: status ? syncedAt : null
      })
      .eq("id", memberId)
      .select("id, user_id, status, joined_at, bomb_group_name, discord_role_status, discord_role_synced_at")
      .maybeSingle<GuildMemberRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to update member Discord role sync in Supabase", error);
    }

    return data ? mapGuildMember(data) : null;
  }

  async getCtas(): Promise<CTA[]> {
    const { data, error } = await this.client
      .from("ctas")
      .select("id, title, datetime_utc, status, created_by, comp_id, signup_channel_id, signup_message_id")
      .order("datetime_utc", { ascending: false })
      .returns<CtaRow[]>();
    if (error) {
      throw createSupabaseDomainError("Failed to load CTAs from Supabase", error);
    }

    return (data ?? []).map(mapCta);
  }

  async getCtaById(ctaId: string): Promise<CTA | null> {
    const { data, error } = await this.client
      .from("ctas")
      .select("id, title, datetime_utc, status, created_by, comp_id, signup_channel_id, signup_message_id")
      .eq("id", ctaId)
      .maybeSingle<CtaRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to load CTA by id from Supabase", error);
    }

    return data ? mapCta(data) : null;
  }

  async getCtaBySignupMessageId(messageId: string): Promise<CTA | null> {
    const { data, error } = await this.client
      .from("ctas")
      .select("id, title, datetime_utc, status, created_by, comp_id, signup_channel_id, signup_message_id")
      .eq("signup_message_id", messageId)
      .maybeSingle<CtaRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to load CTA by signup message id from Supabase", error);
    }

    return data ? mapCta(data) : null;
  }

  async createCta(input: CreateCtaInput): Promise<CTA> {
    const { data, error } = await this.client
      .from("ctas")
      .insert({
        title: input.title,
        datetime_utc: input.datetimeUtc,
        created_by: input.createdBy,
        status: input.initialStatus,
        comp_id: input.compId ?? null,
        signup_channel_id: input.signupChannelId ?? null,
        signup_message_id: input.signupMessageId ?? null
      })
      .select("id, title, datetime_utc, status, created_by, comp_id, signup_channel_id, signup_message_id")
      .single<CtaRow>();
    if (error || !data) {
      throw createSupabaseDomainError("Failed to create CTA in Supabase", error);
    }

    return mapCta(data);
  }

  async updateCtaStatus(ctaId: string, status: CTAStatus): Promise<CTA | null> {
    const update: { status: CTAStatus; finalized_at?: string } = { status };
    if (status === "FINALIZED") {
      update.finalized_at = new Date().toISOString();
    }

    const { data, error } = await this.client
      .from("ctas")
      .update(update)
      .eq("id", ctaId)
      .select("id, title, datetime_utc, status, created_by, comp_id, signup_channel_id, signup_message_id")
      .maybeSingle<CtaRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to update CTA status in Supabase", error);
    }

    return data ? mapCta(data) : null;
  }

  async attachCtaSignupMessage(
    ctaId: string,
    input: { signupChannelId: string; signupMessageId: string }
  ): Promise<CTA | null> {
    const { data, error } = await this.client
      .from("ctas")
      .update({
        signup_channel_id: input.signupChannelId,
        signup_message_id: input.signupMessageId
      })
      .eq("id", ctaId)
      .select("id, title, datetime_utc, status, created_by, comp_id, signup_channel_id, signup_message_id")
      .maybeSingle<CtaRow>();
    if (error) {
      throw createSupabaseDomainError("Failed to attach CTA signup message in Supabase", error);
    }

    return data ? mapCta(data) : null;
  }

  async getAttendanceByCtaId(ctaId: string): Promise<Attendance[]> {
    const { data, error } = await this.client
      .from("attendance")
      .select("id, cta_id, member_id, decision, state")
      .eq("cta_id", ctaId)
      .returns<AttendanceRow[]>();
    if (error) {
      throw createSupabaseDomainError("Failed to load attendance from Supabase", error);
    }

    return (data ?? []).map(mapAttendance);
  }

  async upsertAttendance(input: {
    ctaId: string;
    memberId: string;
    decision: Attendance["decision"];
    state: Attendance["state"];
  }): Promise<Attendance> {
    const { data, error } = await this.client
      .from("attendance")
      .upsert(
        {
          cta_id: input.ctaId,
          member_id: input.memberId,
          decision: input.decision,
          state: input.state
        },
        { onConflict: "cta_id,member_id" }
      )
      .select("id, cta_id, member_id, decision, state")
      .single<AttendanceRow>();
    if (error || !data) {
      throw createSupabaseDomainError("Failed to upsert attendance in Supabase", error);
    }

    return mapAttendance(data);
  }

  async deleteAttendance(ctaId: string, memberId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("attendance")
      .delete()
      .eq("cta_id", ctaId)
      .eq("member_id", memberId)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) {
      throw createSupabaseDomainError("Failed to delete attendance in Supabase", error);
    }

    return Boolean(data?.id);
  }

  async getPointsHistory(): Promise<PointsEntry[]> {
    const { data, error } = await this.client
      .from("points_history")
      .select("id, member_id, cta_id, reason, points, created_at, reversed_at")
      .returns<PointsEntryRow[]>();
    if (error) {
      throw createSupabaseDomainError("Failed to load points history from Supabase", error);
    }

    return (data ?? []).map(mapPointsEntry);
  }

  async regenerateAttendancePointsForCta(ctaId: string): Promise<PointsEntry[]> {
    const now = new Date().toISOString();
    const [attendance, members, config] = await Promise.all([
      this.getAttendanceByCtaId(ctaId),
      this.getMembers(),
      this.getConfig()
    ]);

    const { error: reverseError } = await this.client
      .from("points_history")
      .update({ reversed_at: now })
      .eq("cta_id", ctaId)
      .eq("reason", "attendance")
      .is("reversed_at", null);
    if (reverseError) {
      throw createSupabaseDomainError(
        "Failed to reverse old attendance points in Supabase",
        reverseError
      );
    }

    const nextEntries = generateAttendancePointsEntries({
      ctaId,
      attendances: attendance,
      members,
      config,
      now
    });

    if (nextEntries.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from("points_history")
      .insert(
        nextEntries.map((entry) => ({
          id: randomUUID(),
          member_id: entry.memberId,
          cta_id: entry.ctaId ?? null,
          reason: entry.reason,
          points: entry.points,
          created_at: entry.createdAt
        }))
      )
      .select("id, member_id, cta_id, reason, points, created_at, reversed_at")
      .returns<PointsEntryRow[]>();
    if (error) {
      throw createSupabaseDomainError("Failed to insert attendance points in Supabase", error);
    }

    return (data ?? []).map(mapPointsEntry);
  }

  async getRanking(): Promise<Array<{ memberId: string; points: number }>> {
    return buildRanking(await this.getPointsHistory());
  }

  async getOpenSlots(): Promise<{ slotsOpen: number; memberCap: number }> {
    const [members, config] = await Promise.all([this.getMembers(), this.getConfig()]);
    return {
      slotsOpen: countOpenSlots(members, config),
      memberCap: config.memberCap
    };
  }

  async getBattlePerformanceSnapshots(): Promise<BattlePerformanceSnapshotRecord[]> {
    const { data, error } = await this.client
      .from("battle_performance_snapshots")
      .select("battle_id, start_time, guild_name, guild_players, guild_kills, guild_deaths, main_kills, main_deaths, processed_at")
      .order("start_time", { ascending: false })
      .returns<BattlePerformanceSnapshotRow[]>();
    if (error) {
      throw createSupabaseDomainError("Failed to load performance snapshots from Supabase", error);
    }

    return (data ?? []).map(mapBattlePerformanceSnapshot);
  }

  async getBattlePerformanceBombs(): Promise<BattlePerformanceBombRecord[]> {
    const { data, error } = await this.client
      .from("battle_performance_bombs")
      .select("battle_id, bomb_group_name, players, kills, deaths")
      .returns<BattlePerformanceBombRow[]>();
    if (error) {
      throw createSupabaseDomainError("Failed to load performance bombs from Supabase", error);
    }

    return (data ?? []).map(mapBattlePerformanceBomb);
  }

  async getBattleMemberAttendances(): Promise<BattleMemberAttendanceRecord[]> {
    const { data, error } = await this.client
      .from("battle_member_attendance")
      .select("battle_id, member_id")
      .returns<BattleMemberAttendanceRow[]>();
    if (error) {
      throw createSupabaseDomainError("Failed to load member battle attendance from Supabase", error);
    }

    return (data ?? []).map(mapBattleMemberAttendance);
  }

  async saveBattlePerformanceSnapshot(input: {
    battleId: string;
    startTime: string;
    guildName: string;
    guildPlayers: number;
    guildKills: number;
    guildDeaths: number;
    mainKills: number;
    mainDeaths: number;
    bombs: Array<{
      bombGroupName: string;
      players: number;
      kills: number;
      deaths: number;
    }>;
    memberAttendances: Array<{
      memberId: string;
    }>;
  }): Promise<BattlePerformanceSnapshotRecord> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("battle_performance_snapshots")
      .upsert(
        {
          battle_id: input.battleId,
          start_time: input.startTime,
          guild_name: input.guildName,
          guild_players: input.guildPlayers,
          guild_kills: input.guildKills,
          guild_deaths: input.guildDeaths,
          main_kills: input.mainKills,
          main_deaths: input.mainDeaths,
          processed_at: now
        },
        { onConflict: "battle_id" }
      )
      .select("battle_id, start_time, guild_name, guild_players, guild_kills, guild_deaths, main_kills, main_deaths, processed_at")
      .single<BattlePerformanceSnapshotRow>();
    if (error || !data) {
      throw createSupabaseDomainError("Failed to save performance snapshot in Supabase", error);
    }

    const { error: deleteError } = await this.client
      .from("battle_performance_bombs")
      .delete()
      .eq("battle_id", input.battleId);
    if (deleteError) {
      throw createSupabaseDomainError("Failed to replace performance bombs in Supabase", deleteError);
    }

    if (input.bombs.length > 0) {
      const { error: insertBombsError } = await this.client
        .from("battle_performance_bombs")
        .insert(
          input.bombs.map((bomb) => ({
            battle_id: input.battleId,
            bomb_group_name: bomb.bombGroupName,
            players: bomb.players,
            kills: bomb.kills,
            deaths: bomb.deaths
          }))
        );
      if (insertBombsError) {
        throw createSupabaseDomainError("Failed to save performance bombs in Supabase", insertBombsError);
      }
    }

    const { error: deleteAttendanceError } = await this.client
      .from("battle_member_attendance")
      .delete()
      .eq("battle_id", input.battleId);
    if (deleteAttendanceError) {
      throw createSupabaseDomainError("Failed to replace member battle attendance in Supabase", deleteAttendanceError);
    }

    if (input.memberAttendances.length > 0) {
      const { error: insertAttendanceError } = await this.client
        .from("battle_member_attendance")
        .insert(
          input.memberAttendances.map((entry) => ({
            battle_id: input.battleId,
            member_id: entry.memberId
          }))
        );
      if (insertAttendanceError) {
        throw createSupabaseDomainError("Failed to save member battle attendance in Supabase", insertAttendanceError);
      }
    }

    return mapBattlePerformanceSnapshot(data);
  }

  async getComps(): Promise<CompRecord[]> {
    const { data: comps, error: compsError } = await this.client
      .from("comps")
      .select("id, name, created_by, updated_at")
      .order("updated_at", { ascending: false })
      .returns<CompRow[]>();
    if (compsError) {
      throw createSupabaseDomainError("Failed to load comps from Supabase", compsError);
    }

    const compIds = (comps ?? []).map((comp) => comp.id);
    let slots: CompSlotRow[] = [];

    if (compIds.length > 0) {
      const { data: slotRows, error: slotsError } = await this.client
        .from("comp_slots")
        .select("id, comp_id, party_key, party_name, party_position, position, label, player_user_id, player_name, role, weapon_id, weapon_name, notes")
        .in("comp_id", compIds)
        .order("party_position", { ascending: true })
        .order("position", { ascending: true })
        .returns<CompSlotRow[]>();
      if (slotsError) {
        throw createSupabaseDomainError("Failed to load comp slots from Supabase", slotsError);
      }

      slots = slotRows ?? [];
    }

    const partiesByCompId = new Map<string, CompPartyRecord[]>();
    for (const slot of slots) {
      const parties = partiesByCompId.get(slot.comp_id) ?? [];
      let party = parties.find((entry) => entry.key === slot.party_key);

      if (!party) {
        party = {
          key: slot.party_key,
          name: slot.party_name,
          position: slot.party_position,
          slots: []
        };
        parties.push(party);
      }

      party.slots.push(mapCompSlot(slot));
      partiesByCompId.set(slot.comp_id, parties);
    }

    return (comps ?? []).map((comp) => ({
      id: comp.id,
      name: comp.name,
      createdBy: comp.created_by,
      updatedAt: comp.updated_at,
      parties:
        partiesByCompId
          .get(comp.id)
          ?.sort((left, right) => left.position - right.position)
          .map((party) => ({
            ...party,
            slots: party.slots.sort((left, right) => left.position - right.position)
          })) ?? []
    }));
  }

  async getCompById(compId: string): Promise<CompRecord | null> {
    const comps = await this.getComps();
    return comps.find((comp) => comp.id === compId) ?? null;
  }

  async saveComp(input: SaveCompInput): Promise<CompRecord> {
    const compMutation = input.id
      ? this.client
          .from("comps")
          .update({
            name: input.name,
            updated_at: new Date().toISOString()
          })
          .eq("id", input.id)
      : this.client.from("comps").insert({
          name: input.name,
          created_by: input.createdBy,
          updated_at: new Date().toISOString()
        });

    const { data: comp, error: compError } = await compMutation
      .select("id, name, created_by, updated_at")
      .single<CompRow>();
    if (compError || !comp) {
      throw createSupabaseDomainError("Failed to save comp in Supabase", compError);
    }

    const { error: deleteError } = await this.client.from("comp_slots").delete().eq("comp_id", comp.id);
    if (deleteError) {
      throw createSupabaseDomainError("Failed to replace comp slots in Supabase", deleteError);
    }

    let parties: CompPartyRecord[] = [];

    const flattenedSlots = input.parties.flatMap((party) =>
      party.slots.map((slot) => ({
        id: slot.id ?? randomUUID(),
        comp_id: comp.id,
        party_key: party.key,
        party_name: party.name,
        party_position: party.position,
        position: slot.position,
        label: slot.label,
        player_user_id: slot.playerUserId ?? null,
        player_name: slot.playerName || null,
        role: slot.role,
        weapon_id: slot.weaponId,
        weapon_name: slot.weaponName,
        notes: slot.notes || null
      }))
    );

    if (flattenedSlots.length > 0) {
      const { data: savedSlots, error: slotError } = await this.client
        .from("comp_slots")
        .insert(flattenedSlots)
        .select("id, comp_id, party_key, party_name, party_position, position, label, player_user_id, player_name, role, weapon_id, weapon_name, notes")
        .order("party_position", { ascending: true })
        .order("position", { ascending: true })
        .returns<CompSlotRow[]>();
      if (slotError) {
        throw createSupabaseDomainError("Failed to save comp slots in Supabase", slotError);
      }

      const partyMap = new Map<string, CompPartyRecord>();
      for (const slot of savedSlots ?? []) {
        let party = partyMap.get(slot.party_key);

        if (!party) {
          party = {
            key: slot.party_key,
            name: slot.party_name,
            position: slot.party_position,
            slots: []
          };
          partyMap.set(slot.party_key, party);
        }

        party.slots.push(mapCompSlot(slot));
      }

      parties = [...partyMap.values()].sort((left, right) => left.position - right.position);
    }

    return {
      id: comp.id,
      name: comp.name,
      createdBy: comp.created_by,
      updatedAt: comp.updated_at,
      parties
    };
  }

  async deleteComp(compId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("comps")
      .delete()
      .eq("id", compId)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) {
      throw createSupabaseDomainError("Failed to delete comp in Supabase", error);
    }

    return Boolean(data?.id);
  }

  async getCtaSignups(ctaId: string): Promise<CtaSignupRecord[]> {
    const { data, error } = await this.client
      .from("cta_signups")
      .select("id, cta_id, member_id, role, slot_key, slot_label, weapon_name, player_name, reacted_at")
      .eq("cta_id", ctaId)
      .order("reacted_at", { ascending: true })
      .returns<CtaSignupRow[]>();
    if (error) {
      throw createSupabaseDomainError("Failed to load CTA signups from Supabase", error);
    }

    return (data ?? []).map(mapCtaSignup);
  }

  async upsertCtaSignup(input: {
    ctaId: string;
    memberId: string;
    role: string;
    slotKey: string;
    slotLabel: string;
    weaponName: string;
    reactionEmoji?: string;
    playerName: string;
  }): Promise<CtaSignupRecord> {
    const { data, error } = await this.client
      .from("cta_signups")
      .upsert(
        {
          cta_id: input.ctaId,
          member_id: input.memberId,
          role: input.role,
          slot_key: input.slotKey,
          slot_label: input.slotLabel,
          weapon_name: input.weaponName,
          player_name: input.playerName,
          reacted_at: new Date().toISOString()
        },
        { onConflict: "cta_id,member_id" }
      )
      .select("id, cta_id, member_id, role, slot_key, slot_label, weapon_name, player_name, reacted_at")
      .single<CtaSignupRow>();
    if (error || !data) {
      throw createSupabaseDomainError("Failed to save CTA signup in Supabase", error);
    }

    return mapCtaSignup(data);
  }

  async deleteCtaSignup(ctaId: string, memberId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("cta_signups")
      .delete()
      .eq("cta_id", ctaId)
      .eq("member_id", memberId)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) {
      throw createSupabaseDomainError("Failed to delete CTA signup in Supabase", error);
    }

    return Boolean(data?.id);
  }

  async getRecruitmentApplicationByUserId(
    userId: string
  ): Promise<RecruitmentApplicationRecord | null> {
    const { data, error } = await this.client
      .from("recruitment_applications")
      .select(
        "id, user_id, display_name, timezone, main_role, zvz_experience, notes, status, ticket_channel_id, created_at, updated_at"
      )
      .eq("user_id", userId)
      .maybeSingle<RecruitmentApplicationRow>();
    if (error) {
      throw createSupabaseDomainError(
        "Failed to load recruitment application by user id from Supabase",
        error
      );
    }

    return data ? mapRecruitmentApplication(data) : null;
  }

  async saveRecruitmentApplication(
    input: SaveRecruitmentApplicationInput
  ): Promise<RecruitmentApplicationRecord> {
    const { data, error } = await this.client
      .from("recruitment_applications")
      .upsert(
        {
          user_id: input.userId,
          display_name: input.displayName,
          timezone: input.timezone,
          main_role: input.mainRole,
          zvz_experience: input.zvzExperience,
          notes: input.notes || null,
          status: "SUBMITTED",
          ticket_channel_id: null,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "user_id"
        }
      )
      .select(
        "id, user_id, display_name, timezone, main_role, zvz_experience, notes, status, ticket_channel_id, created_at, updated_at"
      )
      .single<RecruitmentApplicationRow>();
    if (error || !data) {
      throw createSupabaseDomainError("Failed to save recruitment application in Supabase", error);
    }

    return mapRecruitmentApplication(data);
  }

  async listTicketPendingRecruitmentApplications(): Promise<RecruitmentApplicationRecord[]> {
    const { data, error } = await this.client
      .from("recruitment_applications")
      .select(
        "id, user_id, display_name, timezone, main_role, zvz_experience, notes, status, ticket_channel_id, created_at, updated_at"
      )
      .eq("status", "SUBMITTED")
      .is("ticket_channel_id", null)
      .order("created_at", { ascending: true })
      .returns<RecruitmentApplicationRow[]>();
    if (error) {
      throw createSupabaseDomainError(
        "Failed to load ticket-pending recruitment applications from Supabase",
        error
      );
    }

    return (data ?? []).map(mapRecruitmentApplication);
  }

  async markRecruitmentApplicationTicketOpened(
    applicationId: string,
    ticketChannelId: string
  ): Promise<RecruitmentApplicationRecord | null> {
    const { data, error } = await this.client
      .from("recruitment_applications")
      .update({
        status: "TICKET_OPEN",
        ticket_channel_id: ticketChannelId,
        updated_at: new Date().toISOString()
      })
      .eq("id", applicationId)
      .select(
        "id, user_id, display_name, timezone, main_role, zvz_experience, notes, status, ticket_channel_id, created_at, updated_at"
      )
      .maybeSingle<RecruitmentApplicationRow>();
    if (error) {
      throw createSupabaseDomainError(
        "Failed to mark recruitment ticket as opened in Supabase",
        error
      );
    }

    return data ? mapRecruitmentApplication(data) : null;
  }

  async updateRecruitmentApplicationStatus(
    applicationId: string,
    status: RecruitmentApplicationStatus
  ): Promise<RecruitmentApplicationRecord | null> {
    const { data, error } = await this.client
      .from("recruitment_applications")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", applicationId)
      .select(
        "id, user_id, display_name, timezone, main_role, zvz_experience, notes, status, ticket_channel_id, created_at, updated_at"
      )
      .maybeSingle<RecruitmentApplicationRow>();
    if (error) {
      throw createSupabaseDomainError(
        "Failed to update recruitment application status in Supabase",
        error
      );
    }

    return data ? mapRecruitmentApplication(data) : null;
  }
}

export function createSupabaseRepository(
  options: SupabaseRepositoryOptions
): DatabaseRepository {
  return new SupabaseDatabaseRepository(options);
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    discordId: row.discord_id,
    displayName: row.display_name,
    albionName: row.albion_name ?? undefined,
    role: row.role,
    avatarUrl: row.avatar_url ?? undefined
  };
}

function mapGuildMember(row: GuildMemberRow): GuildMember {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    joinedAt: row.joined_at,
    bombGroupName: row.bomb_group_name ?? undefined,
    discordRoleStatus: row.discord_role_status ?? undefined,
    discordRoleSyncedAt: row.discord_role_synced_at ?? undefined
  };
}

function mapCta(row: CtaRow): CTA {
  return {
    id: row.id,
    title: row.title,
    datetimeUtc: row.datetime_utc,
    status: row.status,
    createdBy: row.created_by,
    compId: row.comp_id ?? undefined,
    signupChannelId: row.signup_channel_id ?? undefined,
    signupMessageId: row.signup_message_id ?? undefined
  };
}

function mapAttendance(row: AttendanceRow): Attendance {
  return {
    id: row.id,
    ctaId: row.cta_id,
    memberId: row.member_id,
    decision: row.decision,
    state: row.state
  };
}

function mapPointsEntry(row: PointsEntryRow): PointsEntry {
  return {
    id: row.id,
    memberId: row.member_id,
    ctaId: row.cta_id ?? undefined,
    reason: row.reason,
    points: row.points,
    createdAt: row.created_at,
    reversedAt: row.reversed_at ?? undefined
  };
}

function mapBattlePerformanceSnapshot(
  row: BattlePerformanceSnapshotRow
): BattlePerformanceSnapshotRecord {
  return {
    battleId: row.battle_id,
    startTime: row.start_time,
    guildName: row.guild_name,
    guildPlayers: row.guild_players,
    guildKills: row.guild_kills,
    guildDeaths: row.guild_deaths,
    mainKills: row.main_kills,
    mainDeaths: row.main_deaths,
    processedAt: row.processed_at
  };
}

function mapBattlePerformanceBomb(row: BattlePerformanceBombRow): BattlePerformanceBombRecord {
  return {
    battleId: row.battle_id,
    bombGroupName: row.bomb_group_name,
    players: row.players,
    kills: row.kills,
    deaths: row.deaths
  };
}

function mapBattleMemberAttendance(row: BattleMemberAttendanceRow): BattleMemberAttendanceRecord {
  return {
    battleId: row.battle_id,
    memberId: row.member_id
  };
}

function mapGuildConfig(row: GuildConfigRow): GuildConfig {
  return {
    attendancePoints: row.attendance_points,
    absencePenalty: row.absence_penalty,
    memberCap: row.member_cap
  };
}

function mapCompSlot(row: CompSlotRow): CompSlotRecord {
  return {
    id: row.id,
    position: row.position,
    label: row.label,
    playerUserId: row.player_user_id ?? undefined,
    playerName: row.player_name ?? "",
    role: row.role,
    weaponId: row.weapon_id,
    weaponName: row.weapon_name,
    notes: row.notes ?? ""
  };
}

function mapRecruitmentApplication(
  row: RecruitmentApplicationRow
): RecruitmentApplicationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    timezone: row.timezone,
    mainRole: row.main_role,
    zvzExperience: row.zvz_experience,
    notes: row.notes ?? "",
    status: row.status,
    ticketChannelId: row.ticket_channel_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCtaSignup(row: CtaSignupRow): CtaSignupRecord {
  return {
    id: row.id,
    ctaId: row.cta_id,
    memberId: row.member_id,
    role: row.role,
    slotKey: row.slot_key,
    slotLabel: row.slot_label,
    weaponName: row.weapon_name,
    playerName: row.player_name,
    reactedAt: row.reacted_at
  };
}

function createSupabaseDomainError(message: string, error?: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null): DomainError {
  if (!error) {
    return new DomainError(message);
  }

  const parts = [message, error.code, error.message, error.details, error.hint].filter(Boolean);
  return new DomainError(parts.join(" | "));
}
