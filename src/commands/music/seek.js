const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatDuration } = require('../../utils/embeds');
const config = require('../../config/config');

/**
 * Parse waktu dari format "1:30" atau "90" (detik) ke milliseconds
 */
function parseTime(input) {
  if (!input) return null;
  const str = String(input).trim();

  // Format mm:ss atau hh:mm:ss
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) {
      const [min, sec] = parts;
      return (min * 60 + sec) * 1000;
    }
    if (parts.length === 3) {
      const [hr, min, sec] = parts;
      return (hr * 3600 + min * 60 + sec) * 1000;
    }
    return null;
  }

  // Format angka saja → anggap detik
  const secs = parseFloat(str);
  if (isNaN(secs)) return null;
  return secs * 1000;
}

async function handleSeek(client, ctx, args) {
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

  const track = player.queue.current;
  if (!track) {
    const embed = errorEmbed('Tidak ada lagu yang sedang diputar.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  if (track.info.isStream) {
    const embed = errorEmbed('Tidak bisa seek pada live stream.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const timeInput = isInteraction ? ctx.options.getString('waktu') : args?.[0];
  const positionMs = parseTime(timeInput);

  if (positionMs === null || positionMs < 0) {
    const embed = errorEmbed(
      'Format waktu tidak valid.\nGunakan format `mm:ss` (contoh: `1:30`) atau detik (contoh: `90`).'
    );
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const duration = track.info.duration;
  if (positionMs >= duration) {
    const embed = errorEmbed(
      `Waktu melebihi durasi lagu (**${formatDuration(duration)}**). Masukkan waktu yang lebih kecil.`
    );
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  await player.seek(positionMs);

  const embed = successEmbed(
    `Melompat ke **${formatDuration(positionMs)}** dari **${formatDuration(duration)}**.`,
    '⏩ Seek'
  );
  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'seek',
  description: 'Lompat ke waktu tertentu dalam lagu (contoh: 1:30 atau 90)',
  cooldown: config.cooldowns.default,
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Lompat ke waktu tertentu dalam lagu')
    .addStringOption((opt) =>
      opt
        .setName('waktu')
        .setDescription('Waktu tujuan, format mm:ss (contoh: 1:30) atau detik (contoh: 90)')
        .setRequired(true)
    ),
  async execute(client, ctx, args) {
    await handleSeek(client, ctx, args);
  },
};
