const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

const LOOP_MODES = {
  off: { label: 'Off', emoji: '➡️', description: 'Tidak ada pengulangan' },
  track: { label: 'Track', emoji: '🔂', description: 'Ulangi lagu saat ini terus-menerus' },
  queue: { label: 'Queue', emoji: '🔁', description: 'Ulangi seluruh antrean' },
};

async function handleLoop(client, ctx, args) {
  const isInteraction = ctx.isChatInputCommand?.();
  const guildId = ctx.guild.id;

  const player = client.lavalink.getPlayer(guildId);
  if (!player || (!player.playing && !player.paused)) {
    const embed = errorEmbed('Tidak ada lagu yang sedang diputar.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const member = ctx.member;
  if (!member.voice?.channelId || member.voice.channelId !== player.voiceChannelId) {
    const embed = errorEmbed('Kamu harus berada di voice channel yang sama dengan bot.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const modeInput = isInteraction
    ? ctx.options.getString('mode')
    : (args?.[0] || '').toLowerCase();

  // Jika tidak ada argumen, toggle antara off → track → queue → off
  let newMode;
  if (!modeInput || !['off', 'track', 'queue'].includes(modeInput)) {
    const current = player.repeatMode || 'off';
    if (current === 'off') newMode = 'track';
    else if (current === 'track') newMode = 'queue';
    else newMode = 'off';
  } else {
    newMode = modeInput;
  }

  player.setRepeatMode(newMode);

  const info = LOOP_MODES[newMode];
  const embed = createEmbed({
    color: config.colors.primary,
    title: `${info.emoji} Loop: ${info.label}`,
    description: info.description,
  });
  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'loop',
  description: 'Atur mode pengulangan lagu (off / track / queue)',
  cooldown: config.cooldowns.default,
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Atur mode pengulangan lagu')
    .addStringOption((opt) =>
      opt
        .setName('mode')
        .setDescription('Mode pengulangan')
        .addChoices(
          { name: '➡️ Off — matikan pengulangan', value: 'off' },
          { name: '🔂 Track — ulangi lagu saat ini', value: 'track' },
          { name: '🔁 Queue — ulangi seluruh antrean', value: 'queue' }
        )
    ),
  async execute(client, ctx, args) {
    await handleLoop(client, ctx, args);
  },
};
