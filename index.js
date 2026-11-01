const fs = require('node:fs');
const path = require('node:path');
const { Client, EmbedBuilder, Events, GatewayIntentBits } = require('discord.js');

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const credentialsPath = path.join(__dirname, 'config', 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const token = credentials.token;

if (!token || token === 'PASTE_BOT_TOKEN_HERE') {
  throw new Error('config/credentials.json mein bot token set karein.');
}

if (!credentials.channelId || credentials.channelId === 'PASTE_WELCOME_CHANNEL_ID_HERE') {
  throw new Error('config/credentials.json mein channelId set karein.');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

function renderTemplate(template, member) {
  const values = {
    mention: `<@${member.id}>`,
    user: member.displayName,
    username: member.user.username,
    server: member.guild.name,
    memberCount: String(member.guild.memberCount),
  };

  return template.replace(/\{(mention|user|username|server|memberCount)\}/g, (_, key) => values[key]);
}

function makeEmbed(member) {
  const options = config.embed;
  if (!options?.enabled) return undefined;

  const embed = new EmbedBuilder();
  if (options.title) embed.setTitle(renderTemplate(options.title, member));
  if (options.description) embed.setDescription(renderTemplate(options.description, member));

  if (/^#[\da-f]{6}$/i.test(options.color ?? '')) {
    embed.setColor(Number.parseInt(options.color.slice(1), 16));
  }

  if (options.includeAvatar) {
    embed.setThumbnail(member.displayAvatarURL({ size: 256 }));
  }

  if (options.imageUrl) embed.setImage(options.imageUrl);
  if (options.footer) embed.setFooter({ text: renderTemplate(options.footer, member) });
  return embed;
}

client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.GuildMemberAdd, async member => {
  try {
    const channel = await member.guild.channels.fetch(credentials.channelId);
    if (!channel?.isTextBased() || typeof channel.send !== 'function') {
      console.error(`Welcome channel ${credentials.channelId} nahi mila ya message nahi bhej sakta.`);
      return;
    }

    const content = config.message ? renderTemplate(config.message, member) : undefined;
    const embed = makeEmbed(member);
    await channel.send({
      content,
      embeds: embed ? [embed] : [],
      allowedMentions: { users: [member.id] },
    });
  } catch (error) {
    console.error(`Welcome message send nahi hua for ${member.user.tag}:`, error);
  }
});

client.login(token);