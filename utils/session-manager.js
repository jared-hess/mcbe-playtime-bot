class SessionManager {
  constructor(collection) {
    this.sessions = collection;
    this.logins = {};
  }

  parseMessage(message) {
    const { content } = message;
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
        this.sessions.insertOne(session, (err, doc) => { if (err && err.code !== 11000) throw err; });
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
        this.sessions.insertOne(session, (err, doc) => session, (err, doc) => { if (err && err.code !== 11000) throw err; });
        delete this.logins[name];
      });
      this.logins = {};
    }
  }
}

exports.SessionManager = SessionManager;
