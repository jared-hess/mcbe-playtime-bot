const assert = require('assert');
const moment = require('moment');
const QuickChart = require('quickchart-js');

module.exports = {
  name: 'playtimeleaders',
  description: 'Get Playtime Leader Board',
  cooldown: 5,
  execute(message, args) {
    const { client } = message;
    const db = client.db.sessions;
    const name = args[0];
    const tempDate = new Date();
    const lookbackDays = 30;
    console.log(tempDate);
    // tempDate.setDate(tempDate.getDate() - 7);
    tempDate.setDate(tempDate.getDate() - lookbackDays);
    const startDate = new Date(tempDate.toDateString());
    console.log(startDate);

    const agg = [
      // {
      //   $match: {
      //     name,
      //     start: { $gt: startDate },
      //   },
      // },
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

        const chart = new QuickChart();
        chart.setConfig({
          type: 'horizontalBar',
          data: { labels, datasets: [{ label, data }] },
        });
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
