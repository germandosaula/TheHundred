import {
  ActionRowBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  OverwriteType,
  Partials,
  PermissionFlagsBits,
  PermissionsBitField,
  StringSelectMenuBuilder,
  SlashCommandBuilder
} from "discord.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Guild,
  GuildMember,
  StringSelectMenuInteraction
} from "discord.js";
import { createRepository, type CompRecord, type CtaSignupRecord } from "@thehundred/db";
import { assertOfficerOrAdmin, transitionCtaStatus, type MemberStatus } from "@thehundred/domain";
import { loadEnvFile } from "./load-env.ts";

loadEnvFile();

const repository = createRepository({
  provider: process.env.REPOSITORY_PROVIDER === "supabase" ? "supabase" : "memory",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
});
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const syncIntervalMs = Number(process.env.DISCORD_SYNC_INTERVAL_MS ?? "30000");
const recruitmentCategoryId = process.env.DISCORD_RECRUITMENT_CATEGORY_ID;
const councilRoleIds = (process.env.DISCORD_COUNCIL_ROLE_IDS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const activeRoleIds = {
  TRIAL: process.env.DISCORD_ROLE_TRIAL_ID,
  CORE: process.env.DISCORD_ROLE_CORE_ID,
  BENCHED: process.env.DISCORD_ROLE_BENCHED_ID
} as const;
const supabaseHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : "n/a";

const slotsCommand = new SlashCommandBuilder()
  .setName("slots")
  .setDescription("Shows the number of open guild slots");

const recruitCommand = new SlashCommandBuilder()
  .setName("recruit")
  .setDescription("Approves a linked Discord user for guild/private dashboard access")
  .addStringOption((option) =>
    option.setName("discord_id").setDescription("Discord user id").setRequired(true)
  );

const syncMemberCommand = new SlashCommandBuilder()
  .setName("syncmember")
  .setDescription("Syncs the Discord guild role from the current web guild status")
  .addStringOption((option) =>
    option.setName("discord_id").setDescription("Discord user id").setRequired(true)
  );

const createCtaCommand = new SlashCommandBuilder()
  .setName("crearcta")
  .setDescription("Crea una CTA vinculada a una composicion y publica el signup en este canal")
  .addStringOption((option) =>
    option
      .setName("hora_utc")
      .setDescription("Fecha y hora UTC. Ej: 2026-03-01 18:00")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("titulo").setDescription("Titulo de la CTA").setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("composicion")
      .setDescription("Comp creada en la web")
      .setRequired(true)
      .setAutocomplete(true)
  );

const finalizeCtaCommand = new SlashCommandBuilder()
  .setName("finalizarcta")
  .setDescription("Finaliza una CTA y congela el signup actual")
  .addStringOption((option) =>
    option
      .setName("cta")
      .setDescription("CTA abierta")
      .setRequired(true)
      .setAutocomplete(true)
  );

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

if (!token) {
  console.log("DISCORD_BOT_TOKEN is not configured. Bot bootstrap skipped.");
  process.exit(0);
}

console.log("[bot] startup config", {
  repositoryProvider: process.env.REPOSITORY_PROVIDER === "supabase" ? "supabase" : "memory",
  supabaseHost,
  guildId: guildId ?? "global"
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Message, Partials.Channel]
});

client.once("clientReady", async () => {
  if (guildId) {
    await client.application?.commands.create(slotsCommand, guildId);
    await client.application?.commands.create(recruitCommand, guildId);
    await client.application?.commands.create(syncMemberCommand, guildId);
    await client.application?.commands.create(createCtaCommand, guildId);
    await client.application?.commands.create(finalizeCtaCommand, guildId);
  } else {
    await client.application?.commands.create(slotsCommand);
    await client.application?.commands.create(recruitCommand);
    await client.application?.commands.create(syncMemberCommand);
    await client.application?.commands.create(createCtaCommand);
    await client.application?.commands.create(finalizeCtaCommand);
  }
  console.log(`Discord bot ready as ${client.user?.tag ?? "unknown-user"}`);

  if (guildId) {
    void ensureRecruitmentTickets();
    void reconcileGuildRoleSync();
    setInterval(() => {
      void ensureRecruitmentTickets();
      void reconcileGuildRoleSync();
    }, syncIntervalMs);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === "crearcta") {
        await handleCreateCtaAutocomplete(interaction);
      } else if (interaction.commandName === "finalizarcta") {
        await handleFinalizeCtaAutocomplete(interaction);
      }
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

    if (interaction.commandName === "crearcta") {
      await handleCreateCtaCommand(interaction);
      return;
    }

    if (interaction.commandName === "finalizarcta") {
      await handleFinalizeCtaCommand(interaction);
    }
  } catch (error) {
    if (isDiscordInteractionAlreadyAcknowledged(error)) {
      return;
    }
    console.error("Interaction handler failed", error);
  }
});

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

