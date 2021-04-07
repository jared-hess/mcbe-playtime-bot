Object.defineProperty(exports, '__esModule', { value: true });
// const discord_js_1 = require('discord.js');
module.exports = async (channel, options = {
  reverseArray: false, userOnly: false, botOnly: false, pinnedOnly: false,
}) => {
  const {
    reverseArray, userOnly, botOnly, pinnedOnly, minTime,
  } = options;
  let messages = [];
  let lastID;
  while (true) { // eslint-disable-line no-constant-condition
    // eslint-disable-next-line no-await-in-loop
    const fetchedMessages = await channel.messages.fetch({
      limit: 100,
      ...(lastID && { before: lastID }),
    });
    if (fetchedMessages.size === 0) {
      if (reverseArray) { messages = messages.reverse(); }
      if (userOnly) { messages = messages.filter((msg) => !msg.author.bot); }
      if (botOnly) { messages = messages.filter((msg) => msg.author.bot); }
      if (pinnedOnly) { messages = messages.filter((msg) => msg.pinned); }
      return messages;
    }
    messages = messages.concat(Array.from(fetchedMessages.values()));
    lastID = fetchedMessages.lastKey();
    if (minTime) {
      if (fetchedMessages.get(fetchedMessages.lastKey()).createdTimestamp < minTime) {
        if (reverseArray) { messages = messages.reverse(); }
        if (userOnly) { messages = messages.filter((msg) => !msg.author.bot); }
        if (botOnly) { messages = messages.filter((msg) => msg.author.bot); }
        if (pinnedOnly) { messages = messages.filter((msg) => msg.pinned); }
        return messages;
      }
    }
  }
};
