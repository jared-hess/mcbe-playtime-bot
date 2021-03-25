require('dotenv').config();
const fs = require('fs');
const Discord = require('discord.js');
const { MongoClient } = require('mongodb');
const splitargs = require('splitargs');
const fetchAll = require('discord-fetch-all');

// Env Vars
const prefix = process.env.PREFIX;
const token = process.env.DISCORD_TOKEN;
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';

// DB
MongoClient.connect(mongoUrl, (err, dbclient) => {
  const db = dbclient.db('mytestingdb');
  const sessions = db.collection('sessions');
  sessions.createIndex({ session_id: 1 }, { unique: true });
  const client = new Discord.Client();
  client.commands = new Discord.Collection();
  client.db = { sessions };

  // Setup discord command folder
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));
  commandFiles.forEach((file) => {
    // eslint-disable-next-line import/no-dynamic-require
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
  });

  const rawdata = fs.readFileSync('data.json');
  const data = JSON.parse(rawdata);
  const { messages } = data;
  let logins = {};
  Object.keys(messages).forEach((i) => {
    const message = messages[i];
    const { content } = message;
    const timestamp = new Date(message.timestamp);
    console.log(`${content} ${timestamp}`);

    if (content.includes(' connected ')) {
      const { id } = message;
      const name = content.split(' connected ')[0];
      logins[name] = { timestamp, id };
    } else if (content.includes(' disconnected ')) {
      const name = content.split(' disconnected ')[0];

      if (name in logins) {
        const start = logins[name].timestamp;
        const { id } = logins[name];
        const end = timestamp;
        const duration = end - start;
        console.log('duration:', duration);
        const session = {
          name, session_id: id, start, end, duration,
        };
        sessions.insertOne(session, (err, doc) => console.log(doc));
        delete logins[name];
      } else {
        console.log(`Disconnect for ${name} found with no connect. Skipping...`);
      }
    } else if (content.includes(' stopping')) {
      Object.keys(logins).forEach((name) => {
        const start = logins[name].timestamp;
        const { id } = logins[name];
        const end = timestamp;
        const duration = end - start;
        console.log('duration:', duration);
        const session = {
          name, session_id: id, start, end, duration,
        };
        sessions.insertOne(session, (err, doc) => console.log(doc));
        delete logins[name];
      });
      logins = {};
    }
  });

  client.on('ready', async () => {
    console.log('I am ready!');
    const guild = client.guilds.cache.find( x => x.name === 'Telepath Test Server');
    const channel = guild.channels.cache.find( x => x.name === 'server-joins');
    const allMessages = await fetchAll.messages(channel, {
      reverseArray: true, // Reverse the returned array
      userOnly: false, // Only return messages by users
      botOnly: true, // Only return messages by bots
      pinnedOnly: false, // Only returned pinned messages
  });
  console.log(allMessages);

  });

  // Create an event listener for messages
  client.on('message', (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    // const args = message.content.slice(prefix.length).trim().split(/ +/);
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
