const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("drivers-championship")
    .setDescription("Get the current Formula 1 Drivers' Championship standings"),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const response = await fetch("http://api.jolpi.ca/ergast/f1/2024/driverstandings");
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const standings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;

      // Create paginated embed
      await showStandings(interaction, standings, 0);

    } catch (error) {
      console.error("Command error:", error);
      await interaction.editReply("There was an error fetching the championship standings.");
    }
  },
};

async function showStandings(interaction, standings, currentPage) {
  const driversPerPage = 10;
  const maxPages = Math.ceil(standings.length / driversPerPage);
  const start = currentPage * driversPerPage;
  const end = start + driversPerPage;
  const currentStandings = standings.slice(start, end);

  const embed = new EmbedBuilder()
    .setTitle(`2024 Formula 1 Driver's Championship Standings (Page ${currentPage + 1}/${maxPages})`)
    .setColor("#ff1801")
    .setTimestamp()
    .setFooter({
      text: "Formula 1 Drivers Championship",
      iconURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/1200px-F1.svg.png",
    });

  const fields = currentStandings.map(standing => {
    const driver = standing.Driver;
    const constructor = standing.Constructors[0];
    const emoji = getConstructorEmoji(constructor.constructorId);

    return {
      name: `${standing.position}. ${driver.givenName} ${driver.familyName}`,
      value: `Team: ${emoji} - Points: **${standing.points}**`,
      inline: false
    };
  });

  embed.addFields(fields);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === maxPages - 1)
    );

  const reply = await interaction.editReply({
    embeds: [embed],
    components: [row]
  });

  const collector = reply.createMessageComponentCollector({
    time: 120000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: 'This button is not for you!', ephemeral: true });
      return;
    }

    // Update the page number based on button press
    const newPage = i.customId === 'prev' ? currentPage - 1 : currentPage + 1;
    
    // Create new embed and row for the new page
    const newEmbed = new EmbedBuilder()
      .setTitle(`2024 Formula 1 Driver's Championship Standings (Page ${newPage + 1}/${maxPages})`)
      .setColor("#ff1801")
      .setTimestamp()
      .setFooter({
        text: "Formula 1 Drivers Championship",
        iconURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/1200px-F1.svg.png",
      });

    const newStart = newPage * driversPerPage;
    const newEnd = newStart + driversPerPage;
    const newCurrentStandings = standings.slice(newStart, newEnd);

    const newFields = newCurrentStandings.map(standing => {
      const driver = standing.Driver;
      const constructor = standing.Constructors[0];
      const emoji = getConstructorEmoji(constructor.constructorId);

      return {
        name: `${standing.position}. ${driver.givenName} ${driver.familyName}`,
        value: `Team: ${emoji} - Points: **${standing.points}**`,
        inline: false
      };
    });

    newEmbed.addFields(newFields);

    const newRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(newPage === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(newPage === maxPages - 1)
      );

    await i.update({
      embeds: [newEmbed],
      components: [newRow]
    });
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );

    await interaction.editReply({
      embeds: [embed],
      components: [disabledRow]
    });
  });
}

function getConstructorEmoji(constructorId) {
  const constructorEmojis = {
    "red_bull": "<:Redbull:1333117466762809365>",
    "ferrari": "<:Scuderia_Ferrari:1333115836562407474>",
    "mclaren": "<:McLaren_Speedmark:1333116771716038678>",
    "mercedes": "<:MercedesBenz_Star:1333117809869459578>",
    "aston_martin": "<:Aston_Martin_Lagonda_brand_logo:1333118056423231498>",
    "alpine": "<:Alpine_logo:1333118212363124818>",
    "williams": "<:Logo_Williams_F1:1333118411940561048>",
    "rb": "<:vcarblogoportraitwhite:1333118695895203871>",
    "sauber": "<:StakeF1TeamKickSauber:1247283394589626449>",
    "haas": "<:Logo_Haas_F1:1333119080214953984>"
  };

  return constructorEmojis[constructorId] || "🏎️";
}