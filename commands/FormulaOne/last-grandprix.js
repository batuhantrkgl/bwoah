const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('last-grandprix')
    .setDescription('Get details about the last Formula One Grand Prix.'),
    async execute(interaction) {
        fetch('https://api.openf1.org/v1/meetings?year=2024')
  .then(response => response.json())
  .then(async meetings => {
    // Sort meetings by date_start in descending order
    meetings.sort((a, b) => new Date(b.date_start) - new Date(a.date_start));
    // Select the latest meeting
    const latestMeeting = meetings[0];

    const LastGrandPrix = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('Last Grand Prix')
    .setImage(`https://media.formula1.com/image/upload/f_auto/q_auto/v1677244984/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${latestMeeting.country_name.replace('Monaco', 'Monoco')}_Circuit.png.transform/8col/image.png`)
    .addFields(
        { name: 'Circuit Name', value: `${latestMeeting.meeting_official_name}`, inline: true },
        { name: 'Circuit Short Name', value: `${latestMeeting.circuit_short_name}`, inline: true },
        { name: 'Location', value: `${latestMeeting.location}`, inline: true },
        { name: 'Country Code', value: `${latestMeeting.country_code}`, inline: true },
        { name: 'Country Name', value: `${latestMeeting.country_name}`, inline: true },
        { name: "Grand Prix's name", value: `${latestMeeting.meeting_name}`, inline: true },
        { 
            name: "Started At", 
            value: `${new Date(latestMeeting.date_start).toISOString().split('T')[0]}`, 
            inline: true 
        },
        { 
            name: "Day", 
            value: `${new Date(latestMeeting.date_start).toUTCString().split(' ')[0]} ${new Date(latestMeeting.date_start).toUTCString().split(' ')[1]} ${new Date(latestMeeting.date_start).toUTCString().split(' ')[2]}`, 
            inline: true 
        },
        { 
           name: "Hour:Minute", 
           value: `${new Date(latestMeeting.date_start).getUTCHours()}:${new Date(latestMeeting.date_start).getUTCMinutes() < 10 ? '0' : ''}${new Date(latestMeeting.date_start).getUTCMinutes()}`, 
           inline: true 
        },
       )

    await interaction.reply({ embeds: [LastGrandPrix] });
  })
  .catch(error => console.error('Error:', error));
    },
};