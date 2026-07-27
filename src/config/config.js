require('dotenv').config();

module.exports = {
  prefix: process.env.PREFIX || '?',
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID || '1507649904456241202',
  guildId: process.env.GUILD_ID || null,

  lavalink: {
    nodes: [
      {
        id: 'primary',
        host: process.env.LAVALINK_HOST || 'lavalinkv4.serenetia.com',
        port: parseInt(process.env.LAVALINK_PORT || '443'),
        password: process.env.LAVALINK_PASSWORD || 'https://seretia.link/discord',
        // Default true — port 443 selalu butuh SSL
        secure: process.env.LAVALINK_SECURE !== 'false',
        selfSigned: process.env.LAVALINK_SELF_SIGNED === 'true',
        retryAmount: 15,
        retryDelay: 5000,
      },
      // Fallback node — aktif otomatis jika primary down
      {
        id: 'fallback',
        host: process.env.LAVALINK_HOST_2 || 'lavalink.serenetia.com',
        port: parseInt(process.env.LAVALINK_PORT_2 || '443'),
        password: process.env.LAVALINK_PASSWORD_2 || 'https://dsc.gg/srnti',
        secure: process.env.LAVALINK_SECURE_2 !== 'false',
        selfSigned: false,
        retryAmount: 15,
        retryDelay: 5000,
      },
    ],
  },

  radio: {
    stations: [
      { name: 'Lofi Girl',       url: 'https://ice6.somafm.com/lush-128-mp3',        emoji: '📻' },
      { name: 'Synthwave Radio', url: 'https://ice6.somafm.com/synphaera-128-mp3',   emoji: '🌆' },
      { name: 'Jazz & Blues',    url: 'https://ice4.somafm.com/jazz24-128-mp3',      emoji: '🎷' },
      { name: 'Chillhop',        url: 'https://ice6.somafm.com/groovesalad-128-mp3', emoji: '🐸' },
      { name: 'Deep Focus',      url: 'https://ice6.somafm.com/dronezone-128-mp3',   emoji: '🧘' },
    ],
  },

  music: {
    defaultVolume: parseInt(process.env.DEFAULT_VOLUME || '80'),
    maxQueueSize: 500,
    // Batas durasi: 2 jam (7200000 ms). 0 = tidak ada batas.
    maxDuration: parseInt(process.env.MAX_DURATION || '7200000'),
    searchPlatform: 'ytsearch',
    leaveOnEmptyDelay: 30000,
    leaveOnEndDelay: 30000,
    voiceChannelBitrate: 320000,
  },

  cooldowns: {
    default: 3000,
    play: 5000,
    skip: 2000,
    volume: 100,
  },

  keepAlive: {
    port: parseInt(process.env.PORT || '3000'),
  },

  colors: {
    primary: 0x5865F2,
    success: 0x57F287,
    warning: 0xFEE75C,
    error: 0xED4245,
    info: 0x5865F2,
  },
};