async function handleRecruitCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
    await interaction.reply({
      content: "Manage Guild permission required.",
      ephemeral: true
    });
    return;
  }

  const discordId = interaction.options.getString("discord_id", true);
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
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
    await interaction.reply({
      content: "Manage Guild permission required.",
      ephemeral: true
    });
    return;
  }

  const discordId = interaction.options.getString("discord_id", true);
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
          content: "The user is linked on web but has no Trial/Core/Benched role in Discord yet.",
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
    await syncDiscordGuildRole(discordId, member);
    await interaction.reply(`Discord roles synced for ${user.displayName}. Web status: ${member.status}.`);
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

async function handleCreateCtaAutocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "composicion") {
    await interaction.respond([]);
    return;
  }

  const query = focused.value.toLowerCase();
  const comps = await repository.getComps();
  const choices = comps
    .filter((comp) => comp.name.toLowerCase().includes(query))
    .slice(0, 25)
    .map((comp) => ({
      name: comp.name,
      value: comp.id
    }));

  await interaction.respond(choices);
}

async function handleFinalizeCtaAutocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "cta") {
    await interaction.respond([]);
    return;
  }

  const query = focused.value.toLowerCase();
  const ctas = await repository.getCtas();
  const choices = ctas
    .filter((cta) => cta.status !== "FINALIZED")
    .filter((cta) => cta.title.toLowerCase().includes(query))
    .slice(0, 25)
    .map((cta) => ({
      name: `${cta.title} | ${formatUtcDateTime(cta.datetimeUtc)}`,
      value: cta.id
    }));

  await interaction.respond(choices);
}

async function handleCreateCtaCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
    await interaction.reply({
      content: "Manage Guild permission required.",
      ephemeral: true
    });
    return;
  }

  const actor = await repository.getUserByDiscordId(interaction.user.id);
  if (!actor) {
    await interaction.reply({
      content: "Tu usuario Discord no esta enlazado en la web.",
      ephemeral: true
    });
    return;
  }

  try {
    assertOfficerOrAdmin(actor.role);
  } catch {
    await interaction.reply({
      content: "Solo OFFICER o ADMIN pueden crear CTAs.",
      ephemeral: true
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const datetimeUtc = parseUtcDateTimeInput(interaction.options.getString("hora_utc", true));
    const title = interaction.options.getString("titulo", true).trim();
    const compId = interaction.options.getString("composicion", true);
    const comp = await repository.getCompById(compId);

    if (!comp) {
      await interaction.editReply({
        content: "No he encontrado esa composicion.",
      });
      return;
    }

    const cta = await repository.createCta({
      title,
      datetimeUtc,
      createdBy: actor.id,
      initialStatus: "OPEN",
      compId: comp.id
    });

    const signupMessage =
      interaction.channel && interaction.channel.isSendable()
        ? await interaction.channel.send(
            buildCtaSignupMessagePayload(cta, comp, [], interaction.guild ?? null)
          )
        : null;

    if (!signupMessage) {
      await interaction.editReply({
        content: "CTA creada, pero no pude publicar el mensaje de signup en este canal.",
      });
      return;
    }

    await repository.attachCtaSignupMessage(cta.id, {
      signupChannelId: signupMessage.channelId,
      signupMessageId: signupMessage.id
    });

    await interaction.editReply({
      content: `CTA creada: ${title} (${formatUtcDateTime(datetimeUtc)}) con la comp ${comp.name}.`,
    });
  } catch (error) {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content:
          error instanceof Error
            ? error.message
            : "No se pudo crear la CTA."
      });
    } else {
      await interaction.reply({
        content:
          error instanceof Error
            ? error.message
            : "No se pudo crear la CTA.",
        ephemeral: true
      });
    }
  }
}

