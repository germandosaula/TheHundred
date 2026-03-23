import { createHash } from "node:crypto";
import {
  ActionRowBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  OverwriteType,
  Partials,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  SlashCommandBuilder
} from "discord.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Guild,
  GuildMember,
  Snowflake,
  StringSelectMenuInteraction
} from "discord.js";
import {
  createRepository,
  type CompRecord,
  type CtaSignupRecord,
  type ScheduledEventRecord
} from "@thehundred/db";
import { type CTA, type MemberStatus } from "@thehundred/domain";
import { createKillboardClient } from "@thehundred/killboard";
import { loadEnvFile } from "./load-env.ts";

const envLoad = loadEnvFile();

function resolveEnvSource(key: string) {
  if (!process.env[key]) {
    return "unset";
  }
  return envLoad.loadedFromFile[key] ?? "process.env(shell/container)";
}

const repository = createRepository({
  provider: process.env.REPOSITORY_PROVIDER === "supabase" ? "supabase" : "memory",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
});
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const syncIntervalMs = Number(process.env.DISCORD_SYNC_INTERVAL_MS ?? "30000");
const recruitmentCategoryId = process.env.DISCORD_RECRUITMENT_CATEGORY_ID;
const managementRoleIds = (
  process.env.DISCORD_STAFF_ROLE_IDS ??
  process.env.DISCORD_COUNCIL_ROLE_IDS ??
  ""
)
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const activeRoleIds = {
  TRIAL: process.env.DISCORD_ROLE_TRIAL_ID,
  CORE: process.env.DISCORD_ROLE_CORE_ID,
  BENCHED: process.env.DISCORD_ROLE_BENCHED_ID
} as const;
const supabaseHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : "n/a";
const staffRoleIds = ["1477718673757180026"];
const recruiterRoleIds = ["1480276764524806145"];
const phase2AllowedRoleIds = [...new Set([...managementRoleIds, ...recruiterRoleIds])];
const economyAuditChannelId =
  process.env.DISCORD_ECONOMY_AUDIT_CHANNEL_ID ?? "1483471603495993484";
const pagarSinPeleaVoiceChannelId =
  process.env.DISCORD_PAGAR_SIN_PELEA_VOICE_CHANNEL_ID ?? "1477634488673505315";
const albionBbBaseUrl = process.env.ALBION_BB_API_BASE_URL ?? "https://api.albionbb.com/eu";
const killboardClient = createKillboardClient({
  source: "albionbb",
  baseUrl: albionBbBaseUrl
});

const slotsCommand = new SlashCommandBuilder()
  .setName("slots")
  .setDescription("Shows the number of open guild slots");

const recruitCommand = new SlashCommandBuilder()
  .setName("recruit")
  .setDescription("Approves a linked Discord user for guild/private dashboard access")
  .addUserOption((option) =>
    option.setName("usuario").setDescription("Usuario de Discord").setRequired(true)
  );

const syncMemberCommand = new SlashCommandBuilder()
  .setName("syncmember")
  .setDescription("Syncs the Discord guild role from the current web guild status")
  .addUserOption((option) =>
    option.setName("usuario").setDescription("Usuario de Discord").setRequired(true)
  );

const rolesAuditCommand = new SlashCommandBuilder()
  .setName("roles-audit")
  .setDescription("Audita desincronizaciones entre Discord y Web");

const payoutLootCommand = new SlashCommandBuilder()
  .setName("pagar-loot")
  .setDescription("Procesa un reparto de lootsplit y acredita el monedero.")
  .addStringOption((option) =>
    option
      .setName("cta_id")
      .setDescription("ID de la CTA a usar para elegibles (solo slots asignados)")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option.setName("est_value").setDescription("Loot estimado").setRequired(true).setMinValue(0)
  )
  .addIntegerOption((option) =>
    option.setName("bolsas").setDescription("Bolsas/cash extra").setRequired(true).setMinValue(0)
  )
  .addIntegerOption((option) =>
    option
      .setName("repair_cost")
      .setDescription("Coste total de reparacion")
      .setRequired(true)
      .setMinValue(0)
  )
  .addIntegerOption((option) =>
    option.setName("tax").setDescription("Tax %").setRequired(true).setMinValue(0).setMaxValue(100)
  );

const payoutNoBattleCommand = new SlashCommandBuilder()
  .setName("pagarsinpelea")
  .setDescription("Procesa un lootsplit sin battle link usando conectados de voz.")
  .addIntegerOption((option) =>
    option.setName("est_value").setDescription("Loot estimado").setRequired(true).setMinValue(0)
  )
  .addIntegerOption((option) =>
    option.setName("bolsas").setDescription("Bolsas/cash extra").setRequired(true).setMinValue(0)
  )
  .addIntegerOption((option) =>
    option
      .setName("repair_cost")
      .setDescription("Coste total de reparacion")
      .setRequired(true)
      .setMinValue(0)
  )
  .addIntegerOption((option) =>
    option.setName("tax").setDescription("Tax %").setRequired(true).setMinValue(0).setMaxValue(100)
  )
  .addChannelOption((option) =>
    option
      .setName("canal_voz")
      .setDescription("Canal de voz a usar (si no, usa el canal fijo configurado)")
      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("guild_name")
      .setDescription("Nombre de la guild para el recibo/auditoria")
      .setRequired(false)
  );

const balanceCommand = new SlashCommandBuilder()
  .setName("bal")
  .setDescription("Muestra el balance del monedero")
  .addUserOption((option) =>
    option
      .setName("usuario")
      .setDescription("Usuario de Discord (solo Staff para consultar terceros)")
      .setRequired(false)
  );

const withdrawCommand = new SlashCommandBuilder()
  .setName("retirar")
  .setDescription("Retira saldo de un usuario")
  .addUserOption((option) =>
    option
      .setName("usuario")
      .setDescription("Usuario de Discord")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option.setName("cantidad").setDescription("Cantidad a retirar").setRequired(true).setMinValue(1)
  );

const payCommand = new SlashCommandBuilder()
  .setName("pagar")
  .setDescription("Añade saldo a un usuario")
  .addUserOption((option) =>
    option
      .setName("usuario")
      .setDescription("Usuario de Discord")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option.setName("cantidad").setDescription("Cantidad a pagar").setRequired(true).setMinValue(1)
  );

const withdrawRoleCommand = new SlashCommandBuilder()
  .setName("retirar_dinero_rol")
  .setDescription("Retira dinero a todos los miembros de un rol")
  .addStringOption((option) =>
    option
      .setName("rol")
      .setDescription("Rol de Discord objetivo")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("cantidad")
      .setDescription("Cantidad a retirar por miembro")
      .setRequired(true)
      .setMinValue(1)
  );

const economyCommand = new SlashCommandBuilder()
  .setName("economia")
  .setDescription("Muestra el total economico agregado del roster");

const resetEconomyCommand = new SlashCommandBuilder()
  .setName("reset_economia")
  .setDescription("Pone a 0 el balance de todos los usuarios");

const phase2Command = new SlashCommandBuilder()
  .setName("fase2")
  .setDescription("Publica el mensaje de paso a fase 2 en este canal");

const eventRegisterCommand = new SlashCommandBuilder()
  .setName("evento_registrar")
  .setDescription("Registra un evento con cuenta atras")
  .addStringOption((option) =>
    option
      .setName("descripcion")
      .setDescription("Descripcion del evento")
      .setRequired(true)
      .setMaxLength(120)
  )
  .addStringOption((option) =>
    option
      .setName("mapa")
      .setDescription("Nombre del mapa")
      .setRequired(true)
      .setMaxLength(80)
  )
  .addStringOption((option) =>
    option
      .setName("cuanto_queda")
      .setDescription("Ejemplos: 3h, 2h30m, 90m")
      .setRequired(true)
      .setMaxLength(20)
  );

const eventDeleteCommand = new SlashCommandBuilder()
  .setName("evento_eliminar")
  .setDescription("Elimina un evento registrado")
  .addStringOption((option) =>
    option
      .setName("id")
      .setDescription("ID del evento (completo o prefijo)")
      .setRequired(true)
      .setMaxLength(36)
  );

const eventsCommand = new SlashCommandBuilder()
  .setName("eventos")
  .setDescription("Muestra los eventos activos ordenados por cuanto queda");

const ctaRoleEmojiMap = {
  Tank: "🛡️",
  Healer: "💚",
  Support: "🟡",
  Melee: "🗡️",
  Ranged: "🏹",
  Battlemount: "🐘"
} as const;

const ctaRoleOrder = ["Tank", "Healer", "Support", "Melee", "Ranged", "Battlemount"] as const;
const ctaSlotEmojiPool = [
  "1️⃣",
  "2️⃣",
  "3️⃣",
  "4️⃣",
  "5️⃣",
  "6️⃣",
  "7️⃣",
  "8️⃣",
  "9️⃣",
  "🔟",
  "🅰️",
  "🅱️",
  "🇨",
  "🇩",
  "🇪",
  "🇫",
  "🇬",
  "🇭",
  "🇮",
  "🇯"
] as const;

const ctaReminderThresholds = [
  { label: "1h", ms: 60 * 60 * 1000 },
  { label: "15m", ms: 15 * 60 * 1000 }
] as const;
const ctaReminderToleranceMs = 60 * 1000;
const ctaReminderChannelId = "1479151829832171731";
const scheduledEventsReminderChannelId = process.env.DISCORD_EVENTS_CHANNEL_ID ?? ctaReminderChannelId;
const sentCtaReminders = new Set<string>();
let lastScheduledEventsReminderHour = "";
const allowMockLootSplit =
  process.env.LOOTSPLIT_ALLOW_MOCK === "1" ||
  process.env.NODE_ENV !== "production";

type CtaCompRole = keyof typeof ctaRoleEmojiMap;
type CtaSignupSlot = {
  key: string;
  partyKey: string;
  partyName: string;
  label: string;
  role: CtaCompRole;
  weaponName: string;
  emoji: string;
};

type ScheduledEventsRepositoryCompat = {
  getScheduledEvents?: () => Promise<ScheduledEventRecord[]>;
  createScheduledEvent?: (input: {
    description: string;
    mapName: string;
    targetUtc: string;
    createdByDiscordId: string;
    createdByDisplayName: string;
  }) => Promise<ScheduledEventRecord>;
  deleteScheduledEvent?: (eventId: string) => Promise<boolean>;
};

function formatCtaCountdownLabel(targetUtc: string): string {
  const diffMs = new Date(targetUtc).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "0m";
  }

  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  parts.push(`${minutes}m`);

  return parts.join(" ");
}

async function sendCtaReminderMessage(title: string, label: string): Promise<void> {
  const channel = await client.channels.fetch(ctaReminderChannelId).catch(() => null);
  if (!channel?.isTextBased() || !("send" in channel)) {
    return;
  }

  await channel.send(
    `@everyone Quedan ${label} para la CTA ${title} : https://www.thehundredalbion.com/app/ctas`
  );
}

function getRepositoryWithScheduledEventsCompat() {
  return repository as typeof repository & ScheduledEventsRepositoryCompat;
}

function hasNativeScheduledEventsRepositoryMethods(): boolean {
  const compat = getRepositoryWithScheduledEventsCompat();
  return (
    typeof compat.getScheduledEvents === "function" &&
    typeof compat.createScheduledEvent === "function" &&
    typeof compat.deleteScheduledEvent === "function"
  );
}

function getSupabaseRestConfig():
  | { baseUrl: string; serviceRoleKey: string }
  | null {
  const baseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceRoleKey) {
    return null;
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), serviceRoleKey };
}

