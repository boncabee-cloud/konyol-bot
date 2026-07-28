const logger = require('../utils/logger');
const config = require('../config/config');

const autoplayMap = new Map();
const musicCacheMap = new Map();
const radioModeMap = new Map();
const seedMap = new Map();            // { title, author, uri, identifier }
const autoplayHistoryMap = new Map(); // Set<uri> — sudah diputar dalam sesi autoplay
const voiceEmojiMap = new Map();      // guildId → custom emoji string

// ─── Radio Mode ───────────────────────────────────────────────────────────────

function setRadioMode(guildId, enabled) { radioModeMap.set(guildId, enabled); }
function isRadioMode(guildId) { return radioModeMap.get(guildId) === true; }

// ─── Player Management ───────────────────────────────────────────────────────

async function getOrCreatePlayer(client, guildId, voiceChannelId, textChannelId) {
  const nodes = client.lavalink.nodeManager?.nodes;
  const connectedNodes = nodes ? [...nodes.values()].filter((n) => n.connected) : [];
  if (connectedNodes.length === 0) {
    throw new Error(
      'Server musik sedang tidak tersedia (semua node Lavalink offline). ' +
      'Coba lagi dalam beberapa detik.'
    );
  }

  let player = client.lavalink.getPlayer(guildId);

  if (!player) {
    player = await client.lavalink.createPlayer({
      guildId,
      voiceChannelId,
      textChannelId,
      selfDeaf: true,
      selfMute: false,
      volume: config.music.defaultVolume,
      instaUpdateFiltersFix: true,
    });
  } else {
    // Jika bot sudah terhubung ke voice channel lain, tolak — jangan berpindah
    if (player.connected && voiceChannelId && player.voiceChannelId !== voiceChannelId) {
      throw new Error(
        `Bot sedang digunakan di <#${player.voiceChannelId}>. ` +
        `Tunggu sampai selesai, atau ketik \`?stop\` untuk menghentikannya.`
      );
    }
    if (textChannelId) {
      player.textChannelId = textChannelId;
    }
  }

  if (!player.connected) {
    await player.connect();
  }

  return player;
}

// ─── Search & Play ───────────────────────────────────────────────────────────

async function search(player, query, requester) {
  const isUrl = /^https?:\/\//i.test(query);
  const isSpotify = /open\.spotify\.com/i.test(query);
  const isSoundCloud = /soundcloud\.com/i.test(query);
  const isYoutube = /youtube\.com|youtu\.be/i.test(query);

  // Untuk URL langsung: tanpa prefix source (Lavalink deteksi otomatis)
  // Untuk platform tertentu: gunakan source yang sesuai
  // Untuk query teks biasa: ytmsearch → ytsearch → scsearch (fallback)
  let source = config.music.searchPlatform; // default: ytmsearch
  if (isSpotify) source = 'spsearch';
  else if (isSoundCloud) source = 'scsearch';
  else if (isYoutube || isUrl) source = undefined;

  let result;
  try {
    result = await player.search({ query, source }, requester);
    logger.debug(`Search [${source ?? 'url'}] "${query}" → ${result?.tracks?.length ?? 0} hasil`);
  } catch (err) {
    logger.warn(`Primary search failed (${source}): ${err.message}. Trying fallback...`);
    result = null;
  }

  // Fallback chain untuk query teks: ytmsearch → ytsearch → scsearch
  if (!result || result.loadType === 'empty' || !result.tracks?.length) {
    const fallbacks = [];
    if (source === 'ytmsearch') fallbacks.push('ytsearch', 'scsearch');
    else if (source === 'ytsearch') fallbacks.push('scsearch');
    else if (source !== 'scsearch') fallbacks.push('scsearch');

    for (const fb of fallbacks) {
      logger.info(`Search kosong untuk [${source}], mencoba fallback [${fb}]...`);
      try {
        result = await player.search({ query, source: fb }, requester);
        if (result?.tracks?.length) {
          logger.debug(`Fallback [${fb}] berhasil: ${result.tracks.length} hasil`);
          break;
        }
      } catch (fallbackErr) {
        logger.warn(`Fallback [${fb}] gagal: ${fallbackErr.message}`);
      }
    }

    if (!result || result.loadType === 'empty' || !result.tracks?.length) {
      throw new Error('Tidak ada hasil yang ditemukan. Coba nama lagu yang berbeda.');
    }
  }

  return result;
}

