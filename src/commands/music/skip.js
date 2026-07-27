const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

async function handleSkip(client, ctx) {
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

  const current = player.queue.current;

  // Kasus 1: Jika tidak ada lagu lagi di antrean (antrean kosong)
  if (player.queue.tracks.length === 0) {
    try {
      await player.stopPlaying(); // Hentikan pemutaran karena antrean habis
    } catch (stopErr) {
      try { await player.queue.utils.cleanUp(); } catch (_) {}
    }
    const embed = successEmbed(
      `Melewati **${current?.info?.title || 'lagu saat ini'}**. Tidak ada lagu berikutnya di antrean.`,
      '⏭ Dilewati'
    );
    return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
  }

  // Kasus 2: Masih ada lagu di antrean
  try {
    // Cukup panggil skip() SATU KALI saja
    await player.skip();
  } catch (err) {
    const embed = errorEmbed(`Gagal melewati lagu: ${err.message}`);
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const embed = successEmbed(
    `Melewati **${current?.info?.title || 'lagu saat ini'}**.`,
    '⏭ Dilewati'
  );
  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'skip',
  description: 'Lewati lagu yang sedang diputar',
  cooldown: config.cooldowns.skip,
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Lewati lagu yang sedang diputar'),

  async execute(client, ctx) {
    await handleSkip(client, ctx);
  },
};