async function getScheduledEventsCompat(): Promise<ScheduledEventRecord[]> {
  const compat = getRepositoryWithScheduledEventsCompat();
  if (typeof compat.getScheduledEvents === "function") {
    return compat.getScheduledEvents();
  }

  const supabaseConfig = getSupabaseRestConfig();
  if (!supabaseConfig) {
    throw new Error("Scheduled events repository methods are unavailable and Supabase fallback is not configured");
  }

  const response = await fetch(
    `${supabaseConfig.baseUrl}/rest/v1/scheduled_events?select=id,description,map_name,target_utc,created_by_discord_id,created_by_display_name,created_at&order=target_utc.asc`,
    {
      headers: {
        apikey: supabaseConfig.serviceRoleKey,
        authorization: `Bearer ${supabaseConfig.serviceRoleKey}`
      }
    }
  );
  if (!response.ok) {
    throw new Error(`Supabase fallback getScheduledEvents failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Array<{
    id: string;
    description: string;
    map_name: string;
    target_utc: string;
    created_by_discord_id: string;
    created_by_display_name: string;
    created_at: string;
  }>;

  return payload.map((entry) => ({
    id: entry.id,
    description: entry.description,
    mapName: entry.map_name,
    targetUtc: entry.target_utc,
    createdByDiscordId: entry.created_by_discord_id,
    createdByDisplayName: entry.created_by_display_name,
    createdAt: entry.created_at
  }));
}

async function createScheduledEventCompat(input: {
  description: string;
  mapName: string;
  targetUtc: string;
  createdByDiscordId: string;
  createdByDisplayName: string;
}): Promise<ScheduledEventRecord> {
  const compat = getRepositoryWithScheduledEventsCompat();
  if (typeof compat.createScheduledEvent === "function") {
    return compat.createScheduledEvent(input);
  }

  const supabaseConfig = getSupabaseRestConfig();
  if (!supabaseConfig) {
    throw new Error("Scheduled events repository methods are unavailable and Supabase fallback is not configured");
  }

  const response = await fetch(`${supabaseConfig.baseUrl}/rest/v1/scheduled_events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "return=representation",
      apikey: supabaseConfig.serviceRoleKey,
      authorization: `Bearer ${supabaseConfig.serviceRoleKey}`
    },
    body: JSON.stringify({
      description: input.description.trim(),
      map_name: input.mapName.trim(),
      target_utc: input.targetUtc,
      created_by_discord_id: input.createdByDiscordId,
      created_by_display_name: input.createdByDisplayName
    })
  });
  if (!response.ok) {
    throw new Error(`Supabase fallback createScheduledEvent failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Array<{
    id: string;
    description: string;
    map_name: string;
    target_utc: string;
    created_by_discord_id: string;
    created_by_display_name: string;
    created_at: string;
  }>;
  const created = payload[0];
  if (!created) {
    throw new Error("Supabase fallback createScheduledEvent returned empty payload");
  }

  return {
    id: created.id,
    description: created.description,
    mapName: created.map_name,
    targetUtc: created.target_utc,
    createdByDiscordId: created.created_by_discord_id,
    createdByDisplayName: created.created_by_display_name,
    createdAt: created.created_at
  };
}

async function deleteScheduledEventCompat(eventId: string): Promise<boolean> {
  const compat = getRepositoryWithScheduledEventsCompat();
  if (typeof compat.deleteScheduledEvent === "function") {
    return compat.deleteScheduledEvent(eventId);
  }

  const supabaseConfig = getSupabaseRestConfig();
  if (!supabaseConfig) {
    throw new Error("Scheduled events repository methods are unavailable and Supabase fallback is not configured");
  }

  const response = await fetch(
    `${supabaseConfig.baseUrl}/rest/v1/scheduled_events?id=eq.${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        prefer: "count=exact",
        apikey: supabaseConfig.serviceRoleKey,
        authorization: `Bearer ${supabaseConfig.serviceRoleKey}`
      }
    }
  );
  if (!response.ok) {
    throw new Error(`Supabase fallback deleteScheduledEvent failed: HTTP ${response.status}`);
  }

  const contentRange = response.headers.get("content-range") ?? "";
  const countPart = contentRange.split("/")[1];
  const deletedCount = countPart ? Number(countPart) : Number.NaN;
  return Number.isFinite(deletedCount) ? deletedCount > 0 : true;
}

function parseRemainingDuration(value: string): number | null {
  const raw = value.trim().toLowerCase().replace(/\s+/g, "");
  if (!raw) {
    return null;
  }

  let totalMs = 0;
  const regex = /(\d+)([hm])/g;
  let consumed = 0;
  for (const match of raw.matchAll(regex)) {
    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    consumed += match[0].length;
    totalMs += unit === "h" ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
  }

  if (consumed !== raw.length || totalMs <= 0) {
    return null;
  }

  return totalMs;
}

function formatEventRemainingLabel(targetUtc: string): string {
  const diffMs = new Date(targetUtc).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "ahora";
  }

  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `en ${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `en ${hours}h ${minutes}m`;
  }

  return `en ${minutes}m`;
}

function formatEventUtcTime(targetUtc: string): string {
  return (
    new Date(targetUtc).toLocaleTimeString("es-ES", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }) + " UTC"
  );
}

function buildEventsEmbed(events: ScheduledEventRecord[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x4f46e5)
    .setTitle("Events")
    .setDescription("Registro activo ordenado por cuanto queda.")
    .setTimestamp(new Date());

  if (events.length === 0) {
    embed.addFields({
      name: "Sin eventos activos",
      value: "Registra uno con `/evento_registrar`."
    });
    return embed;
  }

  const lines = events.slice(0, 20).map((event) => {
    return `**${formatEventRemainingLabel(event.targetUtc)}** | \`${formatEventUtcTime(event.targetUtc)}\` | <@${event.createdByDiscordId}> | **${event.mapName}** / ${event.description}`;
  });

  embed.addFields({
    name: "Listado",
    value: lines.join("\n")
  });
  embed.setFooter({
    text: events.length > 20 ? `Mostrando 20/${events.length} eventos` : "Horas en UTC"
  });

  return embed;
}

if (!token) {
  console.log("DISCORD_BOT_TOKEN is not configured. Bot bootstrap skipped.");
  process.exit(0);
}

console.log("[bot] startup config", {
  repositoryProvider: process.env.REPOSITORY_PROVIDER === "supabase" ? "supabase" : "memory",
  supabaseHost,
  supabaseUrlSource: resolveEnvSource("SUPABASE_URL"),
  supabaseServiceRoleKeySource: resolveEnvSource("SUPABASE_SERVICE_ROLE_KEY"),
  repositoryProviderSource: resolveEnvSource("REPOSITORY_PROVIDER"),
  economyAuditChannelId,
  economyAuditChannelSource: resolveEnvSource("DISCORD_ECONOMY_AUDIT_CHANNEL_ID"),
  pagarSinPeleaVoiceChannelId: pagarSinPeleaVoiceChannelId ?? "unset",
  pagarSinPeleaVoiceChannelSource: resolveEnvSource("DISCORD_PAGAR_SIN_PELEA_VOICE_CHANNEL_ID"),
  scheduledEventsRepositoryMethods: hasNativeScheduledEventsRepositoryMethods()
    ? "native"
    : "fallback-supabase-rest",
  guildId: guildId ?? "global"
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel]
});

client.once("clientReady", async () => {
  const commandPayload = [
    slotsCommand.toJSON(),
    recruitCommand.toJSON(),
    syncMemberCommand.toJSON(),
    rolesAuditCommand.toJSON(),
    payoutLootCommand.toJSON(),
    payoutNoBattleCommand.toJSON(),
    balanceCommand.toJSON(),
    payCommand.toJSON(),
    withdrawCommand.toJSON(),
    withdrawRoleCommand.toJSON(),
    economyCommand.toJSON(),
    resetEconomyCommand.toJSON(),
    phase2Command.toJSON(),
    eventRegisterCommand.toJSON(),
    eventDeleteCommand.toJSON(),
    eventsCommand.toJSON()
  ];

  if (guildId) {
    await client.application?.commands.set(commandPayload, guildId);
  } else {
    await client.application?.commands.set(commandPayload);
  }
  console.log(`Discord bot ready as ${client.user?.tag ?? "unknown-user"}`);

  if (guildId) {
    void ensureRecruitmentTickets();
    void reconcileGuildRoleSync();
    void ensureCtaReminders();
    void ensureScheduledEventsReminder(true);
    setInterval(() => {
      void ensureRecruitmentTickets();
      void reconcileGuildRoleSync();
      void ensureCtaReminders();
      void ensureScheduledEventsReminder();
    }, syncIntervalMs);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("cta-signup:")) {
        await handleCtaSignupSelect(interaction);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.commandName === "slots") {
      const slots = await repository.getOpenSlots();
      await interaction.reply(`Open slots: ${slots.slotsOpen}/${slots.memberCap}`);
      return;
    }

    if (interaction.commandName === "recruit") {
      await handleRecruitCommand(interaction);
      return;
    }

    if (interaction.commandName === "syncmember") {
      await handleSyncMemberCommand(interaction);
      return;
    }

    if (interaction.commandName === "roles-audit") {
      await handleRolesAuditCommand(interaction);
      return;
    }

    if (interaction.commandName === "pagar-loot") {
      await handlePagarLootCommand(interaction);
      return;
    }

    if (interaction.commandName === "pagarsinpelea") {
      await handlePagarSinPeleaCommand(interaction);
      return;
    }

    if (interaction.commandName === "bal") {
      await handleBalanceCommand(interaction);
      return;
    }

    if (interaction.commandName === "retirar") {
      await handleRetirarCommand(interaction);
      return;
    }

    if (interaction.commandName === "pagar") {
      await handlePagarCommand(interaction);
      return;
    }

    if (interaction.commandName === "retirar_dinero_rol") {
      await handleRetirarDineroRolCommand(interaction);
      return;
    }

    if (interaction.commandName === "economia") {
      await handleEconomiaCommand(interaction);
      return;
    }

    if (interaction.commandName === "reset_economia") {
      await handleResetEconomiaCommand(interaction);
      return;
    }

    if (interaction.commandName === "fase2") {
      await handleFase2Command(interaction);
      return;
    }

    if (interaction.commandName === "evento_registrar") {
      await handleEventRegisterCommand(interaction);
      return;
    }

    if (interaction.commandName === "evento_eliminar") {
      await handleEventDeleteCommand(interaction);
      return;
    }

    if (interaction.commandName === "eventos") {
      await handleEventsCommand(interaction);
      return;
    }
  } catch (error) {
    if (isDiscordInteractionAlreadyAcknowledged(error)) {
      return;
    }
    console.error("Interaction handler failed", error);
    if (interaction.isRepliable()) {
      const message = error instanceof Error ? error.message : "Error inesperado";
      const payload = {
        content: `No se pudo ejecutar el comando: ${message}`,
        ephemeral: true
      } as const;
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => undefined);
      } else {
        await interaction.reply(payload).catch(() => undefined);
      }
    }
  }
});

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  if (interaction.commandName !== "retirar_dinero_rol") {
    await interaction.respond([]);
    return;
  }

  const focused = interaction.options.getFocused(true);
  if (focused.name !== "rol") {
    await interaction.respond([]);
    return;
  }

  const guild =
    interaction.guild ?? (guildId ? await client.guilds.fetch(guildId).catch(() => null) : null);
  if (!guild) {
    await interaction.respond([]);
    return;
  }

  await guild.roles.fetch();
  const query = String(focused.value ?? "").trim().toLowerCase();
  const choices = guild.roles.cache
    .filter((role) => role.id !== guild.id && !role.managed)
    .sort((a, b) => b.position - a.position)
    .filter((role) => (query.length === 0 ? true : role.name.toLowerCase().includes(query)))
    .first(25)
    .map((role) => ({
      name: role.name.slice(0, 100),
      value: role.id
    }));

  await interaction.respond(choices);
}

client.on("guildMemberUpdate", async (_oldMember, newMember) => {
  if (!guildId || newMember.guild.id !== guildId) {
    return;
  }

  try {
    await syncWebStatusFromDiscordMember(newMember);
  } catch (error) {
    console.error("Discord -> web sync failed", error);
  }
});

