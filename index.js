/* eslint-disable linebreak-style */
require('dotenv').config();
const fs = require('fs');
const Discord = require('discord.js');
const { MongoClient } = require('mongodb');
const splitargs = require('splitargs');
const fetchAllMessages = require('./utils/fetch-all');
const { SessionManager } = require('./utils/session-manager');

// Env Vars
const prefix = process.env.PREFIX;
const token = process.env.DISCORD_TOKEN;
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const serverName = process.env.SERVER_NAME;
const watchChannel = process.env.WATCH_CHANNEL;
const commandChannel = process.env.COMMAND_CHANNEL;

// DB
MongoClient.connect(mongoUrl, (err, dbclient) => {
  if (err) {
    console.log(err);
    return;
  }
  const db = dbclient.db('playtimeBotDB');
  const sessions = db.collection('sessions');
  sessions.createIndex({ session_id: 1 }, { unique: true });
  const client = new Discord.Client();
  client.commands = new Discord.Collection();
  client.db = { sessions };

  // Session manager
  const sessionManager = new SessionManager(sessions);
  // Setup discord command folder
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));
  commandFiles.forEach((file) => {
    // eslint-disable-next-line import/no-dynamic-require
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
  });

  client.on('ready', async () => {
    console.log('I am ready!');
    const guild = client.guilds.cache.find((x) => x.name === serverName);
    const channel = guild.channels.cache.find((x) => x.name === watchChannel);

    // Set avatar
    client.user.setAvatar('./avatar.png')
      .then(() => console.log('New avatar set!'))
      .catch(console.error);

    sessions.find().sort({ end: -1 }).limit(1).toArray()
      .then((result) => {
        let minTime;
        if (result.length > 0) {
          minTime = result[0].end.getTime();
        }
        sessionManager.pause().then(async () => {
          const allMessages = await fetchAllMessages(channel, {
            reverseArray: true, // Reverse the returned array
            userOnly: false, // Only return messages by users
            botOnly: true, // Only return messages by bots
            pinnedOnly: false, // Only returned pinned messages
            minTime,
          });
          sessionManager.bulkAddMessage(allMessages);
          sessionManager.resume();
        });
      });
  });

  // Create an event listener for messages
  client.on('message', (message) => {
    if (message.channel.name === watchChannel) {
      sessionManager.addMessage(message);
    }

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    if (message.channel.name !== commandChannel) return;

    // Replace incorrect quotes
    const args = splitargs(message.content.slice(prefix.length).trim().replace(/“|”/g, '"'));
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName)
      || client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    if (command.guildOnly && message.channel.type === 'dm') {
      return message.reply('I can\'t execute that command inside DMs!');
    }

    if (command.permissions) {
      const authorPerms = message.channel.permissionsFor(message.author);
      if (!authorPerms || !authorPerms.has(command.permissions)) {
        return message.reply('You can not do this!');
      }
    }

    if (command.args && !args.length) {
      let reply = `You didn't provide any arguments, ${message.author}!`;

      if (command.usage) {
        reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
      }

      return message.channel.send(reply);
    }

    try {
      command.execute(message, args);
    } catch (error) {
      console.error(error);
      message.reply('there was an error trying to execute that command!');
    }
  });

  // Log our bot in using the token from https://discord.com/developers/applications
  client.login(token);
});
