const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

async function handlePause(client, ctx) {
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

  if (player.paused) {
    const embed = errorEmbed('Lagu sudah dalam keadaan paused. Gunakan `?resume` atau `/resume` untuk melanjutkan.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  await player.pause(true);

  const track = player.queue.current;
  const embed = successEmbed(
    `**${track?.info?.title || 'Lagu saat ini'}** dijeda.\nGunakan \`?resume\` atau \`/resume\` untuk melanjutkan.`,
    '⏸ Dijeda'
  );
  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'pause',
  description: 'Jeda lagu yang sedang diputar',
  cooldown: config.cooldowns.default,
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Jeda lagu yang sedang diputar'),
  async execute(client, ctx) {
    await handlePause(client, ctx);
  },
};