client.login(token);

function isDiscordInteractionAlreadyAcknowledged(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && Number((error as { code?: unknown }).code) === 40060;
}

function getInteractionRoleIds(interaction: ChatInputCommandInteraction): string[] {
  const member = interaction.member as
    | { roles?: { cache?: Map<string, unknown> } | string[] }
    | null
    | undefined;
  if (!member?.roles) {
    return [];
  }

  if (Array.isArray(member.roles)) {
    return member.roles;
  }

  if ("cache" in member.roles && member.roles.cache) {
    return [...member.roles.cache.keys()];
  }

  return [];
}

async function getRoleIdsForInteraction(interaction: ChatInputCommandInteraction): Promise<string[]> {
  const immediate = getInteractionRoleIds(interaction);
  if (immediate.length > 0) {
    return immediate;
  }

  if (!guildId) {
    return [];
  }

  try {
    const guild = interaction.guild ?? (await client.guilds.fetch(guildId));
    const guildMember = await guild.members.fetch(interaction.user.id);
    return [...guildMember.roles.cache.keys()];
  } catch {
    return [];
  }
}

async function requireDiscordRoles(
  interaction: ChatInputCommandInteraction,
  roleIds: string[],
  deniedMessage: string
): Promise<boolean> {
  if (roleIds.length === 0) {
    await interaction.reply({
      content: "No hay roles configurados para este comando.",
      ephemeral: true
    });
    return false;
  }

  const currentRoleIds = await getRoleIdsForInteraction(interaction);
  const allowed = roleIds.some((roleId) => currentRoleIds.includes(roleId));
  if (!allowed) {
    await interaction.reply({
      content: deniedMessage,
      ephemeral: true
    });
    return false;
  }

  return true;
}

async function handleRecruitCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      managementRoleIds,
      "Solo Staff puede usar /recruit."
    ))
  ) {
    return;
  }

  const discordUser = interaction.options.getUser("usuario", true);
  const discordId = discordUser.id;
  const user = await repository.getUserByDiscordId(discordId);
  if (!user) {
    await interaction.reply({
      content: "No linked web user found for that Discord id.",
      ephemeral: true
    });
    return;
  }

  const existingMember = await repository.getMemberByUserId(user.id);
  if (existingMember) {
    if (existingMember.status === "PENDING" || existingMember.status === "REJECTED") {
      const updatedMember = await repository.updateMemberStatus(existingMember.id, "TRIAL");
      if (!updatedMember) {
        await interaction.reply({
          content: "Could not promote the member in the database.",
          ephemeral: true
        });
        return;
      }

      try {
        await syncDiscordGuildRole(discordId, updatedMember);
        await interaction.reply(
          `Recruitment approved for ${user.displayName}. Status: ${updatedMember.status}.`
        );
      } catch (error) {
        await interaction.reply({
          content:
            error instanceof Error
              ? `Member promoted in web, but Discord sync failed: ${error.message}`
              : "Member promoted in web, but Discord sync failed.",
          ephemeral: true
        });
      }
      return;
    }

    await interaction.reply({
      content: `User already has guild status ${existingMember.status}.`,
      ephemeral: true
    });
    return;
  }

  const member = await repository.createMember(user.id, "TRIAL");
  try {
    await syncDiscordGuildRole(discordId, member);
    await interaction.reply(`Recruitment approved for ${user.displayName}. Status: ${member.status}.`);
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `Member created in web, but Discord sync failed: ${error.message}`
          : "Member created in web, but Discord sync failed.",
      ephemeral: true
    });
  }
}

async function handleSyncMemberCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      managementRoleIds,
      "Solo Staff puede usar /syncmember."
    ))
  ) {
    return;
  }

  const discordUser = interaction.options.getUser("usuario", true);
  const discordId = discordUser.id;
  const user = await repository.getUserByDiscordId(discordId);
  if (!user) {
    await interaction.reply({
      content: "No linked web user found for that Discord id.",
      ephemeral: true
    });
    return;
  }

  const member = await repository.getMemberByUserId(user.id);
  if (!member) {
    if (!guildId) {
      await interaction.reply({
        content: "The user is linked on web but does not have a guild member record.",
        ephemeral: true
      });
      return;
    }

    try {
      const guild = await client.guilds.fetch(guildId);
      const guildMember = await guild.members.fetch(discordId);
      const detectedStatus = getStatusFromDiscordRoles(guildMember);

      if (!detectedStatus) {
        await interaction.reply({
          content: "The user is linked on web but has no Trial/Core/Benched/Staff role in Discord yet.",
          ephemeral: true
        });
        return;
      }

      const createdMember = await repository.createMember(user.id, detectedStatus);
      await repository.setMemberDiscordRoleStatus(createdMember.id, detectedStatus);
      const application = await repository.getRecruitmentApplicationByUserId(user.id);
      if (application) {
        await repository.updateRecruitmentApplicationStatus(application.id, "APPROVED");
      }

      await interaction.reply(
        `Guild member created for ${user.displayName} from Discord role ${detectedStatus}.`
      );
      return;
    } catch (error) {
      await interaction.reply({
        content:
          error instanceof Error
            ? `Could not create the guild member from Discord state: ${error.message}`
            : "Could not create the guild member from Discord state.",
        ephemeral: true
      });
      return;
    }
  }

  try {
    if (!guildId) {
      await syncDiscordGuildRole(discordId, member);
      await interaction.reply(`Discord roles synced for ${user.displayName}. Web status: ${member.status}.`);
      return;
    }

    const guild = await client.guilds.fetch(guildId);
    const guildMember = await guild.members.fetch(discordId);
    const detectedStatus = getStatusFromDiscordRoles(guildMember);

    if (!detectedStatus) {
      await repository.setMemberDiscordRoleStatus(member.id, undefined);
      await interaction.reply(
        `No se detecto rol Trial/Core/Benched/Staff en Discord para ${user.displayName}.`
      );
      return;
    }

    if (member.status !== detectedStatus) {
      await repository.updateMemberStatus(member.id, detectedStatus);
    }
    await repository.setMemberDiscordRoleStatus(member.id, detectedStatus);
    await interaction.reply(
      `Estado sincronizado desde Discord para ${user.displayName}: ${detectedStatus}.`
    );
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `Discord sync failed: ${error.message}`
          : "Discord sync failed.",
      ephemeral: true
    });
  }
}

