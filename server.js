import express from 'express';
import { Client, GatewayIntentBits, Events, ChannelType } from 'discord.js';

// Ruoli staff, dal più basso al più alto (l'ordine è quello in cui li hai scritti)
const ROLES = [
  { id: '1551990283384660108', label: 'Trial staff' },
  { id: '1551989231738683433', label: 'Staff' },
  { id: '1551990517250793534', label: 'Staffer' },
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
  ],
});

// Canale da cui arrivano gli annunci
const ANNOUNCE_CHANNEL_ID = '1551963576842068038';
const listeners = new Set();
let guild;
let commands = [];
let announcements = [];

function snapshot() {
  if (!guild) return { ready: false };
  const humans = guild.members.cache.filter((m) => !m.user.bot);
  const online = humans.filter((m) => m.presence && m.presence.status !== 'offline').size;
  const staff = ROLES.map((r) => ({ label: r.label, members: [] }));

  for (const m of humans.values()) {
    // Se una persona ha più ruoli staff, compare solo in quello più alto
    let best = -1;
    ROLES.forEach((r, i) => {
      if (m.roles.cache.has(r.id) && (best < 0 || guild.roles.cache.get(r.id).position > guild.roles.cache.get(ROLES[best].id).position)) best = i;
    });
    if (best >= 0) staff[best].members.push({ id: m.id, name: m.displayName, avatar: m.displayAvatarURL({ extension: 'png', size: 64 }) });
  }
  staff.forEach((g) => g.members.sort((a, b) => a.name.localeCompare(b.name)));

  const ch = guild.channels.cache;
  return {
    ready: true,
    updatedAt: Date.now(),
    announcements,
    total: humans.size,
    online,
    offline: humans.size - online,
    staff: staff.reverse(), // mostra prima Staffer, poi Staff, poi Trial staff
    server: {
      name: guild.name,
      icon: guild.iconURL({ size: 128 }),
      createdAt: guild.createdTimestamp,
      boosts: guild.premiumSubscriptionCount ?? 0,
      roles: guild.roles.cache.size - 1,
      textChannels: ch.filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement).size,
      voiceChannels: ch.filter((c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice).size,
    },
    bot: { name: client.user.username, avatar: client.user.displayAvatarURL({ size: 64 }), ping: client.ws.ping, commands },
  };
}

let timer;
function push() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const data = `data: ${JSON.stringify(snapshot())}\n\n`;
    for (const res of listeners) res.write(data);
  }, 800);
}

async function refreshCommands() {
  try {
    const list = await client.application.commands.fetch();
    commands = [...list.values()].map((c) => ({ name: c.name, description: c.description }));
  } catch {}
}

async function refreshAnnouncements() {
  try {
    const ch = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
    const list = await ch.messages.fetch({ limit: 20 });
    announcements = [...list.values()]
      .filter((m) => !m.system)
      .map((m) => ({
        id: m.id,
        author: m.member?.displayName ?? m.author.username,
        avatar: m.author.displayAvatarURL({ extension: 'png', size: 64 }),
        content: m.cleanContent || m.embeds[0]?.description || '',
        image: m.attachments.find((a) => a.contentType?.startsWith('image/'))?.url ?? null,
        timestamp: m.createdTimestamp,
      }));
  } catch (e) {
    console.log('Annunci non disponibili:', e.message);
  }
}

// Ogni messaggio nuovo, modificato o eliminato nel canale annunci aggiorna il sito
const refreshAndPush = async () => { await refreshAnnouncements(); push(); };
for (const e of [Events.MessageCreate, Events.MessageUpdate, Events.MessageDelete]) {
  client.on(e, (m) => m.channelId === ANNOUNCE_CHANNEL_ID && refreshAndPush());
}
client.on(Events.MessageBulkDelete, (_msgs, ch) => ch.id === ANNOUNCE_CHANNEL_ID && refreshAndPush());

client.once(Events.ClientReady, async () => {
  guild = client.guilds.cache.get(process.env.GUILD_ID) ?? client.guilds.cache.first();
  await guild.members.fetch();
  await refreshCommands();
  await refreshAnnouncements();
  push();
  setInterval(async () => { await refreshCommands(); push(); }, 60_000);
  console.log(`Bot online come ${client.user.tag} su "${guild.name}"`);
});

[
  Events.GuildMemberAdd, Events.GuildMemberRemove, Events.GuildMemberUpdate, Events.PresenceUpdate,
  Events.GuildRoleCreate, Events.GuildRoleDelete, Events.GuildRoleUpdate, Events.GuildUpdate,
  Events.ChannelCreate, Events.ChannelDelete,
].forEach((e) => client.on(e, push));

const app = express();
app.use(express.static('public'));
app.get('/api/state', (_req, res) => res.json(snapshot()));
app.get('/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
  listeners.add(res);
  const beat = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => { clearInterval(beat); listeners.delete(res); });
});

client.login(process.env.DISCORD_TOKEN);
app.listen(process.env.PORT || 3000, () => console.log('Sito su http://localhost:' + (process.env.PORT || 3000)));
