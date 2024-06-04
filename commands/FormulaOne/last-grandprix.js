const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const drivers = require('../../json/drivers.json');
const emojis = require('../../json/emojis.json');
const colors = require('../../json/colors.json');
const formula_e = require('../../json/formula_e.json');
const indycar = require('../../json/indycar.json');
const motogp = require('../../json/motogp.json');
const db = require('orio.db');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('last-grandprix')
        .setDescription('Get the details of the last Grand Prix')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Select the motorsport category you want to get the last Grand Prix for.')
                .setRequired(true)
                .addChoices(
                    { name: 'Formula 1', value: 'f1' }, // Formula 1
                    { name: 'Formula 1 Academy', value: 'f1-academy' }, // Formula 1 Academy
                    { name: 'Formula 2', value: 'f2' }, // Formula 2
                    { name: 'Formula 3', value: 'f3' }, // Formula 3
                    { name: 'Formula E', value: 'fe' }, // Formula E
                    { name: 'IndyCar', value: 'indycar' }, // IndyCar
                    { name: 'MotoGP', value: 'motogp' }, // MotoGP
                )),
    async execute(interaction) {
        const motorsport = interaction.options.getString('category');
        const year = new Date().getFullYear();
        const url = `https://raw.githubusercontent.com/sportstimes/f1/main/_db/${motorsport}/${year}.json`;

        try {
            const response = await fetch(url);
            const jsonContent = await response.json();
            const currentDate = new Date();
            const sortedRaces = jsonContent.races.filter(race => {
                const raceDate = new Date(race.sessions.gp || race.sessions.feature || race.sessions.race2 || race.sessions.race);
                return raceDate <= currentDate;
            }).sort((a, b) => {
                const dateA = new Date(a.sessions.gp || a.sessions.feature || a.sessions.race2 || a.sessions.race);
                const dateB = new Date(b.sessions.gp || b.sessions.feature || b.sessions.race2 || b.sessions.race);
                return dateB - dateA;
            });

            if (!sortedRaces.length) {
                return interaction.reply('No Grand Prix data available for the selected category.');
            }

            const closestRace = sortedRaces[0];
            const dates = closestRace.sessions.gp || closestRace.sessions.feature || closestRace.sessions.race2 || closestRace.sessions.race;

            let image = '';
            if (['f1', 'f1-academy', 'f2', 'f3'].includes(motorsport)) {
                image = `https://media.formula1.com/image/upload/f_auto/q_auto/v1677244985/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${closestRace.name.replace('Monaco', 'Monoco')}_Circuit.png.transform/8col/image.png`;
            } else if (motorsport === 'fe') {
                const locationKey = closestRace.location.toLowerCase();
                image = formula_e[locationKey] || '';
            } else if (motorsport === 'indycar') {
                const locationKey = closestRace.name;
                image = indycar[locationKey] || '';
            } else if (motorsport === 'motogp') {
                const locationKey = closestRace.name;
                image = motogp[locationKey] || '';
            }

            const formatDateTime = (dateString) => {
                if (!dateString) return 'N/A';
                const date = new Date(dateString);
                const dateStringFormatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'long' });
                const timeStringFormatted = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
                return `${dateStringFormatted}, ${timeStringFormatted}`;
            };

            const fp1Formatted = formatDateTime(closestRace.sessions.fp1);
            const fp2Formatted = formatDateTime(closestRace.sessions.fp2);
            const fp3Formatted = formatDateTime(closestRace.sessions.fp3);
            const qualiFormatted = formatDateTime(closestRace.sessions.qualifying);
            let gpFormatted = '';

            if (motorsport === 'f1') {
                gpFormatted = formatDateTime(closestRace.sessions.gp);
            } else if (['f2', 'f3', 'motogp', 'indycar'].includes(motorsport)) {
                gpFormatted = formatDateTime(closestRace.sessions.feature);
            } else if (motorsport === 'fe') {
                gpFormatted = formatDateTime(closestRace.sessions.race);
            } else if (motorsport === 'f1-academy') {
                gpFormatted = formatDateTime(closestRace.sessions.race2);
            }

            let winnerDriver = 'Not Avabile.';
            let winnerEmoji = '';
            if (motorsport === 'f1') {
                try {
                    const winnerResponse = await fetch(`https://api.openf1.org/v1/position?session_key=latest&meeting_key=latest&position%3C=1`);
                    const winnerData = await winnerResponse.json();
                    if (winnerData.length > 0) {
                        const winnerNumber = winnerData[0].driver_number;
                        winnerDriver = Object.keys(drivers).find(driver => drivers[driver] === winnerNumber) || 'Unknown';
                        winnerEmoji = emojis[winnerNumber] || '';
                    }
                } catch (error) {
                    console.error('Error fetching winner data:', error);
                }
            }

            const embed = new EmbedBuilder()
                .setColor(colors[motorsport])
                .setAuthor({ name: `${closestRace.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}` })
                .addFields(
                    { name: "Round", value: `${closestRace.round}`, inline: true},
                    { name: "Location", value: `${closestRace.location}`, inline: true},
                    { name: "Name", value: `${closestRace.name}`, inline: true},
                    { name: "Qualifying", value: `${qualiFormatted}`, inline: true},
                    { name: "Grand Prix", value: `${gpFormatted}`, inline: true},
                    { name: "Winner", value: `${winnerEmoji} ${winnerDriver}`, inline: true}
                )
                .setImage(image)
                .setFooter({ text: `${motorsport.toUpperCase()} - ${closestRace.name}` });

            if (motorsport === 'f1') {
                embed.addFields(
                    { name: "Free Practice 1", value: `${fp1Formatted}`, inline: true },
                    { name: "Free Practice 2", value: `${fp2Formatted}`, inline: true },
                    { name: "Free Practice 3", value: `${fp3Formatted}`, inline: true }
                );
            }

            interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching Grand Prix data:', error);
            interaction.reply('There was an error fetching the Grand Prix data.');
        }
    }
};