async function handleRolesAuditCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      managementRoleIds,
      "Solo Staff puede usar /roles-audit."
    ))
  ) {
    return;
  }

  if (!guildId) {
    await interaction.reply({
      content: "DISCORD_GUILD_ID no configurado.",
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.members.fetch();

    const [members, users] = await Promise.all([repository.getMembers(), repository.getUsers()]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const usersByDiscordId = new Map(users.map((user) => [user.discordId, user]));
    const membersByUserId = new Map(members.map((member) => [member.userId, member]));
    const issues: string[] = [];

    for (const member of members) {
      const user = usersById.get(member.userId);
      if (!user) {
        issues.push(`• [${member.id}] miembro sin user asociado en web`);
        continue;
      }

      const guildMember = guild.members.cache.get(user.discordId) ?? null;
      const detectedStatus = guildMember ? getStatusFromDiscordRoles(guildMember) : undefined;
      const expectedStatus = member.kickedAt ? undefined : member.status;

      if (!guildMember) {
        issues.push(`• ${user.displayName}: no está en Discord guild`);
        continue;
      }

      if (expectedStatus !== detectedStatus) {
        issues.push(
          `• ${user.displayName}: mismatch web=${formatMemberStatus(expectedStatus)} discord=${formatMemberStatus(detectedStatus)}`
        );
      }

      if ((member.discordRoleStatus ?? undefined) !== detectedStatus) {
        issues.push(
          `• ${user.displayName}: discordRoleStatus guardado=${formatMemberStatus(member.discordRoleStatus)} detectado=${formatMemberStatus(detectedStatus)}`
        );
      }
    }

    for (const guildMember of guild.members.cache.values()) {
      const detectedStatus = getStatusFromDiscordRoles(guildMember);
      if (!detectedStatus) {
        continue;
      }
      const user = usersByDiscordId.get(guildMember.user.id);
      if (!user) {
        issues.push(`• ${guildMember.user.tag}: tiene rol ${detectedStatus} en Discord pero no existe en web`);
        continue;
      }
      const member = membersByUserId.get(user.id);
      if (!member) {
        issues.push(`• ${user.displayName}: tiene rol ${detectedStatus} en Discord pero no tiene guild_member`);
      }
    }

    if (issues.length === 0) {
      await interaction.editReply("Audit OK: no hay desincronizaciones Discord↔Web.");
      return;
    }

    const header = `Audit detectó ${issues.length} incidencia(s):`;
    const maxLen = 1900;
    let chunk = header;
    const chunks: string[] = [];

    for (const issue of issues) {
      if ((chunk + "\n" + issue).length > maxLen) {
        chunks.push(chunk);
        chunk = issue;
      } else {
        chunk += `\n${issue}`;
      }
    }
    chunks.push(chunk);

    await interaction.editReply(chunks[0]);
    for (let index = 1; index < chunks.length; index += 1) {
      await interaction.followUp({ content: chunks[index], ephemeral: true });
    }
  } catch (error) {
    await interaction.editReply(
      error instanceof Error ? `roles-audit falló: ${error.message}` : "roles-audit falló."
    );
  }
}

async function handlePagarLootCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      staffRoleIds,
      "Solo Staff puede usar /pagar-loot."
    ))
  ) {
    return;
  }

  await interaction.deferReply();

  const ctaId = interaction.options.getString("cta_id", true).trim();
  const splitRole = "AUTO";
  const estValue = interaction.options.getInteger("est_value", true);
  const bags = interaction.options.getInteger("bolsas", true);
  const repairCost = interaction.options.getInteger("repair_cost", true);
  const taxPercent = interaction.options.getInteger("tax", true);

  if (!ctaId) {
    await interaction.editReply("`cta_id` es obligatorio.");
    return;
  }

  const cta = await repository.getCtaById(ctaId);
  if (!cta) {
    await interaction.editReply("No se encontró la CTA indicada en `cta_id`.");
    return;
  }
  if (!cta.compId) {
    await interaction.editReply("La CTA no tiene comp vinculada.");
    return;
  }

  const [ctaSignups, users, members] = await Promise.all([
    repository.getCtaSignups(cta.id),
    repository.getUsers(),
    repository.getMembers()
  ]);

  const slottedSignups = ctaSignups.filter((entry) => !entry.isFill && entry.slotKey !== "__FILL__");
  const participantCountForSplit = slottedSignups.length;
  if (participantCountForSplit === 0) {
    await interaction.editReply("No hay jugadores colocados en slots de la CTA.");
    return;
  }
  const guildName = interaction.guild?.name?.trim() || "UNKNOWN";
  const battleLink = `cta:${cta.id}`;
  const battleIds = [`cta:${cta.id}`];

  const usersById = new Map(users.map((user) => [user.id, user]));
  const membersById = new Map(members.map((member) => [member.id, member]));
  const eligiblePayouts: Array<{
    memberId: string;
    userId: string;
    playerName: string;
  }> = [];
  const unresolvedByReason: Array<{ playerName: string; reason: string }> = [];
  const participantNames = new Set<string>();

  for (const signup of slottedSignups) {
    const fallbackName = signup.playerName?.trim() || signup.memberId;
    participantNames.add(fallbackName);
    const member = membersById.get(signup.memberId);
    if (!member) {
      unresolvedByReason.push({ playerName: fallbackName, reason: "sin miembro de guild" });
      continue;
    }

    const user = usersById.get(member.userId);
    if (!user) {
      unresolvedByReason.push({ playerName: fallbackName, reason: "sin usuario enlazado en web" });
      continue;
    }
    if (member.status === "REJECTED") {
      unresolvedByReason.push({ playerName: fallbackName, reason: "miembro rechazado" });
      continue;
    }

    eligiblePayouts.push({
      memberId: member.id,
      userId: user.id,
      playerName: user.albionName?.trim() || signup.playerName || user.displayName
    });
  }

  const grossTotal = estValue + bags;
  const netAfterRep = grossTotal - repairCost;
  const taxAmount = Math.floor((netAfterRep * taxPercent) / 100);
  const finalPool = netAfterRep - taxAmount;

  if (eligiblePayouts.length === 0) {
    await interaction.editReply(
      `No hay participantes elegibles. Colocados en slots CTA: ${participantCountForSplit}.`
    );
    return;
  }
  if (finalPool <= 0) {
    await interaction.editReply("El pool final es <= 0. Revisa est_value, bolsas, repair_cost y tax.");
    return;
  }

  const perPerson = Math.floor(finalPool / participantCountForSplit);
  if (perPerson <= 0) {
    await interaction.editReply("El reparto por persona da 0. Ajusta valores.");
    return;
  }

  const actorUserId = await resolveActorUserId(interaction);
  if (!actorUserId) {
    await interaction.editReply("Tu usuario Discord no esta enlazado en web.");
    return;
  }

  const idempotencyKey = buildLootSplitIdempotencyKey({
    battleIds,
    guildName,
    splitRole,
    estValue,
    bags,
    repairCost,
    taxPercent,
    participantUserIds: eligiblePayouts.map((entry) => entry.userId),
    participantNames: [...participantNames]
  });

  const payoutResult = await repository.createLootSplitPayout({
    createdBy: actorUserId,
    battleLink,
    battleIds,
    guildName,
    splitRole,
    estValue,
    bags,
    repairCost,
    taxPercent,
    grossTotal,
    netAfterRep,
    taxAmount,
    finalPool,
    participantCount: participantCountForSplit,
    perPerson,
    payouts: eligiblePayouts.map((entry) => ({
      ...entry,
      amount: perPerson
    })),
    idempotencyKey
  });
  const payoutRecord = payoutResult.payout;

  const channelRole = await ensureLootSplitChannelRole(interaction);

  const paidUsers = payoutResult.alreadyProcessed ? [] : await resolvePaidUsers(eligiblePayouts);
  const paidMentions = paidUsers.map((entry) => `<@${entry.discordId}>`);
  let roleAssigned = 0;
  let roleAssignFailed = 0;
  if (channelRole && !payoutResult.alreadyProcessed) {
    const roleAssignment = await assignRoleToPaidUsers(interaction, channelRole.id, paidUsers);
    roleAssigned = roleAssignment.assigned;
    roleAssignFailed = roleAssignment.failed;
  }
  const unresolvedCount = unresolvedByReason.length;
  const unresolvedPreviewLimit = 12;
  const unresolvedPreview =
    unresolvedByReason.length > 0
      ? unresolvedByReason
          .slice(0, unresolvedPreviewLimit)
          .map((entry) => `- ${entry.playerName}: ${entry.reason}`)
          .join("\n")
      : "";

  await interaction.editReply(
    [
      "📄 **RECIBO DE LOOTSPLIT**",
      `CTA: ${cta.title} (${cta.id})`,
      `Fuente: slots CTA (${cta.id})`,
      `Guild: ${guildName}`,
      "",
      "```",
      formatReceiptRow("Loot Estimado", formatMoney(estValue)),
      formatReceiptRow("Bolsas", formatMoney(bags)),
      formatReceiptDivider(),
      formatReceiptRow("TOTAL BRUTO", formatMoney(grossTotal)),
      formatReceiptRow("Coste Repair", `-${formatMoney(repairCost)}`),
      formatReceiptDivider(),
      formatReceiptRow("Neto (post repair)", formatMoney(netAfterRep)),
      formatReceiptRow(`Impuesto (${taxPercent}%)`, `-${formatMoney(taxAmount)}`),
      formatReceiptDivider(),
      formatReceiptRow("POOL FINAL", formatMoney(finalPool)),
      formatReceiptRow("Particip. total", String(participantCountForSplit)),
      formatReceiptRow("Pagados auto", String(eligiblePayouts.length)),
      formatReceiptRow("Pend. manuales", String(unresolvedCount)),
      formatReceiptRow("POR PERSONA", formatMoney(perPerson)),
      "```",
      payoutResult.alreadyProcessed
        ? `ℹ️ Reintento detectado: payout ya procesado (sin pagos duplicados).`
        : `✅ Pagados automáticos: ${eligiblePayouts.length}/${participantCountForSplit}`,
      `⚠️ Pendientes manuales: ${unresolvedCount}`,
      `Payout ID: ${payoutRecord.id}`,
      channelRole ? `Rol CTA: <@&${channelRole.id}>` : "",
      channelRole && !payoutResult.alreadyProcessed
        ? `Rol asignado: ${roleAssigned} | Fallidos: ${roleAssignFailed}`
        : "",
      paidMentions.length > 0 ? "" : payoutResult.alreadyProcessed ? "" : "Sin menciones disponibles.",
      paidMentions.length > 0 ? `Pagado a: ${paidMentions.join(", ")}` : "",
      unresolvedPreview ? "" : "",
      unresolvedPreview
        ? `No encontrados (muestra ${Math.min(unresolvedPreviewLimit, unresolvedByReason.length)}/${unresolvedByReason.length}):`
        : "",
      unresolvedPreview ? unresolvedPreview : ""
    ]
      .filter(Boolean)
      .join("\n")
  );

  await sendEconomyAuditLog({
    action: "pagar-loot",
    interaction,
    summary: payoutResult.alreadyProcessed
      ? `Reintento detectado para payout ${payoutRecord.id}. Sin cambios de balance.`
      : `Lootsplit procesado para ${participantCountForSplit} participantes (${eligiblePayouts.length} pagos automáticos).`,
    details: [
      `Payout ID: ${payoutRecord.id}`,
      `CTA: ${cta.title} (${cta.id})`,
      `Guild: ${guildName}`,
      `Pool final: ${formatMoney(finalPool)}`,
      `Por persona: ${formatMoney(perPerson)}`,
      `Participantes totales: ${participantCountForSplit}`,
      `Pagados automáticos: ${eligiblePayouts.length}`,
      `Pendientes manuales: ${unresolvedCount}`
    ],
    color: payoutResult.alreadyProcessed ? 0x94a3b8 : 0x22c55e
  });
}

async function handlePagarSinPeleaCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      staffRoleIds,
      "Solo Staff puede usar /pagarsinpelea."
    ))
  ) {
    return;
  }

  await interaction.deferReply();

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("Este comando solo se puede usar dentro del servidor.");
    return;
  }

  const selectedVoiceChannel = interaction.options.getChannel("canal_voz");
  const targetVoiceChannelId = selectedVoiceChannel?.id ?? pagarSinPeleaVoiceChannelId;
  if (!targetVoiceChannelId) {
    await interaction.editReply(
      "Falta configurar el canal de voz. Usa la opción `canal_voz` o define DISCORD_PAGAR_SIN_PELEA_VOICE_CHANNEL_ID."
    );
    return;
  }

  const voiceChannel = await guild.channels.fetch(targetVoiceChannelId).catch(() => null);
  if (
    !voiceChannel ||
    (voiceChannel.type !== ChannelType.GuildVoice &&
      voiceChannel.type !== ChannelType.GuildStageVoice)
  ) {
    await interaction.editReply("No pude resolver un canal de voz válido para este pago.");
    return;
  }

  const connectedMembers = [...voiceChannel.members.values()].filter((member) => !member.user.bot);
  if (connectedMembers.length === 0) {
    await interaction.editReply(`No hay miembros conectados en <#${voiceChannel.id}>.`);
    return;
  }

  const guildName =
    interaction.options.getString("guild_name")?.trim() || guild.name.trim() || "UNKNOWN";
  const splitRole = "AUTO";
  const estValue = interaction.options.getInteger("est_value", true);
  const bags = interaction.options.getInteger("bolsas", true);
  const repairCost = interaction.options.getInteger("repair_cost", true);
  const taxPercent = interaction.options.getInteger("tax", true);

  const participantCountForSplit = connectedMembers.length;
  const [users, members] = await Promise.all([repository.getUsers(), repository.getMembers()]);
  const usersByDiscordId = new Map(
    users
      .filter((entry) => Boolean(entry.discordId))
      .map((entry) => [entry.discordId as string, entry])
  );
  const memberByUserId = new Map(members.map((member) => [member.userId, member]));

  const eligiblePayouts: Array<{
    memberId: string;
    userId: string;
    playerName: string;
  }> = [];
  const unresolvedByReason: Array<{ playerName: string; reason: string }> = [];
  const detectedParticipantNames: string[] = [];

  for (const discordMember of connectedMembers) {
    const linkedUser = usersByDiscordId.get(discordMember.user.id);
    const participantName =
      linkedUser?.albionName?.trim() || discordMember.displayName || discordMember.user.username;
    detectedParticipantNames.push(participantName);

    if (!linkedUser) {
      unresolvedByReason.push({ playerName: participantName, reason: "sin usuario enlazado en web" });
      continue;
    }

    const member = memberByUserId.get(linkedUser.id);
    if (!member) {
      unresolvedByReason.push({ playerName: participantName, reason: "sin miembro de guild" });
      continue;
    }
    if (member.status === "REJECTED") {
      unresolvedByReason.push({ playerName: participantName, reason: "miembro rechazado" });
      continue;
    }

    eligiblePayouts.push({
      memberId: member.id,
      userId: linkedUser.id,
      playerName: participantName
    });
  }

  const grossTotal = estValue + bags;
  const netAfterRep = grossTotal - repairCost;
  const taxAmount = Math.floor((netAfterRep * taxPercent) / 100);
  const finalPool = netAfterRep - taxAmount;

  if (eligiblePayouts.length === 0) {
    await interaction.editReply(
      `No hay participantes elegibles. Detectados en voz: ${participantCountForSplit}.`
    );
    return;
  }
  if (finalPool <= 0) {
    await interaction.editReply("El pool final es <= 0. Revisa est_value, bolsas, repair_cost y tax.");
    return;
  }

  const perPerson = Math.floor(finalPool / participantCountForSplit);
  if (perPerson <= 0) {
    await interaction.editReply("El reparto por persona da 0. Ajusta valores.");
    return;
  }

  const actorUserId = await resolveActorUserId(interaction);
  if (!actorUserId) {
    await interaction.editReply("Tu usuario Discord no esta enlazado en web.");
    return;
  }

  const idempotencyKey = buildLootSplitIdempotencyKey({
    battleIds: [`voice:${voiceChannel.id}`],
    guildName,
    splitRole,
    estValue,
    bags,
    repairCost,
    taxPercent,
    participantUserIds: eligiblePayouts.map((entry) => entry.userId),
    participantNames: detectedParticipantNames
  });

  const payoutResult = await repository.createLootSplitPayout({
    createdBy: actorUserId,
    battleLink: `voice:${voiceChannel.id}`,
    battleIds: [`voice:${voiceChannel.id}`],
    guildName,
    splitRole,
    estValue,
    bags,
    repairCost,
    taxPercent,
    grossTotal,
    netAfterRep,
    taxAmount,
    finalPool,
    participantCount: participantCountForSplit,
    perPerson,
    payouts: eligiblePayouts.map((entry) => ({
      ...entry,
      amount: perPerson
    })),
    idempotencyKey
  });
  const payoutRecord = payoutResult.payout;

  const channelRole = await ensureLootSplitChannelRole(interaction);
  const paidUsers = payoutResult.alreadyProcessed ? [] : await resolvePaidUsers(eligiblePayouts);
  const paidMentions = paidUsers.map((entry) => `<@${entry.discordId}>`);
  let roleAssigned = 0;
  let roleAssignFailed = 0;
  if (channelRole && !payoutResult.alreadyProcessed) {
    const roleAssignment = await assignRoleToPaidUsers(interaction, channelRole.id, paidUsers);
    roleAssigned = roleAssignment.assigned;
    roleAssignFailed = roleAssignment.failed;
  }

  const unresolvedCount = unresolvedByReason.length;
  const unresolvedPreviewLimit = 12;
  const unresolvedPreview =
    unresolvedByReason.length > 0
      ? unresolvedByReason
          .slice(0, unresolvedPreviewLimit)
          .map((entry) => `- ${entry.playerName}: ${entry.reason}`)
          .join("\n")
      : "";

  await interaction.editReply(
    [
      "📄 **RECIBO DE LOOTSPLIT (SIN PELEA)**",
      `Fuente: <#${voiceChannel.id}>`,
      `Guild: ${guildName}`,
      "",
      "```",
      formatReceiptRow("Loot Estimado", formatMoney(estValue)),
      formatReceiptRow("Bolsas", formatMoney(bags)),
      formatReceiptDivider(),
      formatReceiptRow("TOTAL BRUTO", formatMoney(grossTotal)),
      formatReceiptRow("Coste Repair", `-${formatMoney(repairCost)}`),
      formatReceiptDivider(),
      formatReceiptRow("Neto (post repair)", formatMoney(netAfterRep)),
      formatReceiptRow(`Impuesto (${taxPercent}%)`, `-${formatMoney(taxAmount)}`),
      formatReceiptDivider(),
      formatReceiptRow("POOL FINAL", formatMoney(finalPool)),
      formatReceiptRow("Particip. total", String(participantCountForSplit)),
      formatReceiptRow("Pagados auto", String(eligiblePayouts.length)),
      formatReceiptRow("Pend. manuales", String(unresolvedCount)),
      formatReceiptRow("POR PERSONA", formatMoney(perPerson)),
      "```",
      payoutResult.alreadyProcessed
        ? `ℹ️ Reintento detectado: payout ya procesado (sin pagos duplicados).`
        : `✅ Pagados automáticos: ${eligiblePayouts.length}/${participantCountForSplit}`,
      `⚠️ Pendientes manuales: ${unresolvedCount}`,
      `Payout ID: ${payoutRecord.id}`,
      channelRole ? `Rol CTA: <@&${channelRole.id}>` : "",
      channelRole && !payoutResult.alreadyProcessed
        ? `Rol asignado: ${roleAssigned} | Fallidos: ${roleAssignFailed}`
        : "",
      paidMentions.length > 0 ? "" : payoutResult.alreadyProcessed ? "" : "Sin menciones disponibles.",
      paidMentions.length > 0 ? `Pagado a: ${paidMentions.join(", ")}` : "",
      unresolvedPreview
        ? `No encontrados (muestra ${Math.min(unresolvedPreviewLimit, unresolvedByReason.length)}/${unresolvedByReason.length}):`
        : "",
      unresolvedPreview ? unresolvedPreview : ""
    ]
      .filter(Boolean)
      .join("\n")
  );

  await sendEconomyAuditLog({
    action: "pagarsinpelea",
    interaction,
    summary: payoutResult.alreadyProcessed
      ? `Reintento detectado para payout ${payoutRecord.id}. Sin cambios de balance.`
      : `Lootsplit sin pelea procesado para ${participantCountForSplit} participantes (${eligiblePayouts.length} pagos automáticos).`,
    details: [
      `Payout ID: ${payoutRecord.id}`,
      `Fuente: canal de voz ${voiceChannel.name}`,
      `Guild: ${guildName}`,
      `Pool final: ${formatMoney(finalPool)}`,
      `Por persona: ${formatMoney(perPerson)}`,
      `Participantes totales: ${participantCountForSplit}`,
      `Pagados automáticos: ${eligiblePayouts.length}`,
      `Pendientes manuales: ${unresolvedCount}`
    ],
    color: payoutResult.alreadyProcessed ? 0x94a3b8 : 0x22c55e
  });
}

