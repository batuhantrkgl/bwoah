const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require("discord.js");
const { JSDOM } = require('jsdom'); // Required for scraping F1 website

// --- CONFIGURATION ---
const COLLECTOR_TIMEOUT = 120000; // 2 minutes for button interactions

// Data for URL slugs and track names
const TRACK_DATA = {
    "Bahrain": { name: "Bahrain", urlSlug: "bahrain" },
    "Saudi Arabian": { name: "Saudi_Arabia", urlSlug: "saudi-arabia" },
    "Australian": { name: "Australia", urlSlug: "australia" },
    "Japanese": { name: "Japan", urlSlug: "japan" },
    "Chinese": { name: "China", urlSlug: "china" },
    "Miami": { name: "Miami", urlSlug: "miami" },
    "Emilia Romagna": { name: "Imola", urlSlug: "emilia-romagna" },
    "Monaco": { name: "Monaco", urlSlug: "monaco" },
    "Canadian": { name: "Canada", urlSlug: "canada" },
    "Spanish": { name: "Spain", urlSlug: "spain" },
    "Austrian": { name: "Austria", urlSlug: "austria" },
    "British": { name: "Great_Britain", urlSlug: "great-britain" },
    "Hungarian": { name: "Hungary", urlSlug: "hungary" },
    "Belgian": { name: "Belgium", urlSlug: "belgium" },
    "Dutch": { name: "Netherlands", urlSlug: "netherlands" },
    "Italian": { name: "Italy", urlSlug: "italy" },
    "Azerbaijan": { name: "Baku", urlSlug: "azerbaijan" },
    "Singapore": { name: "Singapore", urlSlug: "singapore" },
    "United States": { name: "USA", urlSlug: "united-states" },
    "Mexico City": { name: "Mexico", urlSlug: "mexico-city" },
    "São Paulo": { name: "Brazil", urlSlug: "sao-paulo" },
    "Las Vegas": { name: "Las_Vegas", urlSlug: "las-vegas" },
    "Qatar": { name: "Qatar", urlSlug: "qatar" },
    "Abu Dhabi": { name: "Abu_Dhabi", urlSlug: "abu-dhabi" },
};

// --- API & Scraping Functions ---

async function fetchCalendar(year) {
    const url = `https://raw.githubusercontent.com/sportstimes/f1/main/_db/f1/${year}.json`;
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Network response was not ok for URL: ${url}`);
    }
    return response.json();
}

async function fetchF1PageData(trackSlug, year) {
    try {
        const url = `https://www.formula1.com/en/racing/${year}/${trackSlug}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Could not fetch data from F1.com");
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Scrape the full official race name
        const officialRaceName = document.querySelector('h1.typography-module_display-2-xl-regular__g7PLZ')?.textContent.trim();

        // Scrape "About" text
        const detailsElements = document.querySelectorAll('details.border-t-thin');
        let aboutText = '';
        detailsElements.forEach(detail => {
            const question = detail.querySelector('summary p')?.textContent.trim();
            const answer = detail.querySelector('div.max-w-para-lg p')?.textContent.trim();
            if (question && answer) {
                aboutText += `**${question}**\n${answer}\n\n`;
            }
        });

        // Scrape Track Stats
        const stats = {};
        const statsElements = document.querySelectorAll('dl.grid div');
        statsElements.forEach(el => {
            const key = el.querySelector('dt')?.textContent.trim();
            const value = el.querySelector('dd')?.textContent.trim();
            if (key && value) {
                stats[key] = value;
                if (key === 'Fastest lap time') {
                    const driver = el.querySelector('span')?.textContent.trim();
                    if (driver) stats[key] += `\n${driver}`;
                }
            }
        });

        return {
            officialRaceName,
            aboutText: aboutText.trim() || "Detailed information could not be scraped from F1.com.",
            trackStats: stats
        };
    } catch (error) {
        console.error("Error scraping F1 website:", error);
        return {
            officialRaceName: null,
            aboutText: "Failed to fetch detailed information from F1.com.",
            trackStats: {}
        };
    }
}

// --- Utility Functions ---

function getTrackBannerUrl(trackName) {
    const mappedName = TRACK_DATA[trackName]?.name || trackName;
    // FIX: Set quality to 90 and resolution to 1200x428
    return `https://media.formula1.com/image/upload/c_lfill,w_4800,h_1696/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Racehub%20header%20images%2016x9/${mappedName}.webp`;
}

function getTrackLayoutUrl(trackName) {
    const mappedName = TRACK_DATA[trackName]?.name || trackName;
    // FIX: Set quality to 90 and resolution to 1200x428
    return `https://media.formula1.com/image/upload/c_pad,w_4800,h_1696/q_90/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${mappedName}_Circuit.webp`;
}

