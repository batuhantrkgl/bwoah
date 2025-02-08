const { SlashCommandBuilder } = require('discord.js');

const legends = {
    'vettel': {
        name: 'Sebastian Vettel',
        championships: 4,
        wins: 53,
        podiums: 122,
        poles: 57,
        fastestLaps: 38,
        raceStarts: 299,
        points: 3098,
        teams: ['BMW Sauber', 'Toro Rosso', 'Red Bull', 'Ferrari', 'Aston Martin'],
        years: '2007-2022',
        firstWin: '2008 Italian Grand Prix',
        lastWin: '2019 Singapore Grand Prix',
        nationality: 'German',
        image: 'https://raw.githubusercontent.com/batuhantrkgl/bwoah/main/assets/images/vettel.jpg',
        description: 'The youngest F1 World Champion, known for his dominance with Red Bull Racing.',
        currentStatus: 'Retired from F1 (2022). Environmental activist and sustainability advocate.',
    },
    'schumacher': {
        name: 'Michael Schumacher',
        championships: 7,
        wins: 91,
        podiums: 155,
        poles: 68,
        fastestLaps: 77,
        raceStarts: 306,
        points: 1566,
        teams: ['Jordan', 'Benetton', 'Ferrari', 'Mercedes'],
        years: '1991-2012',
        firstWin: '1992 Belgian Grand Prix',
        lastWin: '2006 Chinese Grand Prix',
        nationality: 'German',
        image: 'https://raw.githubusercontent.com/batuhantrkgl/bwoah/main/assets/images/schumacher.jpg',
        description: 'The most successful F1 driver of his era, dominated with Ferrari in the early 2000s.',
        currentStatus: 'Retired from racing. Continuing recovery since 2013 accident.',
    },
    'senna': {
        name: 'Ayrton Senna',
        championships: 3,
        wins: 41,
        podiums: 80,
        poles: 65,
        fastestLaps: 19,
        raceStarts: 161,
        points: 610,
        teams: ['Toleman', 'Lotus', 'McLaren', 'Williams'],
        years: '1984-1994',
        firstWin: '1985 Portuguese Grand Prix',
        lastWin: '1993 Australian Grand Prix',
        nationality: 'Brazilian',
        image: 'https://raw.githubusercontent.com/batuhantrkgl/bwoah/main/assets/images/senna.jpg',
        description: 'Widely regarded as one of the greatest F1 drivers of all time, known for his raw speed and wet-weather mastery.',
        currentStatus: 'Passed away in 1994 at Imola Circuit. Rest in peace...',
    },
    'raikkonen': {
        name: 'Kimi Räikkönen',
        championships: 1,
        wins: 21,
        podiums: 103,
        poles: 18,
        fastestLaps: 46,
        raceStarts: 349,
        points: 1873,
        teams: ['Sauber', 'McLaren', 'Ferrari', 'Lotus', 'Alfa Romeo'],
        years: '2001-2021',
        firstWin: '2003 Malaysian Grand Prix',
        lastWin: '2018 United States Grand Prix',
        nationality: 'Finnish',
        image: 'https://raw.githubusercontent.com/batuhantrkgl/bwoah/main/assets/images/raikkonen.jpg',
        description: 'Known as "The Iceman", famous for his straightforward personality and exceptional speed.',
        currentStatus: 'Retired from F1 (2021). Currently racing in NASCAR.',
    },
    'hamilton': {
        name: 'Lewis Hamilton [Mercedes Era]',
        championships: 7,
        wins: 104,
        podiums: 192,
        poles: 103,
        fastestLaps: 61,
        raceStarts: 332,
        points: 4492.5,
        teams: ['McLaren', 'Mercedes', 'Ferrari'],
        years: '2007-Present',
        firstWin: '2007 Canadian Grand Prix',
        lastWin: '2024 British Grand Prix',
        nationality: 'British',
        image: 'https://raw.githubusercontent.com/batuhantrkgl/bwoah/main/assets/images/hamilton.jpg',
        description: 'Joint record holder for most World Championships, known for his exceptional qualifying pace and consistency.',
        currentStatus: 'Active F1 driver with HP Scuderia Ferrari.',
    },
    'alonso': {
        name: 'Fernando Alonso',
        championships: 2,
        wins: 32,
        podiums: 106,
        poles: 22,
        fastestLaps: 23,
        raceStarts: 377,
        points: 2267,
        teams: ['Minardi', 'Renault', 'McLaren', 'Ferrari', 'Alpine', 'Aston Martin'],
        years: '2001-Present',
        firstWin: '2003 Hungarian Grand Prix',
        lastWin: '2013 Spanish Grand Prix',
        nationality: 'Spanish',
        image: 'https://raw.githubusercontent.com/batuhantrkgl/bwoah/main/assets/images/alonso.jpg',
        description: 'Known for his exceptional race craft and ability to extract maximum performance from any car.',
        currentStatus: 'Active F1 driver with Aston Martin.',
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('legend')
        .setDescription('Get information about F1 legends')
        .addStringOption(option =>
            option.setName('driver')
                .setDescription('Name of the F1 legend')
                .setRequired(true)
                .addChoices(
                    { name: 'Sebastian Vettel', value: 'vettel' },
                    { name: 'Michael Schumacher', value: 'schumacher' },
                    { name: 'Ayrton Senna', value: 'senna' },
                    { name: 'Kimi Räikkönen', value: 'raikkonen' },
                    { name: 'Lewis Hamilton', value: 'hamilton' },
                    { name: 'Fernando Alonso', value: 'alonso' }
                )),

    async execute(interaction) {
        const driverChoice = interaction.options.getString('driver');
        const legend = legends[driverChoice];

        if (!legend) {
            return interaction.reply('Legend not found! Please try again with a valid driver name.');
        }

        const embed = {
            color: 0xFF0000,
            title: `${legend.name} (${legend.nationality})`,
            description: legend.description,
            fields: [
                { name: 'World Championships', value: legend.championships.toString(), inline: true },
                { name: 'Race Starts', value: legend.raceStarts.toString(), inline: true },
                { name: 'Podiums', value: legend.podiums.toString(), inline: true },
                { name: 'Pole Positions', value: legend.poles.toString(), inline: true },
                { name: 'Race Wins', value: legend.wins.toString(), inline: true },
                { name: 'Fastest Laps ', value: legend.fastestLaps.toString(), inline: true },
                { name: 'Career Points', value: legend.points.toString(), inline: true },
                { name: 'Active Years', value: legend.years, inline: true },
                { name: 'First Win', value: legend.firstWin, inline: true },
                { name: 'Last Win', value: legend.lastWin, inline: true },
                { name: 'Current Status', value: legend.currentStatus, inline: false },
                { name: 'Teams', value: legend.teams.join(', '), inline: false },
            ],
            thumbnail: { url: legend.image },
            footer: { text: 'F1 Legends • All-time Statistics' },
        };

        await interaction.reply({ embeds: [embed] });
    },
};