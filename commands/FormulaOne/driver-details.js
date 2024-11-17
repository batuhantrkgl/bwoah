const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const driversData = require('../../json/drivers.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('driver-details')
        .setDescription('Get details about a Formula One driver.'),

    async execute(interaction) {
        const response = await fetch('https://api.openf1.org/v1/drivers?session_key=latest');
        const drivers = await response.json();

        const formatName = (fullName) => {
            const [firstName, lastName] = fullName.split(' ');
            return `${firstName} ${lastName.toUpperCase()}`; 
        };

        // Create select menu with driver options and helmet icons
        const select = new StringSelectMenuBuilder()
            .setCustomId('driver-select')
            .setPlaceholder('Select a driver')
            .addOptions(
                drivers.map(driver => {
                    const formattedName = formatName(driver.full_name);
                    const option = {
                        label: formattedName,
                        value: driver.driver_number.toString(),
                        description: `${driver.team_name}`
                    };

                    // Only add emoji if it exists
                    const emojiId = driversData[formattedName]?.emoji_id;
                    if (emojiId) {
                        // Check if it's a custom emoji ID (numeric) or Unicode emoji
                        if (/^\d+$/.test(emojiId)) {
                            option.emoji = { id: emojiId };
                        } else {
                            option.emoji = { name: emojiId };
                        }
                    }

                    return option;
                })
            );

        const row = new ActionRowBuilder()
            .addComponents(select);

        // Send initial message with dropdown
        const reply = await interaction.reply({
            components: [row]
        });

        // Create collector for the select menu interaction
        const collector = interaction.channel.createMessageComponentCollector({
            time: 30000 // Timeout after 30 seconds
        });

        collector.on('collect', async i => {
            if (i.customId === 'driver-select') {
                const driver_number = i.values[0];
                const driverResponse = await fetch(`https://api.openf1.org/v1/drivers?driver_number=${driver_number}&session_key=latest`);
                const jsonContent = await driverResponse.json();
                const driver = jsonContent[0];

                const DriverDetailsEmbed = new EmbedBuilder()
                    .setColor(driver.team_colour)
                    .setAuthor({ 
                        name: driver.full_name, 
                        iconURL: driver.headshot_url, 
                        url: `https://www.formula1.com/en/drivers/${driver.full_name.toLowerCase().replace(/ /g, '-')}.html`
                    })
                    .addFields(
                        { name: 'Driver Number', value: `${driver.driver_number}`, inline: true },
                        { name: 'Broadcast Name', value: driver.broadcast_name, inline: true },
                        { name: 'Team Name', value: driver.team_name, inline: true },
                        { name: 'First Name', value: driver.first_name, inline: true },
                        { name: 'Last Name', value: driver.last_name, inline: true },
                        { name: 'Country Code', value: driver.country_code, inline: true }
                    )
                    .setThumbnail(`https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1024/content/dam/fom-website/manual/Helmets2024/${driver.last_name.toLowerCase()}.png`)
                    .setFooter({ 
                        text: "Formula 1", 
                        iconURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/1200px-F1.svg.png"
                    });

                await i.update({ embeds: [DriverDetailsEmbed], components: []});
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(console.error);
        });
    }
};