async function ensureLootSplitChannelRole(
  interaction: ChatInputCommandInteraction
): Promise<{ id: string; name: string } | null> {
  const guild = interaction.guild;
  const channelName =
    interaction.channel && "name" in interaction.channel ? String(interaction.channel.name ?? "") : "";
  if (!guild || !channelName) {
    return null;
  }

  const roleName = buildLootSplitRoleName(channelName);
  if (!roleName) {
    return null;
  }

  const existing =
    guild.roles.cache.find((role) => role.name.toLowerCase() === roleName.toLowerCase()) ?? null;
  if (existing) {
    return {
      id: existing.id,
      name: existing.name
    };
  }

  try {
    const created = await guild.roles.create({
      name: roleName,
      reason: `Loot split generado desde #${channelName}`
    });
    return {
      id: created.id,
      name: created.name
    };
  } catch {
    return null;
  }
}

function buildLootSplitRoleName(channelName: string): string {
  const normalized = channelName
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9/]/g, "")
    .slice(0, 100);

  return normalized;
}

async function handleBalanceCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const requestedDiscordUser = interaction.options.getUser("usuario");
  const actorUserId = await resolveActorUserId(interaction);
  const isSelfQuery = !requestedDiscordUser || requestedDiscordUser.id === interaction.user.id;

  if (!isSelfQuery) {
    if (
      !(await requireDiscordRoles(
        interaction,
        staffRoleIds,
        "Solo Staff puede consultar el balance de otros usuarios."
      ))
    ) {
      return;
    }
  }

  let targetUserId: string | null = actorUserId;
  let targetDisplayName = interaction.user.username;
  let targetAvatarUrl = interaction.user.displayAvatarURL({ size: 256 });

  if (!isSelfQuery && requestedDiscordUser) {
    const target = await repository.getUserByDiscordId(requestedDiscordUser.id);
    if (!target) {
      await interaction.reply({
        content: "No se encontro usuario web enlazado para ese usuario de Discord.",
        ephemeral: true
      });
      return;
    }
    targetUserId = target.id;
    targetDisplayName = target.displayName;
    targetAvatarUrl = requestedDiscordUser.displayAvatarURL({ size: 256 });
  } else if (!targetUserId) {
    await interaction.reply({
      content: "Tu usuario Discord no esta enlazado en web.",
      ephemeral: true
    });
    return;
  }

  const account = await repository.getWalletAccount(targetUserId);
  const embed = new EmbedBuilder()
    .setColor(0x00b3ff)
    .setAuthor({
      name: targetDisplayName,
      iconURL: targetAvatarUrl
    })
    .setTitle("Balance")
    .addFields({ name: "Cash", value: `🪙 ${formatMoney(account.cashBalance)}`, inline: true });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRetirarCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      staffRoleIds,
      "Solo Staff puede usar /retirar."
    ))
  ) {
    return;
  }

  const targetDiscordUser = interaction.options.getUser("usuario", true);
  const amount = interaction.options.getInteger("cantidad", true);

  const target = await repository.getUserByDiscordId(targetDiscordUser.id);

  if (!target) {
    await interaction.reply({
      content: "No se encontro usuario web enlazado para ese usuario de Discord."
    });
    return;
  }

  try {
    const actorUserId = await resolveActorUserId(interaction);
    const tx = await repository.addWalletTransaction({
      userId: target.id,
      cashDelta: -amount,
      reason: "manual_withdraw",
      createdBy: actorUserId ?? undefined,
      metadata: {
        byDiscordId: interaction.user.id,
        byTag: interaction.user.tag
      }
    });

    const actorName = interaction.member && "displayName" in interaction.member
      ? String(interaction.member.displayName ?? interaction.user.username)
      : interaction.user.username;
    const embed = new EmbedBuilder()
      .setColor(0xff7a7a)
      .setTitle("💸 Retiro aplicado")
      .addFields(
        { name: "Usuario", value: target.displayName, inline: true },
        { name: "Cantidad", value: `-${formatMoney(amount)}`, inline: true },
        { name: "Nuevo balance", value: formatMoney(tx.cashBalanceAfter), inline: true },
        { name: "Ejecutado por", value: actorName, inline: true }
      )
      .setTimestamp(new Date());

    await interaction.reply({
      embeds: [embed]
    });

    await sendEconomyAuditLog({
      action: "retirar",
      interaction,
      summary: `Retiro aplicado a ${target.displayName}.`,
      details: [
        `Usuario: ${target.displayName}`,
        `Cantidad: -${formatMoney(amount)}`,
        `Balance resultante: ${formatMoney(tx.cashBalanceAfter)}`
      ],
      color: 0xef4444
    });
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `No se pudo retirar: ${error.message}`
          : "No se pudo retirar por saldo insuficiente."
    });
  }
}

async function handlePagarCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      staffRoleIds,
      "Solo Staff puede usar /pagar."
    ))
  ) {
    return;
  }

  const targetDiscordUser = interaction.options.getUser("usuario", true);
  const amount = interaction.options.getInteger("cantidad", true);
  const target = await repository.getUserByDiscordId(targetDiscordUser.id);

  if (!target) {
    await interaction.reply({
      content: "No se encontro usuario web enlazado para ese usuario de Discord.",
      ephemeral: true
    });
    return;
  }

  const actorUserId = await resolveActorUserId(interaction);
  const tx = await repository.addWalletTransaction({
    userId: target.id,
    cashDelta: amount,
    reason: "manual_pay",
    createdBy: actorUserId ?? undefined,
    metadata: {
      byDiscordId: interaction.user.id,
      byTag: interaction.user.tag
    }
  });

  await interaction.reply({
    content: `Pago aplicado a ${target.displayName}: +${formatMoney(amount)}. Nuevo cash: ${formatMoney(tx.cashBalanceAfter)}.`,
    ephemeral: true
  });

  await sendEconomyAuditLog({
    action: "pagar",
    interaction,
    summary: `Pago aplicado a ${target.displayName}.`,
    details: [
      `Usuario: ${target.displayName}`,
      `Cantidad: +${formatMoney(amount)}`,
      `Balance resultante: ${formatMoney(tx.cashBalanceAfter)}`
    ],
    color: 0x22c55e
  });
}

