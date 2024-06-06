const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thanks')
        .setDescription('Show appreciation for various APIs and libraries'),
    async execute(interaction) {
        /**
         * Creates an embed message for displaying special thanks.
         * @class
         */
        const embed = new EmbedBuilder()
            .setTitle('Special thanks to the following:')
            .addFields({ name: 'OpenF1 API ', value: '[Support Them](https://openf1.org/) - Most of our Realtime Formula 1 data is provided by OpenF1 API, Thanks to them! [💗](https://www.youtube.com/watch?v=zlFGMK0QccI)'})
            // .addFields({ name: 'F1Calendar API', value: '[Support Them](https://f1calendar.com) - Most of our Calendar and other sport data is provided by F1Calendar API, Thanks to them! [💗](https://)'})
            .addFields({ name: 'GitHub Copilot', value: '[Support Them](https://github.com) - For assisting with code generation [💗](https://https://raw.githubusercontent.com/batuhantrkgl/easteregg-fundation/main/nothingyet.txt)'})
            // .addFields({ name: 'Canvas', value: '[Support Them](https://www.npmjs.com/package/canvas) - For creating graphics and images [💗](https://)'})
            .addFields({ name: 'Discord.js', value: '[Support Them](https://discord.js.org/) - For making this project possible! [💗](https://youtube.com/@bedprod)'})
            .addFields({ name: 'Orio.db', value: '[Support Them](https://www.npmjs.com/package/orio.db) - For storing data in a database [💗](https://t.me/batuhan_s_builds)'})
            .addFields({ name: 'Node.js', value: '[Support Them](https://nodejs.org) - For running the bot [💗](https://instagram.com/otus9051)'})
            .addFields({ name: 'Community', value: '[Support Us](https://buymeacoffee.com/batuhantrkgl) - For supporting us and giving us feedback [💗](https://instagram.com/batuhantrkgl)'})
            .setColor('#FFD700')
            .setTimestamp()

        await interaction.reply({ embeds: [embed] });
    },
};