async function handleFinalizeCtaCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
    await interaction.reply({
      content: "Manage Guild permission required.",
      ephemeral: true
    });
    return;
  }

  const actor = await repository.getUserByDiscordId(interaction.user.id);
  if (!actor) {
    await interaction.reply({
      content: "Tu usuario Discord no esta enlazado en la web.",
      ephemeral: true
    });
    return;
  }

  try {
    assertOfficerOrAdmin(actor.role);
  } catch {
    await interaction.reply({
      content: "Solo OFFICER o ADMIN pueden finalizar CTAs.",
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const ctaId = interaction.options.getString("cta", true);
  const cta = await repository.getCtaById(ctaId);
  if (!cta) {
    await interaction.editReply({
      content: "No he encontrado esa CTA.",
    });
    return;
  }

  if (cta.status === "FINALIZED") {
    await interaction.editReply({
      content: "Esa CTA ya esta finalizada.",
    });
    return;
  }

  const signups = await repository.getCtaSignups(cta.id);
  for (const signup of signups) {
    await repository.upsertAttendance({
      ctaId: cta.id,
      memberId: signup.memberId,
      decision: "YES",
      state: "PRESENT"
    });
  }

  const nextStatus = transitionCtaStatus(cta.status, "FINALIZED");
  await repository.updateCtaStatus(cta.id, nextStatus);
  const generatedPoints = await repository.regenerateAttendancePointsForCta(cta.id);

  if (cta.signupMessageId && cta.signupChannelId) {
    await refreshCtaSignupMessage(cta.signupMessageId, cta.signupChannelId);
  }

  await interaction.editReply({
    content: `CTA finalizada: ${cta.title}. Se han marcado ${signups.length} signups como PRESENT y generado ${generatedPoints.length} entradas de puntos.`,
  });
}

async function syncDiscordGuildRole(discordId: string, member: { id: string; status: MemberStatus }) {
  if (!guildId) {
    await repository.setMemberDiscordRoleStatus(member.id, undefined);
    return;
  }

  const guild = await client.guilds.fetch(guildId);
  const guildMember = await guild.members.fetch(discordId);
  const nextRoleId = getDiscordRoleIdForStatus(member.status);

  if (!nextRoleId) {
    await replaceManagedRoles(guildMember);
    await repository.setMemberDiscordRoleStatus(member.id, undefined);
    return;
  }

  await replaceManagedRoles(guildMember, nextRoleId);
  await repository.setMemberDiscordRoleStatus(member.id, member.status);
}

async function replaceManagedRoles(guildMember: GuildMember, nextRoleId?: string) {
  const roleIdsToRemove = Object.values(activeRoleIds).filter((roleId): roleId is string => Boolean(roleId));
  const nextRoles = guildMember.roles.cache
    .filter((role) => !roleIdsToRemove.includes(role.id))
    .map((role) => role.id);

  if (nextRoleId && !nextRoles.includes(nextRoleId)) {
    nextRoles.push(nextRoleId);
  }

  await guildMember.roles.set(nextRoles);
}

function getDiscordRoleIdForStatus(status: MemberStatus): string | undefined {
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

  if (!expectedRoleId) {
    return Boolean(member.discordRoleStatus);
  }

  return member.discordRoleStatus !== member.status;
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

  for (const application of pendingApplications) {
    try {
      const user = await repository.getUserById(application.userId);
      if (!user) {
        continue;
      }

      const guildMember = await guild.members.fetch(user.discordId).catch(() => null);
      if (!guildMember) {
        console.error(`Recruitment ticket skipped for ${user.displayName}: user is not in the guild yet.`);
        continue;
      }

      const channel = await guild.channels.create({
        name: buildRecruitmentChannelName(application.displayName, application.id),
        type: ChannelType.GuildText,
        parent: recruitmentCategoryId || undefined,
        permissionOverwrites: buildRecruitmentOverwrites(guild, guildMember)
      });

      await channel.send(
        [
          `Nuevo reclutamiento de <@${user.discordId}>`,
          "",
          `Display name: ${application.displayName}`,
          `Timezone: ${application.timezone}`,
          `Main role: ${application.mainRole}`,
          `Experiencia ZvZ: ${application.zvzExperience}`,
          `Notas: ${application.notes || "Ninguna"}`,
          "",
          "Council puede validar aqui y asignar Trial, Core o Benched en Discord para abrir el acceso web."
        ].join("\n")
      );

      await repository.markRecruitmentApplicationTicketOpened(application.id, channel.id);
    } catch (error) {
      console.error(`Recruitment ticket failed for application ${application.id}`, error);
    }
  }
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
    (member.status !== "TRIAL" && member.status !== "CORE" && member.status !== "BENCHED") ||
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
    playerName: user.displayName
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

function buildRecruitmentOverwrites(guild: Guild, guildMember: GuildMember) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: guildMember.id,
      type: OverwriteType.Member,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  for (const roleId of councilRoleIds) {
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

function parseUtcDateTimeInput(value: string): string {
  const normalized = value.trim();

  const shortHourMatch = normalized.match(/^(\d{1,2})$/);
  if (shortHourMatch) {
    const hour = Number(shortHourMatch[1]);
    if (hour < 0 || hour > 23) {
      throw new Error("Hora UTC invalida. Usa 20, 20:00 o 2026-03-01 18:00");
    }

    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0));
    return utcDate.toISOString();
  }

  const shortTimeMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (shortTimeMatch) {
    const hour = Number(shortTimeMatch[1]);
    const minute = Number(shortTimeMatch[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error("Hora UTC invalida. Usa 20, 20:00 o 2026-03-01 18:00");
    }

    const now = new Date();
    const utcDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0)
    );
    return utcDate.toISOString();
  }

  const isoCandidate = normalized.includes("T") ? normalized : normalized.replace(" ", "T");
  const withZone = isoCandidate.endsWith("Z") ? isoCandidate : `${isoCandidate}Z`;
  const withSeconds =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(withZone)
      ? withZone.replace("Z", ":00Z")
      : withZone;

  const parsed = Date.parse(withSeconds);
  if (Number.isNaN(parsed)) {
    throw new Error("Hora UTC invalida. Usa 20, 20:00 o 2026-03-01 18:00");
  }

  return new Date(parsed).toISOString();
}

function formatUtcDateTime(datetimeUtc: string): string {
  return new Date(datetimeUtc).toLocaleString("es-ES", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }) + " UTC";
}

function getCompRoleSummary(comp: CompRecord) {
  const summary = new Map<CtaCompRole, number>();

  for (const role of ctaRoleOrder) {
    const count = comp.parties.reduce(
      (total, party) => total + party.slots.filter((slot) => slot.role === role).length,
      0
    );

    if (count > 0) {
      summary.set(role, count);
    }
  }

  return summary;
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
