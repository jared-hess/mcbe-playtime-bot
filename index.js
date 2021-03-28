require('dotenv').config();
const fs = require('fs');
const Discord = require('discord.js');
const { MongoClient } = require('mongodb');
const splitargs = require('splitargs');
const fetchAll = require('discord-fetch-all');
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
  const db = dbclient.db('mytestingdb');
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

  // const rawdata = fs.readFileSync('data.json');
  // const data = JSON.parse(rawdata);
  // const { messages } = data;
  // Object.keys(messages).forEach((i) => {
  //   const message = messages[i];

  //   sessionManager.parseMessage(message);

  // });

  client.on('ready', async () => {
    console.log('I am ready!');
    const guild = client.guilds.cache.find((x) => x.name === serverName);
    const channel = guild.channels.cache.find((x) => x.name === watchChannel);
    const allMessages = await fetchAll.messages(channel, {
      reverseArray: true, // Reverse the returned array
      userOnly: false, // Only return messages by users
      botOnly: true, // Only return messages by bots
      pinnedOnly: false, // Only returned pinned messages
    });
    // console.log(allMessages);
    allMessages.forEach((message) => {
      console.log(message);
      sessionManager.parseMessage(message);
    });
  });

  // Create an event listener for messages
  client.on('message', (message) => {
    if (message.channel.name === watchChannel) {
      sessionManager.parseMessage(message);
    }

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    if (message.channel.name !== commandChannel) return;

    const args = splitargs(message.content.slice(prefix.length).trim());
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
