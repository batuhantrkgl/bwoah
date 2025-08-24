const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ComponentType,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder,
} = require("discord.js");

// Constants
const RACES_PER_PAGE = 6; // Adjusted to accommodate a richer layout
const COLLECTOR_TIMEOUT = 120000; // 2 minutes

// Data for series logos and names
const SERIES_DATA = {
    "f1": { name: "Formula 1", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/F1_%28registered_trademark%29.svg/320px-F1_%28registered_trademark%29.svg.png" },
    "f1-academy": { name: "F1 Academy", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/F1AcademyLogo.png/800px-F1AcademyLogo.png" },
    "f2": { name: "Formula 2", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/FIA_Formula_2_Championship_logo.svg/320px-FIA_Formula_2_Championship_logo.svg.png" },
    "f3": { name: "Formula 3", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/FIA_Formula_3_Championship_logo.svg/320px-FIA_Formula_3_Championship_logo.svg.png" },
    "fe": { name: "Formula E", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Formula-e-logo-championship_2023.svg/320px-Formula-e-logo-championship_2023.svg.png" },
    "indycar": { name: "IndyCar", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/b/b5/IndyCar_Series_logo.svg/223px-IndyCar_Series_logo.svg.png" },
    "motogp": { name: "MotoGP", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Moto_Gp_logo.svg/486px-Moto_Gp_logo.svg.png" },
};

// FIX: Expanded the track name map to be comprehensive for all F1 tracks.
const TRACK_NAME_MAP = {
    "Bahrain": "Bahrain",
    "Saudi Arabian": "Saudi_Arabia",
    "Australian": "Australia",
    "Japanese": "Japan",
    "Chinese": "China",
    "Miami": "Miami",
    "Emilia Romagna": "Imola",
    "Monaco": "Monaco",
    "Canadian": "Canada",
    "Spanish": "Spain",
    "Austrian": "Austria",
    "British": "Great_Britain",
    "Hungarian": "Hungary",
    "Belgian": "Belgium",
    "Dutch": "Netherlands",
    "Italian": "Italy",
    "Azerbaijan": "Baku",
    "Singapore": "Singapore",
    "United States": "USA",
    "Mexico City": "Mexico",
    "São Paulo": "Brazil",
    "Las Vegas": "Las_Vegas",
    "Qatar": "Qatar",
    "Abu Dhabi": "Abu_Dhabi",
};

// Utility functions
// FIX: Adjusted URL parameters to "zoom out" and show the full track layout.
function getTrackImageUrl(raceName) {
    const locationName = raceName.replace("Grand Prix", "").trim();
    const mappedName = TRACK_NAME_MAP[locationName] || locationName; // Fallback to the name itself if not in map
    // c_thumb, w_256, h_256: Creates a 256x256 thumbnail, ensuring the whole track is visible.
    return `https://media.formula1.com/image/upload/c_thumb,w_256,h_256/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${mappedName}_Circuit.webp`;
}

function formatRaceDateWithCountdown(raceDateStr) {
    const date = new Date(raceDateStr);
    if (isNaN(date)) return "Date TBC";

    const formattedDate = `${date.getDate()} ${date.toLocaleString("default", { month: "long" })}, ${date.toLocaleString("default", { weekday: "long" })}`;
    
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
        return `${formattedDate} • Race concluded`;
    }
    return `${formattedDate} • ${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
}

function calculatePages(totalItems, itemsPerPage = RACES_PER_PAGE) {
    return Math.ceil(totalItems / itemsPerPage);
}

function paginateArray(array, page, itemsPerPage = RACES_PER_PAGE) {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    return array.slice(start, end);
}

// API function
async function fetchCalendar(motorsport, year) {
    const url = `https://raw.githubusercontent.com/sportstimes/f1/main/_db/${motorsport}/${year}.json`;
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Network response was not ok for URL: ${url}`);
    }
    return response.json();
}

// Components v2 creation functions
function createCalendarContainer(races, allRaces, series, year, currentPage, maxPages) {
    const seriesInfo = SERIES_DATA[series] || { name: series.toUpperCase() };

    const headerTitle = new TextDisplayBuilder().setContent(`# 🗓️ ${year} ${seriesInfo.name} Calendar`);
    const headerSubtitle = new TextDisplayBuilder().setContent(`**Page ${currentPage + 1} of ${maxPages}** • Total Races: ${allRaces.length}`);

    const raceSections = races.map(race => {
        const raceDate = race.sessions.race || race.sessions.gp || race.sessions.feature || race.sessions.race1 || race.sessions.race2;
        const formattedDate = formatRaceDateWithCountdown(raceDate);
        const trackImageUrl = getTrackImageUrl(race.name);

        return new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**${race.name}**\n${formattedDate}`)
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(trackImageUrl));
    });

    const container = new ContainerBuilder()
        .addTextDisplayComponents(headerTitle, headerSubtitle)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(...raceSections);

    return container;
}

function createNavigationButtons(currentPage, maxPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
        .setCustomId('calendar_prev')
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
        new ButtonBuilder()
        .setCustomId('calendar_info')
        .setLabel(`${currentPage + 1}/${maxPages}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
        new ButtonBuilder()
        .setCustomId('calendar_next')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= maxPages - 1)
    );
}

// Main pagination handler
async function handleCalendarPagination(interaction, allRaces, motorsport, year) {
    const maxPages = calculatePages(allRaces.length);
    let currentPage = 0;

    const createV2Layout = (page) => {
        const paginatedRaces = paginateArray(allRaces, page);
        const components = [createCalendarContainer(paginatedRaces, allRaces, motorsport, year, page, maxPages)];
        if (maxPages > 1) {
            components.push(createNavigationButtons(page, maxPages));
        }
        return components;
    };

    const reply = await interaction.editReply({
        components: createV2Layout(currentPage),
        flags: [MessageFlags.IsComponentsV2],
    });

    if (maxPages <= 1) return;

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith('calendar_'),
        time: COLLECTOR_TIMEOUT,
    });

    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'calendar_prev') currentPage--;
        else if (buttonInteraction.customId === 'calendar_next') currentPage++;
        else return;

        await buttonInteraction.update({
            components: createV2Layout(currentPage),
            flags: [MessageFlags.IsComponentsV2],
        });
    });

    collector.on('end', async () => {
        const finalComponents = createV2Layout(currentPage);
        const navRow = finalComponents.find(c => c instanceof ActionRowBuilder);
        if (navRow) {
            navRow.components.forEach(button => button.setDisabled(true));
        }
        await interaction.editReply({ components: finalComponents, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("calendar")
        .setDescription("Get details about the This Year's Motorsport Calendar")
        .addStringOption((option) =>
            option
            .setName("category")
            .setDescription("Select the motorsport category you want to get the calendar for.")
            .setRequired(true)
            .addChoices(
                { name: "Formula 1", value: "f1" },
                { name: "F1 Academy", value: "f1-academy" },
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

        await interaction.deferReply();

        try {
            let jsonContent = await fetchCalendar(motorsport, year);
            let upcomingRaces = [];

            if (jsonContent) {
                const currentDate = new Date();
                upcomingRaces = jsonContent.races.filter(race => {
                    const raceDate = new Date(race.sessions.gp || race.sessions.feature || race.sessions.race2 || race.sessions.race);
                    return raceDate > currentDate;
                });
            }

            if (upcomingRaces.length === 0) {
                year++; // Check next year
                jsonContent = await fetchCalendar(motorsport, year);
                if (!jsonContent) {
                    const seriesName = (SERIES_DATA[motorsport] || {}).name || motorsport.toUpperCase();
                    await interaction.editReply({ content: `🗓️ The ${seriesName} calendar for ${year} is not available yet. Please check back later.` });
                    return;
                }
                upcomingRaces = jsonContent.races; // Show all races for the next year
            }

            if (upcomingRaces.length === 0) {
                await interaction.editReply({ content: "No race data available for the selected category." });
                return;
            }

            await handleCalendarPagination(interaction, upcomingRaces, motorsport, year);

        } catch (error) {
            console.error("Error fetching calendar data:", error);
            await interaction.editReply({ content: `There was an error fetching the calendar data: ${error.message}` });
        }
    },
};
