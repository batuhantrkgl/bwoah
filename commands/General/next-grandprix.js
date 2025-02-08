const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  InteractionReplyOptions,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const drivers = require("../../json/drivers.json");
const emojis = require("../../json/emojis.json");
const colors = require("../../json/colors.json");
const formula_e = require("../../json/formula_e.json");
const indycar = require("../../json/indycar.json");
const motogp = require("../../json/motogp.json");
const db = require("orio.db");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { DOMParser } = require("xmldom");

function getWindDirection(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degrees ?? 0) % 360) / 22.5);
  return directions[index % 16];
}

async function getTrackInfo(raceName, category) {  // Add category parameter
  try {
    let wikiName;
    
    if (category === 'fe') {
      // Handle Formula E races
      wikiName = raceName
        .replace(" Circuit", "")
        .replace(/ /g, '_')
        .replace(/^(.+)$/, "$1_ePrix");  // Use ePrix suffix for Formula E
    } else {
      // Handle other racing series
      wikiName = raceName
        .replace(" Circuit", "")
        .replace(/ /g, '_')
        .replace(/^(.+)$/, "$1_Grand_Prix");
    }

    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiName}`);
    if (!response.ok) return { error: "Failed to load race information." };
    
    const data = await response.json();
    return {
      description: data.description || "Motor racing event",
      extract: data.extract || "No race information available.",
      thumbnail: data.thumbnail?.source,
      url: data.content_urls?.desktop?.page || ""
    };
  } catch (error) {
    console.error('Error fetching race info:', error);
    return { error: "Failed to load race information." };
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("next-grandprix")
    .setDescription("Get the details of the next Grand Prix")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription(
          "Select the motorsport category you want to get the last Grand Prix for."
        )
        .setRequired(true)
        .addChoices(
          { name: "Formula 1", value: "f1" },
          { name: "Formula 1 Academy", value: "f1-academy" },
          { name: "Formula 2", value: "f2" },
          { name: "Formula 3", value: "f3" },
          { name: "Formula E", value: "fe" },
          { name: "IndyCar", value: "indycar" },
          { name: "MotoGP", value: "motogp" }
        )
    ),
  async execute(interaction) {
    const motorsport = interaction.options.getString("category");
    let year = new Date().getFullYear();
    let url = `https://raw.githubusercontent.com/sportstimes/f1/main/_db/${motorsport}/${year}.json`;

    await interaction.deferReply(); // Defer the reply to give more time for processing

    try {
      let response = await fetch(url);
      if (!response.ok)
        throw new Error(`Network response was not ok for URL: ${url}`);
      let jsonContent = await response.json();
      let currentDate = new Date();
      let sortedRaces = jsonContent.races
        .filter((race) => {
          const raceDate = new Date(
            race.sessions.gp ||
              race.sessions.feature ||
              race.sessions.race2 ||
              race.sessions.race
          );
          return raceDate > currentDate;
        })
        .sort((a, b) => {
          const dateA = new Date(
            a.sessions.gp ||
              a.sessions.feature ||
              a.sessions.race2 ||
              a.sessions.race
          );
          const dateB = new Date(
            b.sessions.gp ||
              b.sessions.feature ||
              b.sessions.race2 ||
              b.sessions.race
          );
          return dateA - dateB;
        });

      // If no upcoming races are found for the current year, check the next year
      if (!sortedRaces.length) {
        year += 1;
        url = `https://raw.githubusercontent.com/sportstimes/f1/main/_db/${motorsport}/${year}.json`;
        response = await fetch(url);
        if (!response.ok) {
          if (response.status === 404) {
            return interaction.editReply({
              content: `${motorsport.toUpperCase()} calendar for ${year} is not ready yet, check again later.`,
              flags: MessageFlags.Ephemeral,
            });
          }
          throw new Error(`Network response was not ok for URL: ${url}`);
        }
        jsonContent = await response.json();
        sortedRaces = jsonContent.races
          .filter((race) => {
            const raceDate = new Date(
              race.sessions.gp ||
                race.sessions.feature ||
                race.sessions.race2 ||
                race.sessions.race
            );
            return raceDate > currentDate;
          })
          .sort((a, b) => {
            const dateA = new Date(
              a.sessions.gp ||
                a.sessions.feature ||
                a.sessions.race2 ||
                a.sessions.race
            );
            const dateB = new Date(
              b.sessions.gp ||
                b.sessions.feature ||
                b.sessions.race2 ||
                b.sessions.race
            );
            return dateA - dateB;
          });
      }

      if (!sortedRaces.length) {
        return interaction.editReply(
          "No Grand Prix data available for the selected category."
        );
      }

      const closestRace = sortedRaces[0];
      const dates =
        closestRace.sessions.gp ||
        closestRace.sessions.feature ||
        closestRace.sessions.race2 ||
        closestRace.sessions.race;

      let image = "";
      if (["f1", "f1-academy", "f2", "f3"].includes(motorsport)) {
        image = `https://media.formula1.com/image/upload/f_auto/q_auto/v1677244985/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${closestRace.name
          .replace("Monaco", "Monoco")
          .replace("Canadian", "Canada")
          .replace("Spanish", "Spain")
          .replace("Barcelona", "Spain")
          .replace("Las Vegas", "Las_Vegas")
          .replace(
            "Australian",
            "Australia"
          ).replace("Chinese", "China")}_Circuit.png.transform/8col/image.png`;
      } else if (motorsport === "fe") {
        const locationKey = closestRace.location.toLowerCase();
        image = formula_e[locationKey] || "";
      } else if (motorsport === "indycar") {
        const locationKey = closestRace.name;
        image = indycar[locationKey] || "";
      } else if (motorsport === "motogp") {
        const locationKey = closestRace.name;
        image = motogp[locationKey] || "";
      }

      // Function to convert SVG to PNG with specified dimensions
      async function svgToPng(svgUrl, width, height) {
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        // Parse the SVG text and update its width and height attributes
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = svgDoc.documentElement;

        svgElement.setAttribute("width", width);
        svgElement.setAttribute("height", height);

        const updatedSvgText = svgElement.toString();
        const img = await loadImage(
          "data:image/svg+xml;base64," +
            Buffer.from(updatedSvgText).toString("base64")
        );

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        return canvas.toBuffer("image/png");
      }

      let imageUrl;
      let attachment = null;
      if (image.endsWith(".svg")) {
        const pngBuffer = await svgToPng(image, 1024, 512);
        attachment = new AttachmentBuilder(pngBuffer, { name: "track.png" });
        imageUrl = "attachment://track.png";
      } else {
        imageUrl = image;
      }

      const formatDateTime = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        const dateStringFormatted = date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          weekday: "long",
        });
        const timeStringFormatted = date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
        });

        // Calculate relative time
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        let relativeTime;
        if (days > 60) {
          const months = Math.floor(days / 30);
          relativeTime = `in ${months} month${months > 1 ? 's' : ''}`;
        } else if (days > 0) {
          relativeTime = `in ${days} day${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
          relativeTime = `in ${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
          relativeTime = 'starting soon';
        }

        return `${dateStringFormatted}, ${timeStringFormatted} (${relativeTime})`;
      };

      const practiceFormatted = formatDateTime(closestRace.sessions.practice);
      const practice1Formatted = formatDateTime(closestRace.sessions.practice1);
      const practice2Formatted = formatDateTime(closestRace.sessions.practice2);
      const fp1Formatted = formatDateTime(closestRace.sessions.fp1);
      const fp2Formatted = formatDateTime(closestRace.sessions.fp2);
      const fp3Formatted = formatDateTime(closestRace.sessions.fp3);
      const qualiFormatted = formatDateTime(closestRace.sessions.qualifying);
      const quali2Formatted = formatDateTime(closestRace.sessions.qualifying2);

      const motorsportLogos = {
        F1: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/F1_%28registered_trademark%29.svg/320px-F1_%28registered_trademark%29.svg.png",
        F2: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/FIA_Formula_2_Championship_logo.svg/320px-FIA_Formula_2_Championship_logo.svg.png",
        F3: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/FIA_Formula_3_Championship_logo.svg/320px-FIA_Formula_3_Championship_logo.svg.png",
        "F1 ACADEMY":
          "https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/F1AcademyLogo.png/800px-F1AcademyLogo.png",
        FE: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Formula-e-logo-championship_2023.svg/320px-Formula-e-logo-championship_2023.svg.png",
        INDYCAR:
          "https://upload.wikimedia.org/wikipedia/en/thumb/b/b5/IndyCar_Series_logo.svg/223px-IndyCar_Series_logo.svg.png",
        MOTOGP:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Moto_Gp_logo.svg/486px-Moto_Gp_logo.svg.png",
      };

      let motorsportKey = motorsport.toUpperCase().replace("-", " ");
      let gpFormatted = "";
      if (motorsport == "f1") {
        gpFormatted = formatDateTime(closestRace.sessions.gp);
      } else if (["f2", "f3"].includes(motorsport)) {
        gpFormatted = formatDateTime(closestRace.sessions.feature);
      } else if (["fe", "motogp", "indycar"].includes(motorsport)) {
        gpFormatted = formatDateTime(closestRace.sessions.race);
      } else if (motorsport == "f1-academy") {
        gpFormatted = formatDateTime(
          closestRace.sessions.race2 || closestRace.sessions.race1
        );
      }

      let qualiFilter = "";
      if (motorsport === "motogp") {
        qualiFilter = formatDateTime(closestRace.sessions.qualifying2);
      } else if (motorsport === "f1-academy") {
        qualiFilter = formatDateTime(
          closestRace.sessions.qualifying2 || closestRace.sessions.qualifying1
        );
      } else {
        qualiFilter = formatDateTime(closestRace.sessions.qualifying);
      }

      // Add weather data fetching for F1
      let weatherData = null;
      if (motorsport === 'f1') {
        try {
          // Get races list from OpenF1 API
          const openF1Response = await fetch('https://api.openf1.org/v1/meetings');
          const meetings = await openF1Response.json();
          
          // Find the next race's meeting key
          const nextMeeting = meetings.find(meeting => 
            meeting.country_name === closestRace.location || 
            meeting.meeting_name.includes(closestRace.name)
          );

          if (nextMeeting) {
            const weatherResponse = await fetch(`https://api.openf1.org/v1/weather?meeting_key=${nextMeeting.meeting_key}`);
            if (weatherResponse.ok) {
              const weatherArray = await weatherResponse.json();
              if (weatherArray.length > 0) {
                weatherData = weatherArray[weatherArray.length - 1];
              }
            }
          }
        } catch (weatherError) {
          console.error('Error fetching weather data:', weatherError);
        }
      }

      // Session times in a code block
      let sessionFields = ['```'];  // Removed duplicate '📅 Session Schedule\n'
      
      if (motorsport === "f2" || motorsport === "f3") {
        sessionFields.push(`Practice  : ${practiceFormatted}`);
      } else if (motorsport === "fe" || "indycar") {
        sessionFields.push(
          `Practice 1: ${practice1Formatted}`,
          `Practice 2: ${practice2Formatted}`
        );
      } else if (motorsport === "motogp" || motorsport === "f1-academy") {
        sessionFields.push(
          `Practice 1: ${fp1Formatted}`,
          `Practice 2: ${fp2Formatted}`
        );
      } else if (motorsport === "f1") {
        sessionFields.push(
          `Practice 1: ${fp1Formatted}`,
          `Practice 2: ${fp2Formatted}`,
          `Practice 3: ${fp3Formatted}`
        );
      }

      sessionFields.push(
        `Qualifying: ${qualiFilter}`,
        `Race      : ${gpFormatted}`,
        '```'
      );

      // Create pages
      const pages = [
        // Page 1: Race Info and Schedule
        new EmbedBuilder()
          .setColor(colors[motorsport])
          .setAuthor({
            name: `${closestRace.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
          })
          .addFields({
            name: '📊 Event Information',
            value: `\`\`\`
Round     : ${closestRace.round}
Name      : ${closestRace.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
Location  : ${closestRace.location || 'N/A'}\`\`\``,
            inline: false
          })
          .addFields({
            name: '📅 Session Schedule',
            value: sessionFields.join('\n'),
            inline: false
          })
          .setFooter({
            text: `${motorsport.toUpperCase()} - ${closestRace.name} (Page 1/2)`,
            iconURL: motorsportLogos[motorsportKey],
          }),

        // Page 2: Track Conditions and Information
        new EmbedBuilder()
          .setColor(colors[motorsport])
          .setTitle(`🏎️ ${closestRace.name} Details`)
          .setFooter({
            text: `${motorsport.toUpperCase()} - ${closestRace.name} (Page 2/2)`,
            iconURL: motorsportLogos[motorsportKey],
          })
      ];

      // Only set image if URL exists and is valid
      if (imageUrl && imageUrl.startsWith('http')) {
        pages[0].setImage(imageUrl);
        pages[1].setImage(imageUrl);
      }

      // Update weather data format
      if (weatherData) {
        const windDirection = getWindDirection(weatherData.wind_direction);
        pages[1].addFields({
          name: '🌡️ Current Conditions',
          value: `\`\`\`
Temperature
  Air      : ${weatherData.air_temperature?.toFixed(1)}°C
  Track    : ${weatherData.track_temperature?.toFixed(1)}°C

Conditions
  Wind     : ${weatherData.wind_speed?.toFixed(1)} m/s ${windDirection}
  Humidity : ${weatherData.humidity?.toFixed(0)}%
  Rain     : ${weatherData.rainfall > 0 ? 'Yes' : 'No'}\`\`\``, 
          inline: false
        });
      }

      // Update Wikipedia info format with code block (update the call to include category)
      const wikiInfo = await getTrackInfo(closestRace.name, motorsport);
      pages[1].addFields({
        name: '📖 Race History',
        value: wikiInfo.error ? 
          '```No race information available at this time. Im Sorry....```' :
          `\`\`\`
Description
  ${wikiInfo.description || 'No description available'}

History
${(wikiInfo.extract || 'No detailed information available.').replace(/\. /g, '.\n').slice(0, 900)}...\`\`\`\n[📚 Read more on Wikipedia](${wikiInfo.url || 'https://wikipedia.org'})`,
        inline: false
      });

      // Create navigation buttons
      const row = new ActionRowBuilder()
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
            .setDisabled(false)
        );

      let currentPage = 0;
      const reply = await interaction.editReply({
        embeds: [pages[currentPage]],
        components: [row],
        files: attachment ? [attachment] : []
      });

      const collector = reply.createMessageComponentCollector({
        time: 120000
      });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({ content: 'This button is not for you!', ephemeral: true });
          return;
        }

        currentPage = i.customId === 'prev' ? 0 : 1;

        // Update button states
        row.components[0].setDisabled(currentPage === 0);
        row.components[1].setDisabled(currentPage === 1);

        await i.update({
          embeds: [pages[currentPage]],
          components: [row],
          files: attachment ? [attachment] : [] // Remove conditional for files
        });
      });

      collector.on('end', async () => {
        row.components.forEach(button => button.setDisabled(true));
        await interaction.editReply({
          embeds: [pages[currentPage]],
          components: [row],
          files: currentPage === 0 && attachment ? [attachment] : []
        });
      });

    } catch (error) {
      console.error("Error fetching Grand Prix data:", error);
      await interaction.editReply({
        content: `There was an error fetching the Grand Prix data: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
