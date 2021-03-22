const moment = require('moment');
const stringify = require('csv-stringify');
const Datastore = require('nedb');

const db = new Datastore();

const fs = require('fs');

const rawdata = fs.readFileSync('data.json');
const data = JSON.parse(rawdata);
const { messages } = data;
let logins = {};
const sessions = [];
Object.keys(messages).forEach(i => {
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
    logins.forEach(name => {
      const start = logins[name];
      const end = timestamp;
      const duration = moment.duration(end.diff(start));
      const session = { name, start, duration };
      db.insert(session, (err, doc) => console.log('Inserted', doc.name, 'with ID', doc._id));
      sessions.push(session);
      delete logins[name];
    })
    logins = {};
  }
})
