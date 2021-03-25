const assert = require('assert');

module.exports = {
  name: 'playtime',
  description: 'Get Playtime',
  cooldown: 5,
  execute(message, args) {
    const { client } = message;
    const db = client.db.sessions;

    const name = args[0];
    db.find({ name }).toArray((err, docs) => {
      console.log(docs[0].duration);
      console.log(typeof docs[0].duration);
      const ms = docs.reduce((acc, cur) => acc + cur.duration, 0);
      message.channel.send(ms / (1000 * 60 * 60));
    });

    const agg = [
      {
        $match: {
          name,
        },
      }, {
        $project: {
          year: {
            $year: '$start',
          },
          day: {
            $dayOfYear: '$start',
          },
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$start',
            },
          },
          duration: 1,
        },
      }, {
        $group: {
          _id: {
            date: '$date',
          },
          total: {
            $sum: {
              $divide: [
                '$duration', 1000 * 60 * 60,
              ],
            },
          },
        },
      }, {
        $sort: {
          '_id.date': -1,
        },
      }, {
        $limit: 7,
      },
    ];

    db.aggregate(agg, (cmdErr, result) => {
      assert.equal(null, cmdErr);
      result.toArray((err, docs) => {
        console.log(docs);
      });
    });

    message.channel.send('Pong.');
  },
};
