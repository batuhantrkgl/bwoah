const { Events, PresenceUpdateStatus } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		client.user.setActivity(`${Math.ceil((new Date('2024-06-15') - new Date()) / (1000 * 60 * 60 * 24))} days Left to LeMans!`);
		client.user.setStatus(PresenceUpdateStatus.Idle);
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
