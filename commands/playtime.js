const assert = require('assert');
const Moment = require('moment');
const MomentRange = require('moment-range');
const QuickChart = require('quickchart-js');

const moment = MomentRange.extendMoment(Moment);

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
    tempDate.setDate(tempDate.getDate() - 7);
    // tempDate.setDate(tempDate.getDate() - 30);
    const startDate = new Date(tempDate.toDateString());
    console.log(startDate);
    const endDate = new Date();

    const momentRange = moment.range(startDate, endDate);
    console.log(momentRange);

    console.log(Array.from(momentRange.by("day")).map( x => x.format("YYYY-MM-DD")))

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
      }, 

      {
        $project: {
          total: '$total',
          date: '$_id.date',
        },
      }, {
        $group: {
          _id: null,
          days: {
            $push: '$$ROOT',
          },
        },
      }, {
        $project: {
          days: {
            $map: {
              input: Array.from(momentRange.by('day')).map( x => x.format("YYYY-MM-DD")),
              as: 'date',
              in: {
                $let: {
                  vars: {
                    dateIndex: {
                      $indexOfArray: [
                        '$days.date', '$$date',
                      ],
                    },
                  },
                  in: {
                    $cond: {
                      if: {
                        $ne: [
                          '$$dateIndex', -1,
                        ],
                      },
                      then: {
                        $arrayElemAt: [
                          '$days', '$$dateIndex',
                        ],
                      },
                      else: {
                        date: '$$date',
                        total: 0,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }, {
        $unwind: {
          path: '$days',
          includeArrayIndex: 'string',
          preserveNullAndEmptyArrays: true,
        },
      }, {
        $replaceRoot: {
          newRoot: '$days',
        },
      },

    ];

    db.aggregate(agg, (cmdErr, result) => {
      assert.equal(null, cmdErr);
      result.toArray((err, docs) => {
        console.log(err);
        console.log(docs);
       // docs.reverse();
        const labels = docs.map((x) => moment(x.date).format('MMM D'));
        const data = docs.map((x) => x.total);
        const label = 'Hours';

        const chart = new QuickChart();
        chart.setConfig({
          type: 'bar',
          data: { labels, datasets: [{ label, data }] },
        });
        const chartEmbed = {
          title: 'Playtime',
          description: `Playtime for user ${name} over the last week`,
          image: {
            url: chart.getUrl(),
          },
        };
        message.channel.send({ embed: chartEmbed });
      });
    });
  },
};
