const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

async function handleClear(client, ctx) {
  const isInteraction = ctx.isChatInputCommand?.();
  const guildId = ctx.guild.id;

  const player = client.lavalink.getPlayer(guildId);
  if (!player || !player.queue.current) {
    const embed = errorEmbed('Tidak ada lagu yang sedang diputar.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const member = ctx.member;
  if (!member.voice?.channelId || member.voice.channelId !== player.voiceChannelId) {
    const embed = errorEmbed('Kamu harus berada di voice channel yang sama dengan bot.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  if (player.queue.tracks.length === 0) {
    const embed = errorEmbed('Antrean sudah kosong.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const count = player.queue.tracks.length;
  player.queue.tracks.splice(0, player.queue.tracks.length);

  const embed = successEmbed(
    `**${count}** lagu dalam antrean telah dihapus.\nLagu yang sedang diputar tetap berlanjut.`,
    '🗑️ Antrean Dikosongkan'
  );
  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'clear',
  description: 'Kosongkan seluruh antrean (lagu saat ini tetap diputar)',
  cooldown: config.cooldowns.default,
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Kosongkan seluruh antrean lagu (lagu saat ini tetap diputar)'),
  async execute(client, ctx) {
    await handleClear(client, ctx);
  },
};