async function play(player, tracks) {
  if (!tracks || tracks.length === 0) return;
  await player.queue.add(tracks);
  if (!player.playing && !player.paused) {
    await player.play({ volume: player.volume || config.music.defaultVolume });
  }
}

// ─── Voice Status ─────────────────────────────────────────────────────────────

async function setVoiceStatus(client, guildId, channelId, status) {
  try {
    await client.rest.put(`/channels/${channelId}/voice-status`, {
      body: { status: status || '' },
    });
  } catch (err) {
    logger.debug(`Could not set voice status: ${err.message}`);
  }
}

// ─── Autoplay ─────────────────────────────────────────────────────────────────

function setAutoplay(guildId, enabled) { autoplayMap.set(guildId, enabled); }
function getAutoplay(guildId) { return autoplayMap.get(guildId) || false; }

// ─── Seed Management ──────────────────────────────────────────────────────────

function setSeed(guildId, track) {
  if (!track?.info) return;
  seedMap.set(guildId, {
    title:      track.info.title,
    author:     track.info.author,
    uri:        track.info.uri,
    identifier: track.info.identifier || null,
  });
  autoplayHistoryMap.set(guildId, new Set([track.info.uri]));
  logger.debug(`Seed set [${guildId}]: "${track.info.title}" (id: ${track.info.identifier})`);
}

function getSeed(guildId) {
  return seedMap.get(guildId) || null;
}

function updateAutoplaySeed(guildId, track) {
  if (!track?.info) return;
  seedMap.set(guildId, {
    title:      track.info.title,
    author:     track.info.author,
    uri:        track.info.uri,
    identifier: track.info.identifier || null,
  });
  if (!autoplayHistoryMap.has(guildId)) autoplayHistoryMap.set(guildId, new Set());
  const hist = autoplayHistoryMap.get(guildId);
  hist.add(track.info.uri);
  if (hist.size > 100) hist.delete(hist.values().next().value);
  logger.debug(`Autoplay seed updated [${guildId}]: "${track.info.title}"`);
}

// ─── Genre Detection ──────────────────────────────────────────────────────────

