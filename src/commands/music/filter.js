const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

// ─── Definisi Filter ─────────────────────────────────────────────────────────

const FILTERS = {
  off: {
    label: 'Off',
    emoji: '❌',
    description: 'Matikan semua filter audio',
    apply: async (player) => {
      await player.filterManager.resetFilters();
    },
  },
  bassboost: {
    label: 'Bass Boost',
    emoji: '🔊',
    description: 'Perkuat suara bass',
    apply: async (player) => {
      await player.filterManager.resetFilters();
      await player.filterManager.setEqualizer([
        { band: 0, gain: 0.3 },
        { band: 1, gain: 0.3 },
        { band: 2, gain: 0.25 },
        { band: 3, gain: 0.2 },
        { band: 4, gain: 0.15 },
        { band: 5, gain: 0.0 },
        { band: 6, gain: -0.05 },
        { band: 7, gain: -0.05 },
        { band: 8, gain: -0.05 },
        { band: 9, gain: -0.05 },
        { band: 10, gain: -0.05 },
        { band: 11, gain: -0.05 },
        { band: 12, gain: -0.05 },
        { band: 13, gain: -0.05 },
      ]);
    },
  },
  nightcore: {
    label: 'Nightcore',
    emoji: '🌙',
    description: 'Percepat lagu dan naikkan pitch (efek Nightcore)',
    apply: async (player) => {
      await player.filterManager.resetFilters();
      await player.filterManager.setTimescale({ speed: 1.3, pitch: 1.3, rate: 1.0 });
    },
  },
  slowmode: {
    label: 'Slow Mode',
    emoji: '🐢',
    description: 'Perlambat lagu (efek lo-fi / vaporwave)',
    apply: async (player) => {
      await player.filterManager.resetFilters();
      await player.filterManager.setTimescale({ speed: 0.8, pitch: 0.9, rate: 1.0 });
    },
  },
  '8d': {
    label: '8D Audio',
    emoji: '🎧',
    description: 'Efek audio 3D berputar (pakai headphone)',
    apply: async (player) => {
      await player.filterManager.resetFilters();
      await player.filterManager.setRotation({ rotationHz: 0.2 });
    },
  },
  karaoke: {
    label: 'Karaoke',
    emoji: '🎤',
    description: 'Kurangi vokal, fokus ke instrumen',
    apply: async (player) => {
      await player.filterManager.resetFilters();
      await player.filterManager.setKaraoke({ level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 });
    },
  },
  tremolo: {
    label: 'Tremolo',
    emoji: '〰️',
    description: 'Efek getaran volume',
    apply: async (player) => {
      await player.filterManager.resetFilters();
      await player.filterManager.setTremolo({ frequency: 4.0, depth: 0.75 });
    },
  },
  vibrato: {
    label: 'Vibrato',
    emoji: '🎻',
    description: 'Efek getaran pitch',
    apply: async (player) => {
      await player.filterManager.resetFilters();
      await player.filterManager.setVibrato({ frequency: 4.0, depth: 0.75 });
    },
  },
  pop: {
    label: 'Pop',
    emoji: '🎵',
    description: 'Equalizer optimasi untuk genre Pop',
    apply: async (player) => {
      await player.filterManager.resetFilters();
      await player.filterManager.setEqualizer([
        { band: 0, gain: -0.05 },
        { band: 1, gain: 0.05 },
        { band: 2, gain: 0.1 },
        { band: 3, gain: 0.1 },
        { band: 4, gain: 0.05 },
        { band: 5, gain: 0.0 },
        { band: 6, gain: -0.05 },
        { band: 7, gain: -0.1 },
        { band: 8, gain: -0.1 },
        { band: 9, gain: -0.05 },
      ]);
    },
  },
  soft: {
    label: 'Soft',
    emoji: '🌸',
    description: 'Kurangi frekuensi tinggi, suara lebih lembut',
    apply: async (player) => {
      await player.filterManager.resetFilters();
      await player.filterManager.setLowPass({ smoothing: 20.0 });
    },
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handleFilter(client, ctx, args) {
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

  const filterKey = isInteraction
    ? ctx.options.getString('nama')
    : (args?.[0] || '').toLowerCase();

  // Tampilkan daftar filter jika tidak ada argumen
  if (!filterKey || !FILTERS[filterKey]) {
    const list = Object.entries(FILTERS)
      .map(([key, f]) => `${f.emoji} \`${key}\` — ${f.description}`)
      .join('\n');
    const embed = createEmbed({
      color: config.colors.info,
      title: '🎛️ Daftar Filter Audio',
      description: `Gunakan \`?filter <nama>\` atau \`/filter\` untuk mengaktifkan filter.\n\n${list}`,
    });
    return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
  }

  const filter = FILTERS[filterKey];

  try {
    await filter.apply(player);
  } catch (err) {
    const embed = errorEmbed(`Gagal mengaktifkan filter: ${err.message}`);
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const embed = filterKey === 'off'
    ? successEmbed('Semua filter audio dimatikan.', '❌ Filter Off')
    : successEmbed(
        `Filter **${filter.label}** ${filter.emoji} diaktifkan.\nGunakan \`?filter off\` atau \`/filter off\` untuk mematikan.`,
        `${filter.emoji} Filter: ${filter.label}`
      );

  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'filter',
  description: 'Aktifkan efek audio (bassboost, nightcore, 8D, karaoke, dll)',
  cooldown: config.cooldowns.default,
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Aktifkan efek audio pada lagu yang sedang diputar')
    .addStringOption((opt) =>
      opt
        .setName('nama')
        .setDescription('Nama filter yang ingin diaktifkan')
        .addChoices(
          { name: '❌ Off — matikan semua filter', value: 'off' },
          { name: '🔊 Bass Boost', value: 'bassboost' },
          { name: '🌙 Nightcore', value: 'nightcore' },
          { name: '🐢 Slow Mode', value: 'slowmode' },
          { name: '🎧 8D Audio', value: '8d' },
          { name: '🎤 Karaoke', value: 'karaoke' },
          { name: '〰️ Tremolo', value: 'tremolo' },
          { name: '🎻 Vibrato', value: 'vibrato' },
          { name: '🎵 Pop EQ', value: 'pop' },
          { name: '🌸 Soft', value: 'soft' }
        )
    ),
  async execute(client, ctx, args) {
    await handleFilter(client, ctx, args);
  },
};
