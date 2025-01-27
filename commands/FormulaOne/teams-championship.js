const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("teams-championship")
    .setDescription("Get the current Formula 1 Constructors Championship standings"),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const response = await fetch("http://api.jolpi.ca/ergast/f1/2024/constructorstandings/");
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const standings = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;

      const embed = new EmbedBuilder()
        .setTitle("2024 Formula 1 Constructors's Championship Standings")
        .setColor("#ff1801")
        .setTimestamp()
        .setFooter({
          text: "Formula 1 Constructors Championship",
          iconURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/1200px-F1.svg.png",
        });

      // Create fields for each constructor's standing
      const fields = standings.map(standing => {
        const constructor = standing.Constructor;
        const emoji = getConstructorEmoji(constructor.constructorId);

        return {
          name: `${emoji} ${standing.position}. ${constructor.name}`,
          value: `Points: **${standing.points}** | Wins: **${standing.wins}**`,
        };
      });

      // Add fields to embed in groups of 3 for better formatting
      for (let i = 0; i < fields.length; i += 3) {
        embed.addFields(fields.slice(i, i + 3));
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Command error:", error);
      await interaction.editReply("There was an error fetching the championship standings.");
    }
  },
};

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