function detectGenre(tracks) {
  if (!tracks || tracks.length === 0) return null;
  const text = tracks
    .map((t) => `${t.info?.title || ''} ${t.info?.author || ''}`)
    .join(' ')
    .toLowerCase();

  const genres = [
    { name: 'K-Pop',           keywords: ['kpop','k-pop','bts','blackpink','twice','exo','got7','nct','stray kids','ive','aespa','red velvet','shinee','monsta x','seventeen','enhypen','txt','bigbang','mamamoo','(g)i-dle','itzy','newjeans','le sserafim'] },
    { name: 'Pop',             keywords: ['pop','taylor swift','ariana grande','justin bieber','ed sheeran','dua lipa','billie eilish','harry styles','olivia rodrigo','selena gomez','charlie puth','maroon 5','shawn mendes'] },
    { name: 'Hip-Hop / Rap',   keywords: ['rap','hip hop','hiphop','hip-hop','drake','kendrick','j. cole','travis scott','post malone','eminem','lil wayne','lil uzi','kanye','nicki minaj','cardi b','juice wrld','xxxtentacion'] },
    { name: 'Rock',            keywords: ['rock','metal','linkin park','metallica','green day','nirvana','foo fighters','red hot chili','system of a down','ac/dc','queen','guns n roses','bon jovi','avenged sevenfold'] },
    { name: 'R&B / Soul',      keywords: ['r&b','rnb','soul','the weeknd','frank ocean','sza','usher','beyoncé','beyonce','rihanna','alicia keys','john legend','daniel caesar'] },
    { name: 'EDM / Electronic',keywords: ['edm','electronic','house','techno','dubstep','trance','avicii','marshmello','alan walker','dj','tiesto','calvin harris','david guetta','martin garrix','skrillex','deadmau5'] },
    { name: 'Jazz',            keywords: ['jazz','blues','swing','bossa nova','bebop','coltrane','miles davis'] },
    { name: 'Classical',       keywords: ['classical','orchestra','symphony','beethoven','mozart','chopin','bach','handel'] },
    { name: 'Lo-Fi',           keywords: ['lofi','lo-fi','lo fi','chill','study music','relaxing music','cafe music'] },
    { name: 'Indie',           keywords: ['indie','alternative','folk','arctic monkeys','tame impala','vampire weekend'] },
    { name: 'OPM',             keywords: ['opm','filipino','tagalog','kundiman','pamungkas','ben&ben','december avenue','eraserheads','parokya','rivermaya'] },
    { name: 'Dangdut',         keywords: ['dangdut','koplo','rhoma irama','via vallen','nella kharisma','denny caknan','happy asmara'] },
    { name: 'Indonesia Pop',   keywords: ['noah','dewa 19','slank','sheila on 7','peterpan','ungu','armada','raisa','isyana','rizky febian','andmesh','kunto aji','hindia','fourtwnty','tulus','yura yunita','tiara andini','mahalini','nadin amizah'] },
  ];

  let bestMatch = null, bestScore = 0;
  for (const genre of genres) {
    const score = genre.keywords.filter((k) => text.includes(k)).length;
    if (score > bestScore) { bestScore = score; bestMatch = genre.name; }
  }
  return bestScore > 0 ? bestMatch : null;
}

// ─── Track Cache ─────────────────────────────────────────────────────────────

function cacheTrack(guildId, track) {
  if (!musicCacheMap.has(guildId)) musicCacheMap.set(guildId, []);
  const cache = musicCacheMap.get(guildId);
  cache.push(track);
  if (cache.length > 50) cache.shift();
}

function getCachedTracks(guildId) { return musicCacheMap.get(guildId) || []; }

// ─── Autoplay Handler ─────────────────────────────────────────────────────────

const AUTOPLAY_BATCH = 5; // berapa lagu yang ditambahkan setiap kali autoplay