function formatSessionTimes(sessions) {
    const sessionOrder = ['fp1', 'sprint shootout', 'fp2', 'fp3', 'qualifying', 'sprint', 'race', 'gp'];
    let formatted = '';

    for (const key of sessionOrder) {
        if (sessions[key]) {
            const date = new Date(sessions[key]);
            const timestamp = Math.floor(date.getTime() / 1000);
            const sessionName = key.replace('gp', 'race').replace('fp', 'Practice ');
            formatted += `${sessionName.charAt(0).toUpperCase() + sessionName.slice(1)}: <t:${timestamp}:F>\n`;
        }
    }
    return formatted || 'Session times not yet available.';
}

function createNavigationButtons(currentPage) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('trackinfo_page_1')
            .setLabel('Track Info')
            .setStyle(currentPage === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(currentPage === 1),
        new ButtonBuilder()
            .setCustomId('trackinfo_page_2')
            .setLabel('About the Circuit')
            .setStyle(currentPage === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(currentPage === 2)
    );
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName("track-info")
        .setDescription("Get detailed information about a Formula 1 track.")
        .addStringOption(option => {
            option.setName('track')
                .setDescription('Select the track you want information for.')
                .setRequired(true);
            for (const trackName in TRACK_DATA) {
                option.addChoices({ name: trackName, value: trackName });
            }
            return option;
        }),

    async execute(interaction) {
        await interaction.deferReply();
        const trackName = interaction.options.getString('track');
        const year = new Date().getFullYear();

        try {
            const calendar = await fetchCalendar(year);
            if (!calendar) {
                await interaction.editReply({ content: `Could not fetch the ${year} F1 calendar.` });
                return;
            }

            const race = calendar.races.find(r => r.name.includes(trackName));
            if (!race) {
                await interaction.editReply({ content: `Could not find "${trackName}" in the ${year} calendar.` });
                return;
            }

            const trackInfo = TRACK_DATA[trackName];
            const { officialRaceName, aboutText, trackStats } = await fetchF1PageData(trackInfo.urlSlug, year);

            // --- Build Components for Each Page ---
            
            const sessionContainer = new ContainerBuilder()
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(getTrackBannerUrl(trackName)))
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    // Use the scraped official name, with a fallback to the calendar name
                    new TextDisplayBuilder().setContent(`## 🏁 ${officialRaceName || race.name}`),
                    new TextDisplayBuilder().setContent(formatSessionTimes(race.sessions))
                );

            const circuitContainer = new ContainerBuilder()
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(getTrackLayoutUrl(trackName)))
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Circuit Length:** ${trackStats['Circuit Length'] || 'N/A'}\n` +
                        `**Number of Laps:** ${trackStats['Number of Laps'] || 'N/A'}\n` +
                        `**Race Distance:** ${trackStats['Race Distance'] || 'N/A'}`
                    ),
                    new TextDisplayBuilder().setContent(
                        `**First Grand Prix:** ${trackStats['First Grand Prix'] || 'N/A'}\n` +
                        `**Lap Record:** ${trackStats['Fastest lap time'] || 'N/A'}`
                    )
                );
            
            const aboutContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ℹ️ About ${officialRaceName || race.name}`),
                    new TextDisplayBuilder().setContent(aboutText)
                );
            
            const pages = {
                1: [sessionContainer, circuitContainer],
                2: [aboutContainer]
            };

            let currentPage = 1;

            const getComponentsForPage = (page) => {
                return [...pages[page], createNavigationButtons(page)];
            };

            const reply = await interaction.editReply({
                components: getComponentsForPage(currentPage),
                flags: [MessageFlags.IsComponentsV2],
            });

            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id && i.customId.startsWith('trackinfo_page_'),
                time: COLLECTOR_TIMEOUT,
            });

            collector.on('collect', async (buttonInteraction) => {
                currentPage = parseInt(buttonInteraction.customId.split('_')[2]);
                await buttonInteraction.update({
                    components: getComponentsForPage(currentPage),
                    flags: [MessageFlags.IsComponentsV2],
                });
            });

            collector.on('end', async () => {
                const finalComponents = getComponentsForPage(currentPage);
                const navRow = finalComponents.find(c => c instanceof ActionRowBuilder);
                if (navRow) {
                    navRow.components.forEach(button => button.setDisabled(true));
                }
                await interaction.editReply({ components: finalComponents, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            });

        } catch (error) {
            console.error("Error executing track-info command:", error);
            await interaction.editReply({ content: `An error occurred: ${error.message}` });
        }
    },
};
