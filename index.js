require('dotenv').config();
const fs = require('fs');
const moment = require('moment');
const Datastore = require('nedb');
const Discord = require('discord.js');

const db = new Datastore();
const client = new Discord.Client();
client.commands = new Discord.Collection();
client.db = db;

// Env Vars
const prefix = process.env.PREFIX
const token = process.env.DISCORD_TOKEN

// Setup discord command folder
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
commandFiles.forEach(file => {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
})


const rawdata = fs.readFileSync('data.json');
const data = JSON.parse(rawdata);
const { messages } = data;
let logins = {};
const sessions = [];
Object.keys(messages).forEach((i) => {
  const message = messages[i];
  const { content } = message;
  const timestamp = moment(message.timestamp);
  console.log(`${content} ${timestamp.format()}`);

  if (content.includes(' connected ')) {
    const name = content.split(' connected ')[0];
    logins[name] = timestamp;
  } else if (content.includes(' disconnected ')) {
    const name = content.split(' disconnected ')[0];

    if (name in logins) {
      const start = logins[name];
      const end = timestamp;
      const duration = moment.duration(end.diff(start));
      const session = { name, start, duration };
      db.insert(session, (err, doc) => console.log('Inserted', doc.name, 'with ID', doc._id));
      sessions.push(session);
      delete logins[name];
    } else {
      console.log(`Disconnect for ${name} found with no connect. Skipping...`);
    }
  } else if (content.includes(' stopping')) {
    Object.keys(logins).forEach((name) => {
      const start = logins[name];
      const end = timestamp;
      const duration = moment.duration(end.diff(start));
      const session = { name, start, duration };
      db.insert(session, (err, doc) => console.log('Inserted', doc.name, 'with ID', doc._id));
      sessions.push(session);
      delete logins[name];
    });
    logins = {};
  }
});

client.on('ready', () => {
  console.log('I am ready!');
});

// Create an event listener for messages
client.on('message', (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();


  const command = client.commands.get(commandName)
    || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

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


