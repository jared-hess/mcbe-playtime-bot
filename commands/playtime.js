const assert = require('assert');
const moment = require('moment');
const QuickChart = require('quickchart-js');

module.exports = {
  name: 'playtime',
  description: 'Get Playtime',
  cooldown: 5,
  execute(message, args) {
    const { client } = message;
    const db = client.db.sessions;
    const name = args[0];
    const tempDate = new Date();
    console.log(tempDate);
    // tempDate.setDate(tempDate.getDate() - 7);
    tempDate.setDate(tempDate.getDate() - 30);
    const startDate = new Date(tempDate.toDateString());
    console.log(startDate);

    const agg = [
      {
        $match: {
          name,
          start: { $gt: startDate },
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
        docs.reverse();
        const labels = docs.map(x => moment(x._id.date).format("ddd"));
        const data = docs.map(x => x.total);
        const label = "Hours"

        const chart = new QuickChart();
        chart.setConfig({
          type: 'bar',
          data: { labels, datasets: [{ label, data }] },
        });
        const chartEmbed = {
          title: 'Playtime',
          description: `Playtime for user  ${name}  over the last week`,
          image: {
            url: chart.getUrl(),
          },
        };
        message.channel.send({ embed: chartEmbed });
      });
    });

  },
};
