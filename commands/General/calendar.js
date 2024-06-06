const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('calendar')
    .setDescription("Get details about the This Year's Motosport Calendar")
    .addStringOption(option =>
        option.setName('category')
            .setDescription('Select the motorsport category you want to get the calendar for.')
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
        const motorsport = interaction.options.getString("category");
        const year = new Date().getFullYear();
        fetch(`https://raw.githubusercontent.com/sportstimes/f1/main/_db/${motorsport}/${year}.json`)
        .then(response => response.json())
        .then(async jsonContent => {
            const embed = new EmbedBuilder()
            .setTitle(`${year}'s ${motorsport.toUpperCase() === 'FE' ? 'FORMULA E' : motorsport.toUpperCase()} Calendar`)
                .setColor('#0099ff');
        
            const fields = jsonContent.races.map(race => {
                const raceDate = race.sessions.race || race.sessions.gp || race.sessions.feature || race.sessions.race1 || race.sessions.race2;
                if (!raceDate) {
                    return { name: race.name, value: 'Date not available' };
                }
                const date = new Date(raceDate);
                if (isNaN(date)) {
                    return { name: race.name, value: 'Invalid date format' };
                }
                const formattedDate = `${date.getDate()}, ${date.toLocaleString('default', { month: 'long' })} ${date.toLocaleString('default', { weekday: 'long' })}`;
                return { name: race.name, value: formattedDate };
            });
            
            embed.addFields(fields.map(field => ({ ...field, inline: true })));

            const motorsportLogos = {
                'F1': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/F1_%28registered_trademark%29.svg/320px-F1_%28registered_trademark%29.svg.png',
                'F2': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/FIA_Formula_2_Championship_logo.svg/320px-FIA_Formula_2_Championship_logo.svg.png',
                'F3': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/FIA_Formula_3_Championship_logo.svg/320px-FIA_Formula_3_Championship_logo.svg.png',
                'F1 ACADEMY': 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/F1AcademyLogo.png/800px-F1AcademyLogo.png',
                'FE': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Formula-e-logo-championship_2023.svg/320px-Formula-e-logo-championship_2023.svg.png',
                'INDYCAR': 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b5/IndyCar_Series_logo.svg/223px-IndyCar_Series_logo.svg.png',
                'MOTOGP': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Moto_Gp_logo.svg/486px-Moto_Gp_logo.svg.png'
            };

            let motorsportKey = motorsport.toUpperCase().replace('-', ' ');
            embed.setFooter({
                text: `${motorsportKey} - Total Races: ${jsonContent.races.length}`,
                iconURL: motorsportLogos[motorsportKey]
            });

            await interaction.reply({ embeds: [embed] });
            console.log(`Motorsport: ${motorsport.toUpperCase()}`);
        });
    }
};