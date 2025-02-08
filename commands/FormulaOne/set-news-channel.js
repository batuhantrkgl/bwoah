const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('orio.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setnewschannel')
        .setDescription('Set the channel for F1 news updates')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send F1 news')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Permission Error')
                .setDescription('You need Administrator permissions to use this command!')
                .setTimestamp();

            return interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        
        if (!channel.isTextBased()) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Invalid Channel')
                .setDescription('Please select a text channel!')
                .setTimestamp();

            return interaction.reply({ 
                embeds: [errorEmbed],
                ephemeral: true 
            });
        }

        db.set(`newschannel_${interaction.guild.id}`, channel.id);

        const successEmbed = new EmbedBuilder()
            .setColor('#e10600')  // F1 red color
            .setTitle('✅ Channel Set Successfully')
            .setDescription(`F1 News will now be sent to ${channel}`)
            .addFields({
                name: 'Channel',
                value: channel.toString(),
                inline: true
            })
            .setFooter({
                text: 'Formula 1 News System',
                iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/2560px-F1.svg.png'
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });
    },
};
