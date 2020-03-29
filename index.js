const { prefix, token } = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();
const Sequelize = require('sequelize');
const moment = require('moment');

const sequelize = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'database.sqlite',
});

const FriendlyFires = sequelize.define('friendlyfires', {
	killer: {
		type: Sequelize.STRING,
	},
  victim: {
		type: Sequelize.STRING,
  }
});

client.on('ready', () => {
  FriendlyFires.sync();
 });

const commandHandler = async (message) => {
  if (!message.content.startsWith(prefix)) {
    return;
  }
  const args = message.content.slice(prefix.length).split(' ');
  const command = args.shift().toLowerCase();
  switch (command) {
    case 'help':
      message.reply(`!last \n !scoreboard \n !unluckiest \n !killed @killer @victim \n !reset`);
      break;
    case 'last':
      const latest = await FriendlyFires.findOne({
        attributes: ['killer', 'victim', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      message.channel.send(`${latest.dataValues.killer} killed ${latest.dataValues.victim} \n ${moment(latest.dataValues.createdAt).fromNow()}`);
      break;
    case 'scoreboard':
      const scoreboard = await FriendlyFires.findAll({
        attributes: [
          'killer',
          [Sequelize.fn('COUNT', 'Killer'), 'numberOfKills']
        ],
        group: 'killer'
      });

      message.channel.send(scoreboard.map(record => {
        return `${record.dataValues.killer} -- ${record.dataValues.numberOfKills}`;
      }));
      break;
    case 'unluckiest':
      const unlucky = await FriendlyFires.findAll({
        attributes: [
          'victim',
          [Sequelize.fn('COUNT', 'Victim'), 'numberOfKills']
        ],
        order: [sequelize.literal('numberOfKills DESC')],
        group: 'victim'
      });

      message.channel.send(unlucky.map(record => {
        return `${record.dataValues.victim} -- ${record.dataValues.numberOfKills}`;
      }));
      break;
    case 'killed':
      if (args.length !== 2) {
        message.reply('who did what?');
        return;
      }
      const killer = getUserFromMention(args.shift());
      const victim = getUserFromMention(args.shift());

      try {
        // equivalent to: INSERT INTO tags (name, descrption, username) values (?, ?, ?);
        await FriendlyFires.create({
          killer: killer.username,
          victim: victim.username,
        });
        return message.reply(`Record added.`);
      } catch (e) {
        console.log(e);
        return message.reply('Something went wrong with adding a tag.');
      }
      break;
    case 'reset':
      message.reply('Are you sure?');
      let filter = msg => msg.author.id == message.author.id && msg.content.toLowerCase() == 'yes';
      await message.channel.awaitMessages(filter, { max: 1, time: 20000 });
      FriendlyFires.destroy({
        where: {},
        truncate: true
      });
      message.reply('Reset the stats.');
      break;
    default:
      message.reply('dont know that command');
  }
}

function getUserFromMention(mention) {
	// The id is the first and only match found by the RegEx.
	const matches = mention.match(/^<@!?(\d+)>$/);

	// If supplied variable was not a mention, matches will be null instead of an array.
	if (!matches) return;

	// However the first element in the matches array will be the entire mention, not just the ID,
	// so use index 1.
	const id = matches[1];

	return client.users.cache.get(id);
}

client.on('message', async message => {
  commandHandler(message);
});

client.login(token);
