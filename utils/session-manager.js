const Queue = require('bull');
require('dotenv').config();

class SessionManager {
  constructor(collection) {
    this.sessions = collection;
    this.logins = {};
    this.messageQ = new Queue('messages', process.env.REDIS_URL);
    this.messageQ.process((job, done) => {
      const { data } = job;
      this.parseMessage(data).then(() => done());
    });
  }

  async addMessage(message) {
    const { content } = message;
    // const { guild } = message;
    const timestamp = new Date(message.createdTimestamp);
    console.log(`${content} ${timestamp}`);

    // Lower number is higher priority, so we can use the timestamp as priority directly
    const job = await this.messageQ.add(message, { priority: timestamp.getTime() });
    return job;
  }

  async resume() {
    // Returns a promise
    return this.messageQ.resume();
  }

  async pause() {
    // Returns a promise
    return this.messageQ.pause();
  }

  async parseMessage(message) {
    let resultPromise;
    const { content } = message;
    // const { guild } = message;
    const timestamp = new Date(message.createdTimestamp);
    console.log(`${content} ${timestamp}`);

    if (content.includes(' connected ')) {
      const { id } = message;
      const name = content.split(' connected ')[0];
      this.logins[name] = { timestamp, id };
    } else if (content.includes(' disconnected ')) {
      const name = content.split(' disconnected ')[0];

      if (name in this.logins) {
        const start = this.logins[name].timestamp;
        const { id } = this.logins[name];
        const end = timestamp;
        const duration = end - start;
        console.log('duration:', duration);
        const session = {
          name, session_id: id, start, end, duration,
        };
        // Ignore error due to duplicate docs
        resultPromise = this.sessions.insertOne(session, (err, doc) => { if (err && err.code !== 11000) throw err; });
        delete this.logins[name];
      } else {
        console.log(`Disconnect for ${name} found with no connect. Skipping...`);
      }
    } else if (content.includes(' stopping')) {
      Object.keys(this.logins).forEach((name) => {
        const start = this.logins[name].timestamp;
        const { id } = this.logins[name];
        const end = timestamp;
        const duration = end - start;
        console.log('duration:', duration);
        const session = {
          name, session_id: id, start, end, duration,
        };
        // Ignore error due to duplicate docs
        resultPromise = this.sessions.insertOne(session, (err, doc) => session, (err, doc) => { if (err && err.code !== 11000) throw err; });
        delete this.logins[name];
      });
      this.logins = {};
    } else {
      resultPromise = Promise.resolve();
    }
    return resultPromise;
  }
}

exports.SessionManager = SessionManager;