async function handleAutoplay(client, player) {
  if (!getAutoplay(player.guildId)) return;

  // Ambil seed — dari seedMap atau fallback ke cache terakhir
  let seed = getSeed(player.guildId);
  if (!seed) {
    const cache = getCachedTracks(player.guildId);
    if (cache.length === 0) return;
    const last = cache[cache.length - 1];
    seed = {
      title:      last.info.title,
      author:     last.info.author,
      uri:        last.info.uri,
      identifier: last.info.identifier || null,
    };
  }

  const history = autoplayHistoryMap.get(player.guildId) || new Set();
  const requester = { id: client.user.id, username: 'Autoplay', isAutoplay: true };
  let tracksToAdd = [];

  // ── Strategi 1: YouTube Mix / Radio playlist dari video ID ──────────────────
  // YouTube Mix URL: watch?v=ID&list=RDID menghasilkan playlist lagu-lagu serupa
  const ytId = seed.identifier;
  const isYtId = ytId && /^[a-zA-Z0-9_-]{11}$/.test(ytId);

  if (isYtId) {
    const mixUrl = `https://www.youtube.com/watch?v=${ytId}&list=RD${ytId}`;
    try {
      const result = await player.search({ query: mixUrl }, requester);
      if (result?.loadType === 'playlist' && result.tracks?.length > 0) {
        tracksToAdd = result.tracks
          .filter((t) => t.info.uri !== seed.uri && !history.has(t.info.uri))
          .slice(0, AUTOPLAY_BATCH);
        if (tracksToAdd.length > 0) {
          logger.debug(
            `Autoplay: YouTube Mix OK — ${tracksToAdd.length} lagu dari seed "${seed.title}" [${guildId(player)}]`
          );
        }
      }
    } catch (err) {
      logger.warn(`Autoplay YouTube Mix gagal: ${err.message}`);
    }
  }

  // ── Strategi 2: Search ytmsearch mix ─────────────────────────────────────────
  if (tracksToAdd.length === 0 && isYtId) {
    const mixSearchQuery = `${seed.title} ${seed.author} mix`;
    try {
      const result = await player.search({ query: mixSearchQuery, source: 'ytmsearch' }, requester);
      if (result?.loadType === 'playlist' && result.tracks?.length > 0) {
        tracksToAdd = result.tracks
          .filter((t) => t.info.uri !== seed.uri && !history.has(t.info.uri))
          .slice(0, AUTOPLAY_BATCH);
      }
    } catch (err) {
      logger.warn(`Autoplay mix search gagal: ${err.message}`);
    }
  }

  // ── Strategi 3: Fallback keyword search — ambil 1 lagu terkait ───────────────
  if (tracksToAdd.length === 0) {
    const query = `${seed.title} ${seed.author}`;
    for (const source of ['ytmsearch', 'scsearch']) {
      try {
        const result = await player.search({ query, source }, requester);
        if (result?.tracks?.length > 0) {
          const filtered = result.tracks.filter(
            (t) => t.info.uri !== seed.uri && !history.has(t.info.uri)
          );
          const track = filtered[0] || result.tracks.find((t) => t.info.uri !== seed.uri) || result.tracks[0];
          if (track) tracksToAdd = [track];
          if (tracksToAdd.length > 0) break;
        }
      } catch (err) {
        logger.warn(`Autoplay fallback [${source}] gagal: ${err.message}`);
      }
    }
  }

  if (tracksToAdd.length === 0) {
    logger.warn(`Autoplay: tidak ada lagu ditemukan untuk seed "${seed.title}" [${guildId(player)}]`);
    return;
  }

  // Tag semua lagu sebagai autoplay agar lavalinkHandler bisa update seed
  for (const track of tracksToAdd) {
    track.requester = { ...requester };
  }

  await player.queue.add(tracksToAdd);
  if (!player.playing) await player.play();

  logger.info(
    `Autoplay [${guildId(player)}]: +${tracksToAdd.length} lagu — seed "${seed.title}" → "${tracksToAdd[0].info.title}"`
  );
}

function guildId(player) { return player.guildId; }

function setVoiceEmoji(guildId, emoji) { voiceEmojiMap.set(guildId, emoji); }
function getVoiceEmoji(guildId) { return voiceEmojiMap.get(guildId) || null; }
function clearVoiceEmoji(guildId) { voiceEmojiMap.delete(guildId); }


function cleanTitle(title) {
  if (!title) return title;
  let t = title;
  // Hapus prefix "Artis - " (format umum YouTube)
  const dash = t.indexOf(" - ");
  if (dash > 0) t = t.slice(dash + 3);
  // Hapus blok parenthesis umum YouTube
  t = t
    .replace(/\s*\[.*?\]/g, "")
    .replace(/\s*\((?:official|lyric|audio|video|mv|hd)[^)]*\)/gi, "")
    .replace(/\s*\((?:feat|ft).?[^)]*\)/gi, "")
    .replace(/\s*\(\s*\)/g, "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
  return t || title;
}
module.exports = {
  setRadioMode,
  isRadioMode,
  getOrCreatePlayer,
  search,
  play,
  setVoiceStatus,
  setAutoplay,
  getAutoplay,
  setSeed,
  getSeed,
  updateAutoplaySeed,
  detectGenre,
  cacheTrack,
  getCachedTracks,
  handleAutoplay,
  setVoiceEmoji,
  getVoiceEmoji,
  clearVoiceEmoji,
  cleanTitle,
};
