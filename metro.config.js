const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep Metro's file crawler out of Git internals. In this checkout, the shared
// Git dir can expose Windows reparse points like `.git/index.lock` that Metro's
// fallback watcher cannot safely stat.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList]),
  /.*[/\\]\.git[/\\].*/,
];

module.exports = config;
