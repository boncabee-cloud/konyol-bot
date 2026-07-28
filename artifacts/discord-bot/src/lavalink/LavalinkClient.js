const { LavalinkManager } = require('lavalink-client');
const config = require('../config/config');
const logger = require('../utils/logger');

function buildNodes() {
  return config.lavalink.nodes.map((n) => ({
    authorization: n.password,
    host: n.host,
    port: n.port,
    id: n.id,
    secure: n.secure,
    retryAmount: 50,
    retryDelay: 5000,
    closeOnError: false,
    requestTimeout: 30000,
  }));
}

function createLavalinkManager(client) {
  const nodes = buildNodes();
  logger.info(`Configuring ${nodes.length} Lavalink node(s): ${nodes.map((n) => n.id).join(', ')}`);

  const manager = new LavalinkManager({
    nodes,
    sendToShard: (guildId, payload) => {
      try {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      } catch (err) {
        logger.error(`sendToShard error: ${err.message}`);
      }
    },
    client: {
      id: config.clientId,
      username: 'MusicBot',
    },
    playerOptions: {
      applyVolumeAsFilter: false,
      clientBasedPositionUpdateInterval: 100,
      defaultSearchPlatform: config.music.searchPlatform,
      volumeDecrementer: 1.0,
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false,
      },
      onEmptyQueue: {
        destroyAfterMs: config.music.leaveOnEmptyDelay,
      },
    },
    autoSkip: true,
    autoSkipOnResolveError: true,
    emitNewSongsOnly: true,
  });

  try {
    if (manager.nodeManager) {
      manager.nodeManager.on('error', (node, error) => {
        const msg = error?.message || (typeof error === 'string' ? error : 'unknown error');
        logger.error(`Lavalink NodeManager raw error [${node?.id || 'unknown'}]: ${msg}`);
      });
    }
  } catch (e) {
    logger.warn(`Could not attach nodeManager error listener: ${e.message}`);
  }

  manager.on('nodeConnect', (node) => {
    logger.info(`✅ Lavalink node [${node.id}] (${node.options?.host}) terhubung`);
  });

  manager.on('nodeDisconnect', (node, reason) => {
    logger.warn(`⚠️  Lavalink node [${node.id}] terputus: ${reason?.reason || 'unknown'} — mencoba reconnect...`);
  });

  manager.on('nodeError', (node, error) => {
    const msg = error?.message || (typeof error === 'string' ? error : 'connection error');
    logger.error(`❌ Lavalink node [${node?.id || 'unknown'}] error: ${msg}`);
  });

  manager.on('nodeReconnect', (node) => {
    logger.info(`🔄 Lavalink node [${node.id}] sedang reconnect...`);
  });

  manager.on('nodeDestroy', (node, destroyReason) => {
    logger.warn(`🗑️  Lavalink node [${node.id}] destroyed: ${destroyReason || 'unknown'}`);
  });

  return manager;
}

module.exports = { createLavalinkManager };
