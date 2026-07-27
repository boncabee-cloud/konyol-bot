const { SlashCommandBuilder } = require('discord.js');
const { getOrCreatePlayer, search, play, setRadioMode, setSeed, getAutoplay, setAutoplay } = require('../../music/MusicManager');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/embeds');
const { formatDuration } = require('../../utils/embeds');
const config = require('../../config/config');

function platformLabel(query) {
  if (/open\.spotify\.com/i.test(query)) return 'Spotify';
  if (/music\.apple\.com/i.test(query)) return 'Apple Music';
  if (/soundcloud\.com/i.test(query)) return 'SoundCloud';
  if (/youtube\.com|youtu\.be/i.test(query)) return 'YouTube';
  return null;
}

async function handlePlay(client, ctx, queryStr) {
  const isInteraction = ctx.isChatInputCommand?.();
  const member  = ctx.member;
  const channel = ctx.channel;

  if (!member.voice?.channelId) {
    const embed = errorEmbed('Kamu harus masuk ke voice channel terlebih dahulu.');
    return isInteraction
      ? ctx.reply({ embeds: [embed], ephemeral: true })
      : ctx.reply({ embeds: [embed] });
  }

  const query = queryStr?.trim();
  if (!query) {
    const embed = errorEmbed('Tulis nama lagu atau URL yang ingin diputar.');
    return isInteraction
      ? ctx.reply({ embeds: [embed], ephemeral: true })
      : ctx.reply({ embeds: [embed] });
  }

  if (isInteraction) await ctx.deferReply();

  try {
    setRadioMode(ctx.guild.id, false);

    const player = await getOrCreatePlayer(
      client,
      ctx.guild.id,
      member.voice.channelId,
      channel.id
    );

    const result = await search(player, query, isInteraction ? ctx.user : ctx.author);

    if (!result || result.loadType === 'error' || result.loadType === 'empty') {
      const embed = errorEmbed(
        `Tidak ada hasil untuk: **${query}**\n` +
        `Coba nama lagu yang berbeda atau tempel URL langsung.`
      );
      return isInteraction ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
    }

    // Jika autoplay sedang aktif → bersihkan lagu autoplay dari queue & matikan autoplay
    if (getAutoplay(ctx.guild.id)) {
      const queueTracks = player.queue.tracks;
      const autoplayTracks = queueTracks.filter(t => t.requester?.isAutoplay === true);
      for (const track of autoplayTracks) {
        const idx = player.queue.tracks.indexOf(track);
        if (idx !== -1) player.queue.tracks.splice(idx, 1);
      }
      setAutoplay(ctx.guild.id, false);
    }

    const maxDuration = config.music.maxDuration || 0; // 0 = tidak ada batas
    let tracks = [];
    let description = '';
    const platform = platformLabel(query);
    const platformTag = platform ? ` *(${platform})*` : '';

    if (result.loadType === 'playlist') {
      let allTracks = result.tracks;
      let skipped = 0;

      // Filter track yang melebihi batas durasi (kecuali stream & maxDuration = 0)
      if (maxDuration > 0) {
        const filtered = allTracks.filter((t) => {
          if (t.info.isStream) return true;
          if (!t.info.duration || t.info.duration <= maxDuration) return true;
          skipped++;
          return false;
        });
        allTracks = filtered;
      }

      if (allTracks.length === 0) {
        const embed = errorEmbed(
          `Semua lagu di playlist melebihi batas durasi maksimum **${formatDuration(maxDuration)}**.`
        );
        return isInteraction ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
      }

      tracks = allTracks;
      const playlistName = result.playlist?.name || 'Playlist';
      description = `📋 Menambahkan **${tracks.length}** lagu dari playlist [${playlistName}](${query})${platformTag} ke antrean.`;
      if (skipped > 0) description += `\n⚠️ **${skipped}** lagu dilewati (durasi > ${formatDuration(maxDuration)}).`;
    } else {
      const track = result.tracks[0];

      // Cek durasi untuk single track (skip jika stream / maxDuration = 0)
      if (maxDuration > 0 && !track.info.isStream && track.info.duration > maxDuration) {
        const embed = errorEmbed(
          `❌ Lagu **${track.info.title}** memiliki durasi **${formatDuration(track.info.duration)}** ` +
          `yang melebihi batas maksimum **${formatDuration(maxDuration)}** (2 jam).\n` +
          `Coba lagu yang lebih pendek.`
        );
        return isInteraction ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
      }

      tracks = [track];
      description = `🎵 Menambahkan [**${track.info.title}**](${track.info.uri}) oleh **${track.info.author}**${platformTag} ke antrean.`;
    }

    await play(player, tracks);

    // Update seed ke lagu yang baru di-request
    setSeed(ctx.guild.id, tracks[0]);

    const isNowPlaying = !player.queue.previous && player.queue.tracks.length <= tracks.length;
    const embed = createEmbed({
      color: config.colors.success,
      title: isNowPlaying ? '▶️ Sekarang Diputar' : '✅ Ditambahkan ke Antrean',
      description,
    });
    if (tracks[0]?.info?.artworkUrl) embed.setThumbnail(tracks[0].info.artworkUrl);

    return isInteraction ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
  } catch (err) {
    const errMsg = err.message || 'Gagal memutar lagu. Coba lagi.';
    const embed = errorEmbed(errMsg);
    return isInteraction
      ? ctx.editReply({ embeds: [embed] }).catch(() => {})
      : ctx.reply({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = {
  name: 'play',
  description: 'Putar lagu dari YouTube, SoundCloud, Spotify, atau Apple Music',
  cooldown: config.cooldowns.play,
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Putar lagu atau playlist')
    .addStringOption((opt) =>
      opt
        .setName('query')
        .setDescription('Nama lagu, atau URL (YouTube / SoundCloud / Spotify / Apple Music)')
        .setRequired(true)
    ),
  async execute(client, ctx, args) {
    const isInteraction = ctx.isChatInputCommand?.();
    const query = isInteraction ? ctx.options.getString('query') : args.join(' ');
    await handlePlay(client, ctx, query);
  },
};
