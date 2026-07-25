const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

async function handleMenu(client, ctx) {
  const isInteraction = ctx.isChatInputCommand?.();
  const prefix = config.prefix;

  const embed = createEmbed({
    color: config.colors.primary,
    title: '📋 Daftar Semua Command',
    description: `Prefix: \`${prefix}\` | Slash command: \`/\``,
    fields: [
      {
        name: '🎵 Musik — Pemutaran',
        value: [
          `\`${prefix}play <lagu/url>\` — Putar lagu atau playlist`,
          `\`${prefix}pause\` — Jeda lagu`,
          `\`${prefix}resume\` — Lanjutkan lagu yang dijeda`,
          `\`${prefix}stop\` — Hentikan dan hapus antrean`,
          `\`${prefix}skip\` — Lewati lagu saat ini`,
          `\`${prefix}seek <mm:ss>\` — Lompat ke waktu tertentu`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '📋 Musik — Antrean',
        value: [
          `\`${prefix}queue [halaman]\` — Lihat antrean lagu`,
          `\`${prefix}nowplaying\` — Lagu yang sedang diputar`,
          `\`${prefix}shuffle\` — Acak urutan antrean`,
          `\`${prefix}loop [off/track/queue]\` — Ulangi lagu/antrean`,
          `\`${prefix}remove <posisi>\` — Hapus lagu dari antrean`,
          `\`${prefix}move <dari> <ke>\` — Pindahkan posisi lagu`,
          `\`${prefix}clear\` — Kosongkan seluruh antrean`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '🎛️ Musik — Kontrol',
        value: [
          `\`${prefix}volume [1-150]\` — Atur volume`,
          `\`${prefix}filter <nama>\` — Efek audio (bassboost, nightcore, 8D, dll)`,
          `\`${prefix}autoplay\` — Aktifkan/matikan autoplay`,
          `\`${prefix}radio\` — Putar radio streaming`,
          `\`${prefix}emoji <emoji>\` — Atur emoji voice status`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '🔊 Musik — Voice',
        value: [
          `\`${prefix}join\` — Bot masuk ke voice channel kamu`,
          `\`${prefix}leave\` — Bot keluar dari voice channel`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '🛠️ Utilitas',
        value: [
          `\`${prefix}menu\` — Tampilkan semua command ini`,
          `\`${prefix}ping\` — Cek latensi bot & Lavalink`,
          `\`${prefix}lavalink\` — Status node Lavalink`,
          `\`${prefix}boost\` — Info boost server`,
          `\`${prefix}channels\` — Daftar channel server`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '🎛️ Filter Tersedia',
        value: '`bassboost` `nightcore` `slowmode` `8d` `karaoke` `tremolo` `vibrato` `pop` `soft` `off`',
        inline: false,
      },
    ],
    footer: `Gunakan ${prefix}filter untuk melihat detail setiap efek audio`,
  });

  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'menu',
  description: 'Tampilkan semua command yang tersedia',
  data: new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Tampilkan semua command yang tersedia'),
  async execute(client, ctx) {
    await handleMenu(client, ctx);
  },
};
