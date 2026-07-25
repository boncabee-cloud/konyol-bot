require('dotenv').config();

// Replit has no IPv6 routing. The ws library uses Happy Eyeballs (tries IPv6+IPv4
// in parallel) so the IPv6 ETIMEDOUT fires first and breaks the Lavalink WebSocket.
// Patch dns.lookup to always resolve as IPv4-only before any modules are imported.
const dns = require('dns');
const _origLookup = dns.lookup.bind(dns);
dns.lookup = function patchedLookup(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  if (typeof options === 'number') { options = { family: 4 }; }
  else { options = Object.assign({}, options, { family: 4 }); }
  return _origLookup(hostname, options, callback);
};

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { createLavalinkManager } = require('./lavalink/LavalinkClient');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { loadLavalinkEvents } = require('./handlers/lavalinkHandler');
const { setupAntiCrash } = require('./utils/errorHandler');
const { keepAlive } = require('./utils/keep_alive');
const config = require('./config/config');
const logger = require('./utils/logger');

if (!config.token) {
  logger.error('DISCORD_TOKEN is missing. Please set it in your environment variables.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
  rest: { timeout: 15000 },
});

setupAntiCrash(client);

client.lavalink = createLavalinkManager(client);

client.on('raw', (d) => {
  client.lavalink.sendRawData(d);
});

// ── v4.0.8: Graceful shutdown — tutup semua sesi Lavalink sebelum process berhenti ──
async function gracefulShutdown(signal) {
  logger.info(`[Shutdown] Menerima signal ${signal} — memulai graceful shutdown...`);

  try {
    // Hancurkan semua player aktif agar sesi Lavalink ditutup bersih
    if (client.lavalink) {
      const players = client.lavalink.players;
      if (players && players.size > 0) {
        logger.info(`[Shutdown] Menghentikan ${players.size} player aktif...`);
        for (const [, player] of players) {
          try {
            await player.destroy();
          } catch (e) {
            // abaikan error saat shutdown
          }
        }
      }

      // Tutup semua koneksi node Lavalink
      const nodes = client.lavalink.nodeManager?.nodes;
      if (nodes && nodes.size > 0) {
        logger.info(`[Shutdown] Menutup ${nodes.size} node Lavalink...`);
        for (const [, node] of nodes) {
          try {
            await node.destroy();
          } catch (e) {
            // abaikan error saat shutdown
          }
        }
      }
    }

    // Logout dari Discord secara bersih
    if (client.isReady()) {
      logger.info('[Shutdown] Logout dari Discord...');
      await client.destroy();
    }

    logger.info('[Shutdown] Selesai. Bot berhenti dengan bersih.');
  } catch (err) {
    logger.error(`[Shutdown] Error saat shutdown: ${err.message}`);
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

async function start() {
  try {
    await loadCommands(client);
    await loadEvents(client);
    await loadLavalinkEvents(client);

    keepAlive();

    await client.login(config.token);
    logger.info('Bot is starting...');
  } catch (err) {
    logger.error(`Fatal startup error: ${err.stack || err.message}`);
    process.exit(1);
  }
}

start();
