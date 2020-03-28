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
    case 'last':
      const latest = await FriendlyFires.findOne({
        attributes: ['killer', 'victim', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      message.reply(`${latest.dataValues.killer} killed ${latest.dataValues.victim} \n ${moment(latest.dataValues.createdAt).fromNow()}`);
      break;
    case 'scoreboard':
      const scoreboard = await FriendlyFires.findAll({
        attributes: [
          'killer',
          [Sequelize.fn('COUNT', 'Killer'), 'numberOfKills']
        ],
        group: 'killer'
      });

      message.reply(scoreboard.map(record => {
        return `${record.dataValues.killer} -- ${record.dataValues.numberOfKills}`;
      }));
      break;
    case 'killed':
      if (!args.length) {
        message.reply('who did what?');
        return;
      }
      const killer = getUserFromMention(args.shift());
      const victim = getUserFromMention(args.shift());

      try {
        // equivalent to: INSERT INTO tags (name, descrption, username) values (?, ?, ?);
        const friendlyFire = await FriendlyFires.create({
          killer: killer.username,
          victim: victim.username,
        });
        return message.reply(`Record added.`);
      } catch (e) {
        console.log(e);
        return message.reply('Something went wrong with adding a tag.');
      }
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
