const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

async function handleRemove(client, ctx, args) {
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
    const embed = errorEmbed('Antrean kosong. Tidak ada lagu yang bisa dihapus.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const posInput = isInteraction ? ctx.options.getInteger('posisi') : parseInt(args?.[0]);

  if (isNaN(posInput) || posInput < 1 || posInput > player.queue.tracks.length) {
    const embed = errorEmbed(
      `Posisi tidak valid. Masukkan angka antara **1** dan **${player.queue.tracks.length}**.\n` +
      `Gunakan \`?queue\` atau \`/queue\` untuk melihat nomor lagu.`
    );
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const index = posInput - 1;
  const removed = player.queue.tracks[index];
  player.queue.tracks.splice(index, 1);

  const embed = successEmbed(
    `Menghapus **[${removed.info.title}](${removed.info.uri})** oleh **${removed.info.author}** dari antrean.`,
    '🗑️ Dihapus'
  );
  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'remove',
  description: 'Hapus lagu dari antrean berdasarkan posisinya',
  cooldown: config.cooldowns.default,
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Hapus lagu dari antrean berdasarkan posisinya')
    .addIntegerOption((opt) =>
      opt
        .setName('posisi')
        .setDescription('Nomor posisi lagu dalam antrean (lihat dengan /queue)')
        .setMinValue(1)
        .setRequired(true)
    ),
  async execute(client, ctx, args) {
    await handleRemove(client, ctx, args);
  },
};
