const { checkCooldown } = require('../utils/cooldown');
const { errorEmbed } = require('../utils/embeds');
const { handleCommandError } = require('../utils/errorHandler');
const { setAutoplay, getAutoplay } = require('../music/MusicManager');
const config = require('../config/config');
const logger = require('../utils/logger');

// Command yang TIDAK mematikan autoplay saat dijalankan
const AUTOPLAY_SAFE_COMMANDS = new Set([
  'autoplay', 'play', 'skip', 'volume', 'nowplaying', 'queue',
  'pause', 'resume', 'loop', 'seek', 'shuffle', 'remove', 'clear', 'move', 'filter',
]);

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    const cooldownMs = command.cooldown ?? config.cooldowns.default;
    const { onCooldown, remaining } = checkCooldown(
      message.author.id,
      commandName,
      cooldownMs
    );

    if (onCooldown) {
      return message.reply({
        embeds: [errorEmbed(`Tunggu **${remaining}s** lagi sebelum menggunakan perintah ini.`)],
      });
    }

    // Matikan autoplay hanya jika command bukan bagian dari AUTOPLAY_SAFE_COMMANDS
    if (!AUTOPLAY_SAFE_COMMANDS.has(commandName) && getAutoplay(message.guild.id)) {
      setAutoplay(message.guild.id, false);
      logger.debug(`Autoplay dimatikan karena command "${commandName}" di guild ${message.guild.id}`);
    }

    try {
      await command.execute(client, message, args);
    } catch (err) {
      await handleCommandError(message, err, true);
      logger.error(`Prefix command error [${commandName}]: ${err.stack}`);
    }
  },
};
