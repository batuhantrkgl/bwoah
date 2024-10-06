const { Events, PresenceUpdateStatus } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		const year = new Date().getFullYear();
		const motorsport = 'f1'; // Assuming you want the Formula 1 calendar

		try {
			const response = await fetch(`https://raw.githubusercontent.com/sportstimes/f1/main/_db/${motorsport}/${year}.json`);
			const jsonContent = await response.json();

			const currentDate = new Date();
			let nextRace = null;

			// Find the next race
			for (const race of jsonContent.races) {
				const raceDate = new Date(race.sessions.race || race.sessions.gp || race.sessions.feature || race.sessions.race1 || race.sessions.race2);
				if (raceDate > currentDate) {
					nextRace = { name: race.name, date: raceDate };
					break;
				}
			}

			if (nextRace) {
				const daysLeft = Math.ceil((nextRace.date - currentDate) / (1000 * 60 * 60 * 24));
				client.user.setActivity(`${daysLeft} days until ${nextRace.name}!`);
			} else {
				client.user.setActivity("No upcoming races!");
			}
		} catch (error) {
			console.error("Error fetching the F1 calendar:", error);
			client.user.setActivity("Error fetching race data.");
		}

		client.user.setStatus(PresenceUpdateStatus.Idle);
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
