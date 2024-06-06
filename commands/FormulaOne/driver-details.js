const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
	.setName('driver-details')
	.setDescription('Get details about a Formula One driver.')
	.addStringOption(option =>
		option.setName('driver-name')
			.setDescription('Name of the driver you wanna get details about.')
			.setRequired(true)
			.addChoices(
				{ name: 'Max Verstappen', value: '1' }, //RedBull
				{ name: 'Sergio Perez', value: '11' }, // RedBull
				{ name: 'Charles Leclerc', value: '16' }, // Ferrari
                { name: 'Carlos Sainz', value: '55' }, // Ferrari
                { name: 'Lando Norris', value: '4' }, // McLaren
                { name: 'Oscar Piastri', value: '81' }, // McLaren
                { name: 'Lewis Hamilton', value: '44' }, // Mercedes
                { name: 'George Russel', value: '63' }, // Mercedes
                { name: 'Fernando Alonso', value: '14' }, // Aston Martin
                { name: 'Lance Stroll', value: '18' }, // Aston Martin
                { name: 'Nico Hulkenberg', value: '27' }, // HAAS
                { name: 'Kevin Magnussen', value: '20' }, // HAAS
                { name: 'Daniel Ricciardo', value: '3' }, // Visa Cash APP RB
                { name: 'Yuki Tsunoda', value: '22' }, // Visa Cash APP RB
                { name: 'Alexander Albon', value: '23' }, // Williams
                { name: 'Logan Sergeant', value: '2' }, // Williams
                { name: 'Valteri Bottas', value: '77' }, // Kick Sauber
                { name: 'Zhou Guanyu', value: '24' }, // Kick Sauber
                { name: 'Estaban Ocon', value: '31' }, // Alpine
                { name: 'Pierre Gasly', value: '10' }, // Alpine
                )),
	async execute(interaction) {
        const driver_number =  interaction.options.getString("driver-name") 
		fetch(`https://api.openf1.org/v1/drivers?driver_number=${driver_number}&session_key=latest`)
        .then(response => response.json())
        .then(async jsonContent => {
            const driverNumber = jsonContent[0].driver_number;
            const broadcastName = jsonContent[0].broadcast_name;
            const fullName = jsonContent[0].full_name;
            const nameAcronym = jsonContent[0].name_acronym;
            const teamName = jsonContent[0].team_name;
            const teamColour = jsonContent[0].team_colour;
            const firstName = jsonContent[0].first_name;
            const lastName = jsonContent[0].last_name;
            const countryCode = jsonContent[0].country_code;
            const headshotURL = jsonContent[0].headshot_url;
            const DriverURL = fullName.toLowerCase().replace(/ /g, '-');
            const DriverHelmetURL = lastName.toLowerCase()
            
            const DriverDetailsEmbed = new EmbedBuilder()
            .setColor(teamColour)
            .setAuthor({ name: `${fullName}`, iconURL: `${headshotURL}`, url: `https://www.formula1.com/en/drivers/${DriverURL}.html`})
            .addFields(
                { name: 'Driver Number', value: `${driverNumber}`, inline: true },
                { name: 'Broadcast Name', value: `${broadcastName}`, inline: true },
                { name: 'Team Name', value: `${teamName}`, inline: true },
                { name: 'First Name', value: `${firstName}`, inline: true },
                { name: 'Last Name', value: `${lastName}`, inline: true },
                { name: 'Country Code', value: `${countryCode}`, inline: true },
            )
            .setThumbnail(`https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1024/content/dam/fom-website/manual/Helmets2024/${DriverHelmetURL}.png`)
            .setFooter({ text: "Formula 1", iconURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/1200px-F1.svg.png"})

            await interaction.reply({ embeds: [DriverDetailsEmbed] });
        });

	},
};