const assert = require('assert');
const moment = require('moment');
const QuickChart = require('quickchart-js');

module.exports = {
  name: 'playtimeleaders',
  description: 'Get Playtime Leader Board',
  cooldown: 5,
  execute(message, args) {
    let lookbackDays = 30;
    const { client } = message;
    const db = client.db.sessions;
    if (args.length === 1) {
      lookbackDays = parseInt(args[0], 10);
    }
    if (args.length > 1) {
      message.channel.send('Max of one argument supported');
    }
    if (!lookbackDays) {
      message.channel.send('If argument is supplied, it must be an integer (number of days)');
    }

    const endTime = moment().utc();
    const startTime = moment(endTime).utc().subtract(lookbackDays - 1, 'days').startOf('day');

    const agg = [
      {
        $match: {
          start: { $gt: startTime.toDate() },
        },
      },
      {
        $group: {
          _id: {
            name: '$name',
          },
          total: {
            $sum: {
              $divide: [
                '$duration', 1000 * 60 * 60,
              ],
            },
          },
        },
      },
      {
        $sort: {
          total: 1,
        },
      },
    ];

    db.aggregate(agg, (cmdErr, result) => {
      assert.equal(null, cmdErr);
      result.toArray((err, docs) => {
        console.log(docs);
        docs.reverse();
        const labels = docs.map((x) => x._id.name);
        const data = docs.map((x) => x.total);
        const label = 'Hours';
        console.log(labels);
        console.log(data);

        const chart = new QuickChart();
        chart.setConfig({
          type: 'horizontalBar',
          data: { labels, datasets: [{ label, data }] },
        })
          .setWidth(1000)
          .setHeight(600);
        console.log(chart.getUrl());
        const chartEmbed = {
          title: 'Leaders',
          description: `Playtime leaders for the last ${lookbackDays} days`,
          image: {
            url: chart.getUrl(),
          },
        };
        message.channel.send({ embed: chartEmbed });
      });
    });
  },
};