async function handleRetirarDineroRolCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      staffRoleIds,
      "Solo Staff puede usar /retirar_dinero_rol."
    ))
  ) {
    return;
  }

  const roleId = interaction.options.getString("rol", true);
  const amount = interaction.options.getInteger("cantidad", true);
  const actorUserId = await resolveActorUserId(interaction);

  const guild =
    interaction.guild ?? (guildId ? await client.guilds.fetch(guildId).catch(() => null) : null);
  if (!guild) {
    await interaction.reply({
      content: "No se pudo resolver el servidor de Discord.",
      ephemeral: true
    });
    return;
  }

  const role = await guild.roles.fetch(roleId).catch(() => null);
  if (!role || role.id === guild.id) {
    await interaction.reply({
      content: "No se encontro el rol objetivo en Discord.",
      ephemeral: true
    });
    return;
  }

  const guildMembers = await guild.members.fetch();
  const targetDiscordMembers = guildMembers.filter(
    (member) => !member.user.bot && member.roles.cache.has(role.id)
  );
  if (targetDiscordMembers.size === 0) {
    await interaction.reply({
      content: `No hay miembros en Discord con el rol ${role.name}.`,
      ephemeral: true
    });
    return;
  }

  const [accounts, users] = await Promise.all([
    repository.listWalletAccounts(),
    repository.getUsers()
  ]);
  const accountByUserId = new Map(accounts.map((entry) => [entry.userId, entry]));
  const userByDiscordId = new Map(
    users
      .filter((entry) => Boolean(entry.discordId))
      .map((entry) => [entry.discordId as string, entry])
  );

  const withdrawn: string[] = [];
  const skippedInsufficient: string[] = [];
  const skippedUnlinked: string[] = [];

  for (const discordMember of targetDiscordMembers.values()) {
    const webUser = userByDiscordId.get(discordMember.id);
    if (!webUser) {
      skippedUnlinked.push(discordMember.displayName);
      continue;
    }

    const account = accountByUserId.get(webUser.id);
    const displayName = webUser.displayName ?? discordMember.displayName;
    const balance = account?.cashBalance ?? 0;

    if (balance < amount) {
      skippedInsufficient.push(displayName);
      continue;
    }

    await repository.addWalletTransaction({
      userId: webUser.id,
      cashDelta: -amount,
      reason: "bulk_role_withdraw",
      createdBy: actorUserId ?? undefined,
      metadata: {
        roleId: role.id,
        roleName: role.name,
        byDiscordId: interaction.user.id,
        byTag: interaction.user.tag
      }
    });
    withdrawn.push(displayName);
  }

  const totalWithdrawn = withdrawn.length * amount;
  const embed = new EmbedBuilder()
    .setColor(0xffb36b)
    .setTitle("🏦 Retiro masivo por rol")
    .addFields(
      { name: "Rol", value: role.name, inline: true },
      { name: "Cantidad por miembro", value: `-${formatMoney(amount)}`, inline: true },
      { name: "Total retirado", value: formatMoney(totalWithdrawn), inline: true },
      { name: "✅ Aplicados", value: String(withdrawn.length), inline: true },
      { name: "⚠️ No enlazados", value: String(skippedUnlinked.length), inline: true },
      { name: "⚠️ Sin saldo", value: String(skippedInsufficient.length), inline: true }
    )
    .setTimestamp(new Date());

  const details = [
    withdrawn.length > 0
      ? `**Aplicados:** ${withdrawn.slice(0, 20).join(", ")}${withdrawn.length > 20 ? "…" : ""}`
      : "",
    skippedUnlinked.length > 0
      ? `**No enlazados:** ${skippedUnlinked.slice(0, 20).join(", ")}${skippedUnlinked.length > 20 ? "…" : ""}`
      : "",
    skippedInsufficient.length > 0
      ? `**Sin saldo:** ${skippedInsufficient.slice(0, 20).join(", ")}${skippedInsufficient.length > 20 ? "…" : ""}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  await interaction.reply({
    embeds: [embed],
    content: details || undefined,
    ephemeral: true
  });

  await sendEconomyAuditLog({
    action: "retirar_dinero_rol",
    interaction,
    summary: `Retiro masivo aplicado al rol ${role.name}.`,
    details: [
      `Rol: ${role.name}`,
      `Cantidad por miembro: -${formatMoney(amount)}`,
      `Aplicados: ${withdrawn.length}`,
      `No enlazados: ${skippedUnlinked.length}`,
      `Sin saldo: ${skippedInsufficient.length}`,
      `Total retirado: ${formatMoney(totalWithdrawn)}`
    ],
    color: 0xf97316
  });
}

async function handleEconomiaCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      staffRoleIds,
      "Solo Staff puede usar /economia."
    ))
  ) {
    return;
  }

  const accounts = await repository.listWalletAccounts();
  const totalCash = accounts.reduce((sum, entry) => sum + entry.cashBalance, 0);

  await interaction.reply({
    content: [
      "📊 **Economia global**",
      `Usuarios con cuenta: ${accounts.length}`,
      `Cash total: ${formatMoney(totalCash)}`
    ].join("\n"),
    ephemeral: true
  });
}

async function handleResetEconomiaCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      staffRoleIds,
      "Solo Staff puede usar /reset_economia."
    ))
  ) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const actorUserId = await resolveActorUserId(interaction);
  const accounts = await repository.listWalletAccounts();
  let touched = 0;

  for (const account of accounts) {
    if (account.cashBalance !== 0 || account.bankBalance !== 0) {
      await repository.addWalletTransaction({
        userId: account.userId,
        cashDelta: -account.cashBalance,
        bankDelta: -account.bankBalance,
        reason: "economy_reset",
        createdBy: actorUserId ?? undefined,
        metadata: {
          byDiscordId: interaction.user.id,
          byTag: interaction.user.tag
        }
      });
      touched += 1;
    }
  }

  await interaction.editReply(
    `Reset completado. Cuentas actualizadas a 0: ${touched}/${accounts.length}.`
  );

  await sendEconomyAuditLog({
    action: "reset_economia",
    interaction,
    summary: `Reset de economia ejecutado.`,
    details: [
      `Cuentas actualizadas: ${touched}/${accounts.length}`,
      `Balance total previo aprox: ${formatMoney(accounts.reduce((sum, entry) => sum + entry.cashBalance + entry.bankBalance, 0))}`
    ],
    color: 0xf59e0b
  });
}

async function handleFase2Command(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await requireDiscordRoles(
      interaction,
      phase2AllowedRoleIds,
      "Solo Staff o Reclutador puede usar /fase2."
    ))
  ) {
    return;
  }

  const channel = interaction.channel;
  if (!channel?.isTextBased() || !("send" in channel)) {
    await interaction.reply({
      content: "Este comando solo se puede usar en un canal de texto.",
      ephemeral: true
    });
    return;
  }

  await channel.send(
    `Enhorabuena has pasado a la Fase 2: ahora el <@&${staffRoleIds[0]}> valorará tu apply.`
  );
  await interaction.reply({
    content: "Mensaje de Fase 2 enviado.",
    ephemeral: true
  });
}

async function handleEventRegisterCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const description = interaction.options.getString("descripcion", true).trim();
  const mapName = interaction.options.getString("mapa", true).trim();
  const remainingRaw = interaction.options.getString("cuanto_queda", true).trim();
  const remainingMs = parseRemainingDuration(remainingRaw);

  if (!remainingMs) {
    await interaction.reply({
      content: "Formato invalido en `cuanto_queda`. Usa por ejemplo: `3h`, `2h30m`, `90m`.",
      ephemeral: true
    });
    return;
  }

  const targetUtc = new Date(Date.now() + remainingMs).toISOString();
  const actorName =
    interaction.member && "displayName" in interaction.member
      ? String(interaction.member.displayName ?? interaction.user.username)
      : interaction.user.username;

  const event = await createScheduledEventCompat({
    description,
    mapName,
    targetUtc,
    createdByDiscordId: interaction.user.id,
    createdByDisplayName: actorName
  });

  await interaction.reply({
    content: [
      "Evento registrado.",
      `ID: \`${event.id.slice(0, 8)}\``,
      `Queda: ${formatEventRemainingLabel(event.targetUtc)} (${formatEventUtcTime(event.targetUtc)})`
    ].join("\n"),
    ephemeral: true
  });
}

async function handleEventDeleteCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const requestedId = interaction.options.getString("id", true).trim().toLowerCase();
  const events = await getScheduledEventsCompat();
  const matches = events.filter(
    (entry) =>
      entry.id.toLowerCase() === requestedId || entry.id.toLowerCase().startsWith(requestedId)
  );

  if (matches.length === 0) {
    await interaction.reply({
      content: "No existe ningun evento con ese ID.",
      ephemeral: true
    });
    return;
  }

  if (matches.length > 1) {
    await interaction.reply({
      content: "El ID es ambiguo. Indica mas caracteres.",
      ephemeral: true
    });
    return;
  }

  const event = matches[0];
  if (event.createdByDiscordId !== interaction.user.id) {
    const canDeleteAny = await requireDiscordRoles(
      interaction,
      staffRoleIds,
      "Solo el creador o Staff puede eliminar este evento."
    );
    if (!canDeleteAny) {
      return;
    }
  }

  const deleted = await deleteScheduledEventCompat(event.id);
  await interaction.reply({
    content: deleted
      ? `Evento eliminado: \`${event.id.slice(0, 8)}\` (${event.mapName} / ${event.description}).`
      : "No se pudo eliminar el evento.",
    ephemeral: true
  });
}

async function handleEventsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const now = Date.now();
  const events = (await getScheduledEventsCompat())
    .filter((entry) => Date.parse(entry.targetUtc) > now)
    .sort((left, right) => Date.parse(left.targetUtc) - Date.parse(right.targetUtc));

  await interaction.reply({
    embeds: [buildEventsEmbed(events)],
    ephemeral: false
  });
}

function extractBattleIdsFromLink(link: string): string[] {
  const normalized = link.trim();
  const fromIdsQuery = normalized.match(/ids=([0-9,]+)/i)?.[1] ?? "";
  if (fromIdsQuery) {
    return [...new Set(fromIdsQuery.split(",").map((entry) => entry.trim()).filter(Boolean))];
  }

  const fromPath = normalized.match(/multi:ids:([0-9,]+)/i)?.[1] ?? "";
  if (fromPath) {
    return [...new Set(fromPath.split(",").map((entry) => entry.trim()).filter(Boolean))];
  }

  const singleBattleId = normalized.match(/\/battles\/([0-9]+)(?:[/?#]|$)/i)?.[1] ?? "";
  if (singleBattleId) {
    return [singleBattleId];
  }

  return [];
}

function extractMockNamesFromLink(link: string): string[] {
  const normalized = link.trim();
  const explicitMockPayload = normalized.match(/^mock\s*:\s*(.+)$/i)?.[1]?.trim() ?? "";
  const directNamesPayload =
    !normalized.includes("http") &&
    !normalized.includes("ids=") &&
    !normalized.includes("/battles/")
      ? normalized
      : "";

  const payload = explicitMockPayload || directNamesPayload;
  if (!payload) {
    return [];
  }

  return [
    ...new Set(
      payload
        .split(/[,\n;]/g)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  ];
}

async function collectUniqueGuildPlayersFromBattles(
  battleIds: string[],
  guildName: string
): Promise<Set<string>> {
  const target = guildName.trim().toLowerCase();
  const matchAllGuilds = target === "all" || target === "*";
  const uniqueNames = new Set<string>();

  for (const battleId of battleIds) {
    const detail = await killboardClient.fetchGuildBattleDetail({
      battleId,
      guildName
    });
    if (!detail) {
      continue;
    }

    for (const player of detail.players) {
      const playerGuild = player.guildName?.trim().toLowerCase();
      const playerName = player.name?.trim();
      if (!playerName) {
        continue;
      }
      if (!matchAllGuilds && (!playerGuild || playerGuild !== target)) {
        continue;
      }
      uniqueNames.add(playerName);
    }
  }

  return uniqueNames;
}

async function resolveActorUserId(
  interaction: ChatInputCommandInteraction
): Promise<string | null> {
  const user = await repository.getUserByDiscordId(interaction.user.id);
  return user?.id ?? null;
}

async function resolvePaidUsers(
  entries: Array<{ userId: string }>
): Promise<Array<{ userId: string; discordId: string }>> {
  const users = await repository.getUsers();
  const byId = new Map(users.map((entry) => [entry.id, entry]));
  const resolved: Array<{ userId: string; discordId: string }> = [];
  for (const entry of entries) {
    const user = byId.get(entry.userId);
    if (!user) {
      continue;
    }
    resolved.push({
      userId: entry.userId,
      discordId: user.discordId
    });
  }
  return resolved;
}

async function assignRoleToPaidUsers(
  interaction: ChatInputCommandInteraction,
  roleId: string,
  users: Array<{ userId: string; discordId: string }>
): Promise<{ assigned: number; failed: number }> {
  const guild = interaction.guild;
  if (!guild) {
    return { assigned: 0, failed: users.length };
  }

  let assigned = 0;
  let failed = 0;
  for (const user of users) {
    try {
      const member = await guild.members.fetch(user.discordId);
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId, "Loot split payout auto-role");
      }
      assigned += 1;
    } catch {
      failed += 1;
    }
  }
  return { assigned, failed };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, value));
}

