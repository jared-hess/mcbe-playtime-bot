module.exports = {
  name: 'playtime',
  description: 'Get Playtime',
  cooldown: 5,
  execute(message, args) {
    const { client } = message;
    const { db } = client;

    const name = args[0];
    db.find({ name }, (err, docs) => {
      console.log(docs[0].duration._milliseconds);
      console.log(typeof docs[0].duration._milliseconds);
      ms = docs.reduce((acc, cur) => acc + cur.duration._milliseconds, 0);
      message.channel.send(ms / (1000 * 60 * 60));
    });

    message.channel.send('Pong.');
  },
};
