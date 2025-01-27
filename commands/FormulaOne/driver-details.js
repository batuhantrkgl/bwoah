const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const driversData = require("../../json/drivers.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("driver-details")
    .setDescription("Get details about a Formula One driver."),

  async execute(interaction) {
    try {
      // Defer reply since this might take time
      await interaction.deferReply();

      const response = await fetch(
        "https://api.openf1.org/v1/drivers?session_key=latest"
      );
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      const drivers = await response.json();

      if (!drivers || drivers.length === 0) {
        return await interaction.editReply(
          "No driver data available at the moment."
        );
      }

      const formatName = (fullName) => {
        const [firstName, lastName] = fullName.split(" ");
        return `${firstName} ${lastName.toUpperCase()}`;
      };

      const select = new StringSelectMenuBuilder()
        .setCustomId("driver-select")
        .setPlaceholder("Select a driver")
        .addOptions(
          drivers.map((driver) => {
            const formattedName = formatName(driver.full_name);
            const option = {
              label: formattedName,
              value: driver.driver_number.toString(),
              description: `${driver.team_name}`,
            };

            const emojiId = driversData[formattedName]?.emoji_id;
            if (emojiId) {
              option.emoji = /^\d+$/.test(emojiId)
                ? { id: emojiId }
                : { name: emojiId };
            }
            return option;
          })
        );

      const row = new ActionRowBuilder().addComponents(select);

      const message = await interaction.editReply({
        content: "Select a driver to view their details:",
        components: [row],
      });

      const collector = message.createMessageComponentCollector({
        time: 30000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "driver-select") {
          try {
            await i.deferUpdate();
            const driver_number = i.values[0];
            const driverResponse = await fetch(
              `https://api.openf1.org/v1/drivers?driver_number=${driver_number}&session_key=latest`
            );
            if (!driverResponse.ok) {
              throw new Error(`Driver API Error: ${driverResponse.status}`);
            }
            const jsonContent = await driverResponse.json();
            const driver = jsonContent[0];

            const DriverDetailsEmbed = new EmbedBuilder()
              .setColor(driver.team_colour || "#000000")
              .setAuthor({
                name: driver.full_name || "Unknown Driver",
                iconURL: driver.headshot_url,
                url: `https://www.formula1.com/en/drivers/${driver.full_name
                  ?.toLowerCase()
                  .replace(/ /g, "-") || 'unknown'}.html`,
              })
              .addFields(
                {
                  name: "Driver Number",
                  value: `${driver.driver_number || 'N/A'}`,
                  inline: true,
                },
                {
                  name: "Broadcast Name",
                  value: driver.broadcast_name || 'N/A',
                  inline: true,
                },
                { 
                  name: "Team Name", 
                  value: driver.team_name || 'N/A', 
                  inline: true 
                },
                { 
                  name: "First Name", 
                  value: driver.first_name || 'N/A', 
                  inline: true 
                },
                { 
                  name: "Last Name", 
                  value: driver.last_name || 'N/A', 
                  inline: true 
                },
                {
                  name: "Country Code",
                  value: driver.country_code || 'N/A',
                  inline: true,
                }
              )
              .setThumbnail(
                `https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1024/content/dam/fom-website/manual/Helmets2024/${(driver.last_name || '').toLowerCase()}.png`
              )
              .setFooter({
                text: "Formula 1",
                iconURL:
                  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/1200px-F1.svg.png",
              });

            await i.editReply({ embeds: [DriverDetailsEmbed], components: [] });
            // Disable collector after successful selection
            collector.stop();
          } catch (error) {
            console.error("Interaction error:", error);
            await i.editReply({
              content: "Error fetching driver details. Please try again.",
              components: [],
            }).catch(console.error);
          }
        }
      });

      collector.on("end", () => {
        // Remove the message.edit() call that was causing the error
      });
    } catch (error) {
      console.error("Command error:", error);
      const errorMessage =
        "There was an error executing this command. Please try again later.";
      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};
