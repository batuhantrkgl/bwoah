const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const drivers = require('../../json/drivers.json');
const emojis = require('../../json/emojis.json');
const colors = require('../../json/colors.json');
const formula_e = require('../../json/formula_e.json');
const indycar = require('../../json/indycar.json');
const motogp = require('../../json/motogp.json');
const db = require('orio.db');
const { createCanvas, loadImage } = require('canvas');
const { DOMParser } = require('xmldom');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('next-grandprix')
        .setDescription('Get the details of the next Grand Prix')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Select the motorsport category you want to get the last Grand Prix for.')
                .setRequired(true)
                .addChoices(
                    { name: 'Formula 1', value: 'f1' },
                    { name: 'Formula 1 Academy', value: 'f1-academy' },
                    { name: 'Formula 2', value: 'f2' },
                    { name: 'Formula 3', value: 'f3' },
                    { name: 'Formula E', value: 'fe' },
                    { name: 'IndyCar', value: 'indycar' },
                    { name: 'MotoGP', value: 'motogp' },
                )),
    async execute(interaction) {
        const motorsport = interaction.options.getString('category');
        const year = new Date().getFullYear();
        const url = `https://raw.githubusercontent.com/sportstimes/f1/main/_db/${motorsport}/${year}.json`;

        await interaction.deferReply();  // Defer the reply to give more time for processing

        try {
            const response = await fetch(url);
            const jsonContent = await response.json();
            const currentDate = new Date();
            const sortedRaces = jsonContent.races.filter(race => {
                const raceDate = new Date(race.sessions.gp || race.sessions.feature || race.sessions.race2 || race.sessions.race);
                return raceDate > currentDate;
            }).sort((a, b) => {
                const dateA = new Date(a.sessions.gp || a.sessions.feature || a.sessions.race2 || a.sessions.race);
                const dateB = new Date(b.sessions.gp || b.sessions.feature || b.sessions.race2 || b.sessions.race);
                return dateA - dateB;
            });

            if (!sortedRaces.length) {
                return interaction.editReply('No Grand Prix data available for the selected category.');
            }

            const closestRace = sortedRaces[0];
            const dates = closestRace.sessions.gp || closestRace.sessions.feature || closestRace.sessions.race2 || closestRace.sessions.race;

            let image = '';
            if (['f1', 'f1-academy', 'f2', 'f3'].includes(motorsport)) {
                image = `https://media.formula1.com/image/upload/f_auto/q_auto/v1677244985/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${closestRace.name.replace('Monaco', 'Monoco').replace('Canadian', 'Canada').replace('Spanish', 'Spain').replace('Barcelona', 'Spain')}_Circuit.png.transform/8col/image.png`;
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

            // Function to convert SVG to PNG with specified dimensions
            async function svgToPng(svgUrl, width, height) {
                const response = await fetch(svgUrl);
                const svgText = await response.text();

                // Parse the SVG text and update its width and height attributes
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;

                svgElement.setAttribute('width', width);
                svgElement.setAttribute('height', height);

                const updatedSvgText = svgElement.toString();
                const img = await loadImage('data:image/svg+xml;base64,' + Buffer.from(updatedSvgText).toString('base64'));

                const canvas = createCanvas(width, height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                return canvas.toBuffer('image/png');
            }

            let imageUrl;
            let attachment = null;
            if (image.endsWith('.svg')) {
                const pngBuffer = await svgToPng(image, 1024, 512);
                attachment = new AttachmentBuilder(pngBuffer, { name: 'track.png' });
                imageUrl = 'attachment://track.png';
            } else {
                imageUrl = image;
            }

            const formatDateTime = (dateString) => {
                if (!dateString) return 'N/A';
                const date = new Date(dateString);
                const dateStringFormatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'long' });
                const timeStringFormatted = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
                return `${dateStringFormatted}, ${timeStringFormatted}`;
            };

            const practiceFormatted = formatDateTime(closestRace.sessions.practice);
            const practice1Formatted = formatDateTime(closestRace.sessions.practice1);
            const practice2Formatted = formatDateTime(closestRace.sessions.practice2);
            const fp1Formatted = formatDateTime(closestRace.sessions.fp1);
            const fp2Formatted = formatDateTime(closestRace.sessions.fp2);
            const fp3Formatted = formatDateTime(closestRace.sessions.fp3);
            const qualiFormatted = formatDateTime(closestRace.sessions.qualifying);
            const quali2Formatted = formatDateTime(closestRace.sessions.qualifying2);
            
            let gpFormatted = '';
            if (motorsport == 'f1') {
                gpFormatted = formatDateTime(closestRace.sessions.gp);
            } else if (['f2', 'f3'].includes(motorsport)) {
                gpFormatted = formatDateTime(closestRace.sessions.feature);
            } else if (['fe', 'motogp', 'indycar'].includes(motorsport)) {
                gpFormatted = formatDateTime(closestRace.sessions.race);
            } else if (motorsport == 'f1-academy') {
                gpFormatted = formatDateTime(closestRace.sessions.race2 || closestRace.sessions.race1);
            }
            
            let qualiFilter = '';
            if (motorsport === 'motogp') {
                qualiFilter = formatDateTime(closestRace.sessions.qualifying2)
            } else if (motorsport === 'f1-academy') {
                qualiFilter = formatDateTime(closestRace.sessions.qualifying2 || closestRace.sessions.qualifying1)
            } else {
                qualiFilter = formatDateTime(closestRace.sessions.qualifying)
            } 
            const embed = new EmbedBuilder()
    .setColor(colors[motorsport])
    .setAuthor({ name: `${closestRace.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}` })
    .addFields(
        { name: "Round", value: `${closestRace.round}`, inline: true },
        { name: "Name", value: `${closestRace.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`, inline: true },
    )
    .setImage(imageUrl)
    .setFooter({ text: `${motorsport.toUpperCase()} - ${closestRace.name}` });
if (motorsport === 'indycar') {
} else {
    embed.addFields({ name: "Location", value: `${closestRace.location}`, inline: true })
}

if (motorsport === 'f2' || motorsport === 'f3') {
    embed.addFields(
        { name: "Practice", value: `${practiceFormatted}`, inline: true },
    )
} else if (motorsport === 'fe' || motorsport === 'indycar') {
    embed.addFields(
        { name: "Practice 1", value: `${practice1Formatted}`, inline: true },
        { name: "Practice 2", value: `${practice2Formatted}`, inline: true },
    )
} else if (motorsport === 'motogp' || motorsport === "f1-academy") {
    embed.addFields(
        { name: "Practice 1", value: `${fp1Formatted}`, inline: true },
        { name: "Practice 2", value: `${fp2Formatted}`, inline: true },
    )
} else if (motorsport === 'f1') {
    embed.addFields(
        { name: "Free Practice 1", value: `${fp1Formatted}`, inline: true },
        { name: "Free Practice 2", value: `${fp2Formatted}`, inline: true },
        { name: "Free Practice 3", value: `${fp3Formatted}`, inline: true }
    );
}

embed.addFields(
    { name: "Qualifying", value: `${qualiFilter}`, inline: true },
    { name: "Grand Prix", value: `${gpFormatted}`, inline: true },
);

await interaction.editReply({ embeds: [embed], files: attachment ? [attachment] : [] });
        } catch (error) {
            console.error('Error fetching Grand Prix data:', error);
            await interaction.editReply('There was an error fetching the Grand Prix data.');
        }
    }
};