async function sendEconomyAuditLog(input: {
  action: string;
  interaction: ChatInputCommandInteraction;
  summary: string;
  details?: string[];
  color?: number;
}): Promise<void> {
  if (!economyAuditChannelId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(economyAuditChannelId).catch(() => null);
    if (!channel?.isTextBased() || !("send" in channel)) {
      return;
    }

    const location =
      input.interaction.channel && "id" in input.interaction.channel
        ? `<#${input.interaction.channel.id}>`
        : "Canal no disponible";

    const embed = new EmbedBuilder()
      .setColor(input.color ?? 0xf0c64f)
      .setTitle(`Economia · ${input.action}`)
      .setDescription(input.summary)
      .addFields(
        { name: "Ejecutado por", value: `<@${input.interaction.user.id}> (${input.interaction.user.tag})`, inline: true },
        { name: "Canal", value: location, inline: true }
      )
      .setTimestamp(new Date());

    if (input.details && input.details.length > 0) {
      embed.addFields({
        name: "Detalle",
        value: input.details.join("\n").slice(0, 1024)
      });
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Economy audit log failed", error);
  }
}

function buildLootSplitIdempotencyKey(input: {
  battleIds: string[];
  guildName: string;
  splitRole: string;
  estValue: number;
  bags: number;
  repairCost: number;
  taxPercent: number;
  participantUserIds: string[];
  participantNames: string[];
}): string {
  const payload = JSON.stringify({
    battleIds: [...new Set(input.battleIds)].sort(),
    guildName: input.guildName.trim().toLowerCase(),
    splitRole: input.splitRole.trim().toUpperCase(),
    estValue: input.estValue,
    bags: input.bags,
    repairCost: input.repairCost,
    taxPercent: input.taxPercent,
    participantUserIds: [...new Set(input.participantUserIds)].sort(),
    participantNames: [...new Set(input.participantNames.map((name) => normalizeAlbionNameForMatch(name)))].sort()
  });

  return createHash("sha256").update(payload).digest("hex");
}

function normalizeAlbionNameForMatch(value?: string): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function formatReceiptRow(label: string, value: string): string {
  const left = label.padEnd(16, " ");
  return `${left} : ${value}`;
}

function formatReceiptDivider(): string {
  return "------------------------------";
}

async function syncDiscordGuildRole(discordId: string, member: { id: string; status: MemberStatus }) {
  if (!guildId) {
    await repository.setMemberDiscordRoleStatus(member.id, undefined);
    return;
  }

  const guild = await client.guilds.fetch(guildId);
  const guildMember = await guild.members.fetch(discordId);
  const nextRoleId = getDiscordRoleIdForStatus(member.status);

  if (member.status === "COUNCIL" && !nextRoleId) {
    await repository.setMemberDiscordRoleStatus(member.id, "COUNCIL");
    return;
  }

  if (!nextRoleId) {
    await replaceManagedRoles(guildMember);
    await repository.setMemberDiscordRoleStatus(member.id, undefined);
    return;
  }

  await replaceManagedRoles(guildMember, nextRoleId);
  await repository.setMemberDiscordRoleStatus(member.id, member.status);
}

async function replaceManagedRoles(guildMember: GuildMember, nextRoleId?: string) {
  const roleIdsToRemove = [
    ...Object.values(activeRoleIds).filter((roleId): roleId is string => Boolean(roleId)),
    ...managementRoleIds
  ];
  const nextRoles = guildMember.roles.cache
    .filter((role) => !roleIdsToRemove.includes(role.id))
    .map((role) => role.id);

  if (nextRoleId && !nextRoles.includes(nextRoleId)) {
    nextRoles.push(nextRoleId);
  }

  await guildMember.roles.set(nextRoles);
}

function getDiscordRoleIdForStatus(status: MemberStatus): string | undefined {
  if (status === "COUNCIL") {
    return managementRoleIds[0];
  }

  if (status === "TRIAL") {
    return activeRoleIds.TRIAL;
  }

  if (status === "CORE") {
    return activeRoleIds.CORE;
  }

  if (status === "BENCHED") {
    return activeRoleIds.BENCHED;
  }

  return undefined;
}

function getStatusFromDiscordRoles(guildMember: GuildMember): MemberStatus | undefined {
  if (managementRoleIds.some((roleId) => guildMember.roles.cache.has(roleId))) {
    return "COUNCIL";
  }

  if (activeRoleIds.CORE && guildMember.roles.cache.has(activeRoleIds.CORE)) {
    return "CORE";
  }

  if (activeRoleIds.BENCHED && guildMember.roles.cache.has(activeRoleIds.BENCHED)) {
    return "BENCHED";
  }

  if (activeRoleIds.TRIAL && guildMember.roles.cache.has(activeRoleIds.TRIAL)) {
    return "TRIAL";
  }

  return undefined;
}

function memberNeedsDiscordSync(member: { status: MemberStatus; discordRoleStatus?: MemberStatus }) {
  const expectedRoleId = getDiscordRoleIdForStatus(member.status);

  if (member.status === "COUNCIL" && !expectedRoleId) {
    return member.discordRoleStatus !== "COUNCIL";
  }

  if (!expectedRoleId) {
    return Boolean(member.discordRoleStatus);
  }

  return member.discordRoleStatus !== member.status;
}

function formatMemberStatus(status?: MemberStatus): string {
  return status ?? "NONE";
}

async function ensureCtaReminders() {
  try {
    const ctas = await repository.getCtas();
    const now = Date.now();

    for (const cta of ctas) {
      if (cta.status !== "OPEN") {
        continue;
      }

      const ctaTime = new Date(cta.datetimeUtc).getTime();
      if (Number.isNaN(ctaTime)) {
        continue;
      }

      const createdAtRaw = (cta as CTA & { createdAt?: string }).createdAt;
      const createdAtMs = createdAtRaw ? Date.parse(createdAtRaw) : Number.NaN;
      const createdDiff = now - createdAtMs;
      const createdKey = `${cta.id}:created`;
      if (
        Number.isFinite(createdAtMs) &&
        createdDiff >= 0 &&
        createdDiff <= 5 * 60 * 1000 &&
        !sentCtaReminders.has(createdKey)
      ) {
        await sendCtaReminderMessage(cta.title, formatCtaCountdownLabel(cta.datetimeUtc));
        sentCtaReminders.add(createdKey);
      }

      for (const threshold of ctaReminderThresholds) {
        const key = `${cta.id}:${threshold.label}`;
        if (sentCtaReminders.has(key)) {
          continue;
        }

        const diff = ctaTime - now;
        if (diff < 0) {
          sentCtaReminders.add(key);
          continue;
        }

        if (Math.abs(diff - threshold.ms) > ctaReminderToleranceMs) {
          continue;
        }

        await sendCtaReminderMessage(cta.title, threshold.label);
        sentCtaReminders.add(key);
      }
    }

    for (const key of [...sentCtaReminders]) {
      const [ctaId] = key.split(":");
      const cta = ctas.find((entry) => entry.id === ctaId);
      if (!cta) {
        sentCtaReminders.delete(key);
        continue;
      }
      const ctaTime = new Date(cta.datetimeUtc).getTime();
      if (Number.isNaN(ctaTime) || ctaTime + 6 * 60 * 60 * 1000 < now) {
        sentCtaReminders.delete(key);
      }
    }
  } catch (error) {
    console.error("CTA reminders failed", error);
  }
}

async function ensureScheduledEventsReminder(force = false) {
  try {
    const now = Date.now();
    const allEvents = await getScheduledEventsCompat();
    const activeEvents: ScheduledEventRecord[] = [];

    for (const event of allEvents) {
      const targetMs = Date.parse(event.targetUtc);
      if (!Number.isFinite(targetMs)) {
        continue;
      }
      if (targetMs < now - 30 * 60 * 1000) {
        await deleteScheduledEventCompat(event.id);
        continue;
      }
      if (targetMs >= now) {
        activeEvents.push(event);
      }
    }

    if (activeEvents.length === 0) {
      return;
    }

    activeEvents.sort((left, right) => Date.parse(left.targetUtc) - Date.parse(right.targetUtc));

    const hourKey = new Date().toISOString().slice(0, 13);
    if (!force && lastScheduledEventsReminderHour === hourKey) {
      return;
    }

    const channel = await client.channels.fetch(scheduledEventsReminderChannelId).catch(() => null);
    if (!channel?.isTextBased() || !("send" in channel)) {
      return;
    }

    await channel.send({
      embeds: [buildEventsEmbed(activeEvents)]
    });
    lastScheduledEventsReminderHour = hourKey;
  } catch (error) {
    console.error("Scheduled events reminders failed", error);
  }
}

async function reconcileGuildRoleSync() {
  if (!guildId) {
    return;
  }

  const [members, users] = await Promise.all([repository.getMembers(), repository.getUsers()]);
  const usersById = new Map(users.map((user) => [user.id, user]));

  for (const member of members) {
    if (!memberNeedsDiscordSync(member)) {
      continue;
    }

    const user = usersById.get(member.userId);
    if (!user) {
      continue;
    }

    try {
      await syncDiscordGuildRole(user.discordId, member);
    } catch (error) {
      console.error(`Web -> Discord sync failed for ${user.displayName}`, error);
    }
  }
}

async function syncWebStatusFromDiscordMember(guildMember: GuildMember) {
  const user = await repository.getUserByDiscordId(guildMember.user.id);
  if (!user) {
    return;
  }

  const nextStatus = getStatusFromDiscordRoles(guildMember);
  let member = await repository.getMemberByUserId(user.id);

  if (!member && nextStatus) {
    member = await repository.createMember(user.id, nextStatus);
    await repository.setMemberDiscordRoleStatus(member.id, nextStatus);
    const application = await repository.getRecruitmentApplicationByUserId(user.id);
    if (application) {
      await repository.updateRecruitmentApplicationStatus(application.id, "APPROVED");
    }
    return;
  }

  if (!member) {
    return;
  }

  if (member.kickedAt) {
    if (nextStatus) {
      await replaceManagedRoles(guildMember);
    }
    await repository.setMemberDiscordRoleStatus(member.id, undefined);
    return;
  }

  if (!nextStatus) {
    await repository.setMemberDiscordRoleStatus(member.id, undefined);
    return;
  }

  if (member.status !== nextStatus) {
    await repository.updateMemberStatus(member.id, nextStatus);
  }

  await repository.setMemberDiscordRoleStatus(member.id, nextStatus);
  const application = await repository.getRecruitmentApplicationByUserId(user.id);
  if (application) {
    await repository.updateRecruitmentApplicationStatus(application.id, "APPROVED");
  }
}

async function ensureRecruitmentTickets() {
  if (!guildId) {
    return;
  }

  const pendingApplications = await repository.listTicketPendingRecruitmentApplications();
  if (pendingApplications.length === 0) {
    return;
  }

  const guild = await client.guilds.fetch(guildId);
  let recruitmentParentId: Snowflake | undefined;
  if (recruitmentCategoryId) {
    const parentChannel = await guild.channels.fetch(recruitmentCategoryId).catch(() => null);
    if (parentChannel?.type === ChannelType.GuildCategory) {
      recruitmentParentId = parentChannel.id;
    } else {
      console.error(
        `Recruitment category ${recruitmentCategoryId} is missing or is not a category. Ticket will be created without parent category.`
      );
    }
  }

  for (const application of pendingApplications) {
    try {
      const user = await repository.getUserById(application.userId);
      if (!user) {
        continue;
      }

      const guildMember = await guild.members.fetch(user.discordId).catch(() => null);
      if (!guildMember) {
        console.error(
          `Recruitment ticket for ${user.displayName}: Discord member not found in guild. Creating staff-only ticket.`
        );
      }

      const channel = await guild.channels.create({
        name: buildRecruitmentChannelName(application.displayName, application.id),
        type: ChannelType.GuildText,
        parent: recruitmentParentId,
        permissionOverwrites: buildRecruitmentOverwrites(guild, guildMember)
      });

      const recruitmentEmbed = new EmbedBuilder()
        .setColor(0xd8a628)
        .setTitle("Nuevo ticket de reclutamiento")
        .setDescription(
          "Solicitud recibida desde la web. Revisad el perfil y decidid el estado en Discord para sincronizar acceso."
        );

      const parsed = parseRecruitmentApplicationDetails(application);

      recruitmentEmbed.addFields(
        {
          name: "Usuario",
          value: `<@${user.discordId}>`,
          inline: true
        },
        {
          name: "Nombre (web)",
          value: application.displayName || "No especificado",
          inline: true
        },
        {
          name: "Discord ID",
          value: user.discordId,
          inline: true
        },
        {
          name: "Albion Name",
          value: user.albionName || "No especificado",
          inline: true
        },
        {
          name: "Disponibilidad UTC",
          value: application.timezone || "No especificado",
          inline: false
        },
        {
          name: "Rol principal",
          value: application.mainRole || "No especificado",
          inline: false
        },
        {
          name: "Rol secundario",
          value: parsed.secondaryRole,
          inline: false
        },
        {
          name: "Gremios anteriores",
          value: parsed.previousGuilds,
          inline: false
        },
        {
          name: "Vouch",
          value: parsed.vouch,
          inline: false
        },
        {
          name: "⚠️ IMPORTANTE",
          value: "**Postea en este ticket una screenshot de tus stats y vods.**",
          inline: false
        }
      );

      recruitmentEmbed
        .setFooter({
          text: "Accion requerida: asignar Trial/Core/Benched/Staff en Discord para sincronizar web"
        })
        .setTimestamp(new Date(application.createdAt));

      await channel.send({
        content: `<@${user.discordId}>`,
        embeds: [recruitmentEmbed]
      });

      await repository.markRecruitmentApplicationTicketOpened(application.id, channel.id);
    } catch (error) {
      console.error(`Recruitment ticket failed for application ${application.id}`, error);
    }
  }
}

function parseRecruitmentApplicationDetails(application: {
  zvzExperience?: string;
  notes?: string;
}) {
  const base = {
    secondaryRole: "No especificado",
    previousGuilds: "No especificado",
    vouch: "No especificado"
  };

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const rawExperience = application.zvzExperience?.trim() ?? "";
  const rawNotes = application.notes?.trim() ?? "";
  const lines = rawExperience
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parts = line.split(":");
    if (parts.length < 2) {
      continue;
    }

    const key = normalize(parts[0] ?? "");
    const value = parts.slice(1).join(":").trim();
    if (!value) {
      continue;
    }

    if (key.includes("rol secundario")) {
      base.secondaryRole = value;
      continue;
    }
    if (key.includes("gremios anteriores") || key.includes("guilds anteriores")) {
      base.previousGuilds = value;
      continue;
    }
  }

  if (rawNotes) {
    const notesValue = rawNotes.replace(/^vouch\s*:\s*/i, "").trim();
    base.vouch = notesValue || "No especificado";
  }

  return base;
}

