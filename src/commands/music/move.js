const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

async function handleMove(client, ctx, args) {
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

  if (player.queue.tracks.length < 2) {
    const embed = errorEmbed('Antrean membutuhkan minimal **2 lagu** untuk memindahkan lagu.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const fromInput = isInteraction ? ctx.options.getInteger('dari') : parseInt(args?.[0]);
  const toInput   = isInteraction ? ctx.options.getInteger('ke')   : parseInt(args?.[1]);

  const maxPos = player.queue.tracks.length;

  if (isNaN(fromInput) || fromInput < 1 || fromInput > maxPos) {
    const embed = errorEmbed(`Posisi **dari** tidak valid (1–${maxPos}).`);
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }
  if (isNaN(toInput) || toInput < 1 || toInput > maxPos) {
    const embed = errorEmbed(`Posisi **ke** tidak valid (1–${maxPos}).`);
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }
  if (fromInput === toInput) {
    const embed = errorEmbed('Posisi **dari** dan **ke** tidak boleh sama.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const fromIndex = fromInput - 1;
  const toIndex   = toInput - 1;
  const [track] = player.queue.tracks.splice(fromIndex, 1);
  player.queue.tracks.splice(toIndex, 0, track);

  const embed = successEmbed(
    `Memindahkan **[${track.info.title}](${track.info.uri})** dari posisi **${fromInput}** ke posisi **${toInput}**.`,
    '↕️ Lagu Dipindahkan'
  );
  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'move',
  description: 'Pindahkan lagu dari satu posisi ke posisi lain dalam antrean',
  cooldown: config.cooldowns.default,
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Pindahkan lagu dari satu posisi ke posisi lain dalam antrean')
    .addIntegerOption((opt) =>
      opt.setName('dari').setDescription('Posisi lagu saat ini').setMinValue(1).setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName('ke').setDescription('Posisi tujuan').setMinValue(1).setRequired(true)
    ),
  async execute(client, ctx, args) {
    await handleMove(client, ctx, args);
  },
};
