const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('orio.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogchannel')
        .setDescription('Set the channel for F1 schedule updates')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send F1 updates')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if user has administrator permissions
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: 'You need Administrator permissions to use this command!',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        
        // Check if the channel is a text channel
        if (!channel.isTextBased()) {
            return interaction.reply({ 
                content: 'Please select a text channel!', 
                ephemeral: true 
            });
        }

        // Save the channel ID to the database
        db.set(`logchannel_${interaction.guild.id}`, channel.id);

        await interaction.reply({
            content: `Successfully set ${channel} as the F1 updates channel!`,
            ephemeral: true
        });
    },
};