async function handleCtaSignupSelect(interaction: StringSelectMenuInteraction) {
  const [, ctaId] = interaction.customId.split(":");
  const cta = await repository.getCtaById(ctaId);
  if (!cta) {
    await interaction.reply({ content: "CTA no encontrada.", ephemeral: true });
    return;
  }

  if (cta.status === "FINALIZED") {
    await interaction.reply({ content: "Esta CTA ya esta finalizada.", ephemeral: true });
    return;
  }

  const user = await repository.getUserByDiscordId(interaction.user.id);
  if (!user) {
    await interaction.reply({ content: "Tu usuario Discord no esta enlazado en la web.", ephemeral: true });
    return;
  }

  const member = await repository.getMemberByUserId(user.id);
  if (
    !member ||
    (member.status !== "TRIAL" &&
      member.status !== "CORE" &&
      member.status !== "COUNCIL") ||
    member.discordRoleStatus !== member.status
  ) {
    await interaction.reply({
      content: "Necesitas estar sincronizado como miembro real de guild para apuntarte.",
      ephemeral: true
    });
    return;
  }

  const comp = cta.compId ? await repository.getCompById(cta.compId) : null;
  if (!comp) {
    await interaction.reply({ content: "La comp vinculada a esta CTA ya no existe.", ephemeral: true });
    return;
  }

  const value = interaction.values[0];
  if (value === "__clear__") {
    await repository.deleteCtaSignup(cta.id, member.id);
    await repository.deleteAttendance(cta.id, member.id);
    await refreshCtaSignupMessage(interaction.message.id, interaction.channelId);
    await interaction.reply({ content: "Te has quitado del signup.", ephemeral: true });
    return;
  }

  const selectedSlot = buildCtaSignupSlots(comp).find((slot) => slot.key === value);
  if (!selectedSlot) {
    await interaction.reply({ content: "Slot no valido para esta CTA.", ephemeral: true });
    return;
  }

  await repository.upsertCtaSignup({
    ctaId: cta.id,
    memberId: member.id,
    role: selectedSlot.role,
    slotKey: selectedSlot.key,
    slotLabel: selectedSlot.label,
    weaponName: selectedSlot.weaponName,
    playerName: user.albionName?.trim() || user.displayName
  });
  await repository.upsertAttendance({
    ctaId: cta.id,
    memberId: member.id,
    decision: "YES",
    state: "ABSENT"
  });

  await refreshCtaSignupMessage(interaction.message.id, interaction.channelId);
  await interaction.reply({
    content: `Apuntado como ${selectedSlot.label} - ${selectedSlot.weaponName}.`,
    ephemeral: true
  });
}

function buildRecruitmentChannelName(displayName: string, applicationId: string): string {
  const normalizedName =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "applicant";

  return `recruit-${normalizedName}-${applicationId.slice(0, 6)}`;
}

function buildRecruitmentOverwrites(guild: Guild, guildMember: GuildMember | null) {
  const overwrites: Array<{
    id: string;
    type: OverwriteType;
    allow?: bigint[];
    deny?: bigint[];
  }> = [
    {
      id: guild.roles.everyone.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel]
    }
  ];

  if (guildMember) {
    overwrites.push({
      id: guildMember.id,
      type: OverwriteType.Member,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    });
  }

  for (const roleId of managementRoleIds) {
    if (!guild.roles.cache.has(roleId)) {
      continue;
    }

    overwrites.push({
      id: roleId,
      type: OverwriteType.Role,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels
      ]
    });
  }

  return overwrites;
}

function buildCtaSignupSlots(comp: CompRecord): CtaSignupSlot[] {
  let index = 0;

  return comp.parties.flatMap((party) =>
    party.slots.map((slot) => {
      const emoji = formatCtaSlotMarker(index + 1);
      index += 1;

      return {
        key: `${party.key}:${slot.position}`,
        partyKey: party.key,
        partyName: party.name,
        label: slot.label,
        role: slot.role as CtaCompRole,
        weaponName: slot.weaponName,
        emoji
      };
    })
  );
}

function buildCtaSignupMessagePayload(
  cta: NonNullable<Awaited<ReturnType<typeof repository.getCtaById>>>,
  comp: CompRecord,
  signups: CtaSignupRecord[],
  guild: Guild | null,
  options: { finalized?: boolean } = {}
) {
  const slots = buildCtaSignupSlots(comp);
  const totalSignedUp = signups.length;
  const embed = new EmbedBuilder()
    .setColor(options.finalized ? 0x5f6b7a : 0x232833)
    .setTitle(cta.title)
    .setDescription(
      options.finalized
        ? "CTA finalizada. El signup queda congelado con esta fotografia final."
        : "Usa el desplegable de tu party para reservar un slot. Solo puedes tener un slot activo por CTA."
    )
    .addFields(
      {
        name: "Fecha",
        value: formatShortUtcDate(cta.datetimeUtc),
        inline: true
      },
      {
        name: "Hora",
        value: formatShortUtcTime(cta.datetimeUtc),
        inline: true
      },
      {
        name: "Roster",
        value: String(totalSignedUp),
        inline: true
      }
    )
    .setFooter({
      text: comp.name
    })
    .setTimestamp(new Date(cta.datetimeUtc));

  for (const role of ctaRoleOrder) {
    const roleSlots = slots.filter((slot) => slot.role === role);
    if (roleSlots.length === 0) {
      continue;
    }

    embed.addFields({
      name: `${ctaRoleEmojiMap[role]} ${role}`,
      value: roleSlots
        .map((slot) => {
          const signup = signups.find((entry) => entry.slotKey === slot.key);
          return `${slot.weaponName}: ${signup?.playerName ?? "Sin asignar"}`;
        })
        .join("\n"),
      inline: true
    });
  }

  return {
    embeds: [embed],
    components: options.finalized ? [] : buildCtaSignupComponents(cta, comp, guild)
  };
}

function buildCtaSignupComponents(
  cta: NonNullable<Awaited<ReturnType<typeof repository.getCtaById>>>,
  comp: CompRecord,
  guild: Guild | null
) {
  return comp.parties.slice(0, 5).map((party) => {
    const options = party.slots.map((slot) => {
      const emoji = getWeaponMenuEmoji(guild, slot.weaponName);

      return {
        label: slot.label.slice(0, 100),
        description: `${slot.weaponName} | ${slot.role}`.slice(0, 100),
        value: `${party.key}:${slot.position}`,
        ...(emoji ? { emoji } : {})
      };
    });

    options.unshift({
      label: "Sin asignar",
      description: "Quita tu signup actual",
      value: "__clear__"
    });

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`cta-signup:${cta.id}:${party.key}`)
        .setPlaceholder(`Elegir slot en ${party.name}`)
        .addOptions(options)
    );
  });
}

function formatCtaSlotMarker(slotNumber: number): string {
  return `[${String(slotNumber).padStart(2, "0")}]`;
}

async function refreshCtaSignupMessage(messageId: string, channelId: string) {
  const [cta, channel] = await Promise.all([
    repository.getCtaBySignupMessageId(messageId),
    client.channels.fetch(channelId)
  ]);

  if (!cta || !channel?.isTextBased() || !("messages" in channel)) {
    return;
  }

  const comp = cta.compId ? await repository.getCompById(cta.compId) : null;
  if (!comp) {
    return;
  }

  const signups = await repository.getCtaSignups(cta.id);
  const message = await channel.messages.fetch(messageId).catch((error: { code?: number }) => {
    if (error?.code === 10008) {
      return null;
    }

    throw error;
  });
  if (!message) {
    return;
  }
  const guild = "guild" in channel ? channel.guild : null;
  await message.edit(
    buildCtaSignupMessagePayload(cta, comp, signups, guild, {
      finalized: cta.status === "FINALIZED"
    })
  );
}

function getWeaponEmojiToken(guild: Guild | null, weaponName: string): string {
  const emoji = findWeaponEmoji(guild, weaponName);
  return emoji ? `<:${emoji.name}:${emoji.id}>` : "•";
}

function getWeaponMenuEmoji(guild: Guild | null, weaponName: string) {
  const emoji = findWeaponEmoji(guild, weaponName);
  if (!emoji?.name) {
    return undefined;
  }

  return {
    id: emoji.id,
    name: emoji.name
  };
}

function findWeaponEmoji(guild: Guild | null, weaponName: string) {
  if (!guild) {
    return null;
  }

  const candidates = new Set([
    weaponName,
    weaponName.toLowerCase(),
    normalizeWeaponEmojiName(weaponName)
  ]);

  return (
    guild.emojis.cache.find((emoji) => {
      if (!emoji.name) {
        return false;
      }

      return candidates.has(emoji.name) || candidates.has(emoji.name.toLowerCase());
    }) ?? null
  );
}

function normalizeWeaponEmojiName(weaponName: string): string {
  return weaponName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatShortUtcDate(datetimeUtc: string): string {
  return new Date(datetimeUtc).toLocaleDateString("es-ES", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatShortUtcTime(datetimeUtc: string): string {
  return (
    new Date(datetimeUtc).toLocaleTimeString("es-ES", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }) + " UTC"
  );
}
