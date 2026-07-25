const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

async function handleShuffle(client, ctx) {
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

  if (player.queue.tracks.length < 2) {
    const embed = errorEmbed('Antrean membutuhkan minimal **2 lagu** untuk diacak.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  player.queue.shuffle();

  const embed = successEmbed(
    `**${player.queue.tracks.length}** lagu dalam antrean telah diacak.`,
    '🔀 Shuffle'
  );
  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'shuffle',
  description: 'Acak urutan lagu dalam antrean',
  cooldown: config.cooldowns.default,
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Acak urutan lagu dalam antrean'),
  async execute(client, ctx) {
    await handleShuffle(client, ctx);
  },
};
