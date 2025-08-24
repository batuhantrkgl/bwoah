const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ComponentType,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder, // Added for layout
    ThumbnailBuilder, // Added for section accessories
} = require("discord.js");

// Constants
const DRIVERS_PER_PAGE = 6; // Reduced from 8 to 6 to stay under the 40 component limit
const COLLECTOR_TIMEOUT = 120000; // 2 minutes
const F1_LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/1200px-F1.svg.png";

// Constructor emojis and data mapping
const CONSTRUCTOR_DATA = {
    "red_bull": { emoji: "<:Redbull:1333117466762809365>", name: "Red Bull Racing" },
    "ferrari": { emoji: "<:Scuderia_Ferrari:1333115836562407474>", name: "Scuderia Ferrari" },
    "mclaren": { emoji: "<:McLaren_Speedmark:1333116771716038678>", name: "McLaren F1 Team" },
    "mercedes": { emoji: "<:MercedesBenz_Star:1333117809869459578>", name: "Mercedes-AMG Petronas" },
    "aston_martin": { emoji: "<:Aston_Martin_Lagonda_brand_logo:1333118056423231498>", name: "Aston Martin Aramco" },
    "alpine": { emoji: "<:Alpine_logo:1333118212363124818>", name: "BWT Alpine F1 Team" },
    "williams": { emoji: "<:Logo_Williams_F1:1333118411940561048>", name: "Williams Racing" },
    "rb": { emoji: "<:vcarblogoportraitwhite:1333118695895203871>", name: "RB F1 Team" },
    "sauber": { emoji: "<:StakeF1TeamKickSauber:1247283394589626449>", name: "Kick Sauber" },
    "haas": { emoji: "<:Logo_Haas_F1:1333119080214953984>", name: "MoneyGram Haas F1" }
};

// FIX: Add a mapping for constructor IDs that differ between the API and media URLs
const CONSTRUCTOR_URL_MAP = {
    "red_bull": "redbullracing",
    "sauber": "kicksauber",
    "aston_martin": "astonmartin",
    "rb": "racingbulls"
};


// --- NEW --- Function to get cropped driver image from official F1 media URL
function getDriverImageUrl(driver, constructor, year) {
    if (driver && constructor && year) {
        try {
            // Construct the driver code (e.g., "chalec01" for Charles Leclerc)
            const givenNameCode = driver.givenName.substring(0, 3).toLowerCase();
            const familyNameCode = driver.familyName.substring(0, 3).toLowerCase();
            const driverCode = `${givenNameCode}${familyNameCode}01`;
            
            // Use the mapped constructor ID for the URL, or the default one if no mapping exists
            const constructorUrlId = CONSTRUCTOR_URL_MAP[constructor.constructorId] || constructor.constructorId;

            // FIX: Changed crop mode and dimensions to create a portrait-style thumbnail.
            // c_fill: resizes to fill dimensions, cropping if necessary.
            // w_240, h_320: creates a portrait aspect ratio.
            // g_face: ensures the crop is still centered on the driver's face.
            return `https://media.formula1.com/image/upload/c_fill,w_240,h_320,g_face/q_auto,f_auto/v1740000000/common/f1/${year}/${constructorUrlId}/${driverCode}/${year}${constructorUrlId}${driverCode}right.webp`;
        } catch (e) {
            // Fallback in case of any error during string construction
            return F1_LOGO;
        }
    }
    return F1_LOGO; // Fallback for missing data
}


// Utility functions
function getConstructorData(constructorId) {
    return CONSTRUCTOR_DATA[constructorId] || { emoji: "🏎️", name: "Unknown Team" };
}

function getCurrentYear() {
    return new Date().getFullYear();
}

function calculatePages(totalItems, itemsPerPage = DRIVERS_PER_PAGE) {
    return Math.ceil(totalItems / itemsPerPage);
}

function paginateArray(array, page, itemsPerPage = DRIVERS_PER_PAGE) {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    return array.slice(start, end);
}

// API functions
async function fetchDriverStandings(year = getCurrentYear()) {
    try {
        const response = await fetch(`http://api.jolpi.ca/ergast/f1/${year}/driverstandings`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const standingsData = data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;

        if (!standingsData || standingsData.length === 0) {
            throw new Error("No standings data available");
        }

        return standingsData;
    } catch (error) {
        console.error("Error fetching driver standings:", error);
        throw new Error(`Failed to fetch standings: ${error.message}`);
    }
}

// Components v2 creation functions
function createChampionshipContainer(standings, currentPage, maxPages, year) {
    try {
        // Create header components directly
        const headerTitle = new TextDisplayBuilder().setContent(`# 🏆 ${year} Formula 1 Drivers' Championship`);
        const headerSubtitle = new TextDisplayBuilder().setContent(`**Page ${currentPage + 1} of ${maxPages}** • Updated ${new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })}`);

        // Create driver standings sections (each with a required accessory)
        const driverSections = standings.map((standing) => {
            const driver = standing.Driver;
            const constructor = standing.Constructors[0];
            const constructorData = getConstructorData(constructor.constructorId);

            const wins = standing.wins && parseInt(standing.wins) > 0 ? ` • ${standing.wins} wins` : '';
            const points = parseInt(standing.points);

            let positionEmoji = '';
            switch (parseInt(standing.position)) {
                case 1: positionEmoji = '🥇'; break;
                case 2: positionEmoji = '🥈'; break;
                case 3: positionEmoji = '🥉'; break;
                default: positionEmoji = `**${standing.position}.**`; break;
            }
            
            const driverImageUrl = getDriverImageUrl(driver, constructor, year);

            return new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${positionEmoji} **${driver.givenName} ${driver.familyName}**`),
                    new TextDisplayBuilder().setContent(`${constructorData.emoji} ${constructorData.name}\n\`${points} points${wins}\``)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(driverImageUrl)
                );
        });

        // Create statistics footer components directly
        const totalPointsOnPage = standings.reduce((sum, standing) => sum + parseInt(standing.points || 0), 0);
        const totalWinsOnPage = standings.reduce((sum, standing) => sum + parseInt(standing.wins || 0), 0);
        const leadingDriver = standings[0];

        const statsSeparator = new SeparatorBuilder();
        const statsTitle = new TextDisplayBuilder().setContent('📊 **Page Statistics**');
        const statsContent = new TextDisplayBuilder().setContent(
            `**Leader:** ${leadingDriver.Driver.givenName} ${leadingDriver.Driver.familyName} (${leadingDriver.points} pts)\n` +
            `**Total Points:** ${totalPointsOnPage} • **Race Wins:** ${totalWinsOnPage} • **Drivers:** ${standings.length}`
        );

        // Build the complete container
        const container = new ContainerBuilder()
            .addTextDisplayComponents(headerTitle, headerSubtitle)
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(...driverSections)
            .addSeparatorComponents(statsSeparator)
            .addTextDisplayComponents(statsTitle, statsContent);

        return container;
    } catch (error) {
        console.error("Error creating championship container:", error);
        throw error;
    }
}

function createNavigationButtons(currentPage, maxPages) {
    const buttons = [];

    buttons.push(
        new ButtonBuilder()
        .setCustomId('standings_prev')
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0)
    );

    buttons.push(
        new ButtonBuilder()
        .setCustomId('standings_info')
        .setLabel(`${currentPage + 1}/${maxPages}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(true)
    );

    buttons.push(
        new ButtonBuilder()
        .setCustomId('standings_next')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= maxPages - 1)
    );

    buttons.push(
        new ButtonBuilder()
        .setCustomId('standings_refresh')
        .setLabel('🔄')
        .setStyle(ButtonStyle.Primary)
    );

    return new ActionRowBuilder().addComponents(...buttons);
}

function createDisabledNavigationButtons(currentPage, maxPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
        .setCustomId('standings_prev')
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
        new ButtonBuilder()
        .setCustomId('standings_info')
        .setLabel(`${currentPage + 1}/${maxPages}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
        new ButtonBuilder()
        .setCustomId('standings_next')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
        new ButtonBuilder()
        .setCustomId('standings_refresh')
        .setLabel('🔄')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
}

// Main pagination handler using Components v2
async function handleStandingsPagination(interaction, initialStandings, year) {
    const maxPages = calculatePages(initialStandings.length);
    let currentPage = 0;
    let standings = initialStandings;

    function createV2Layout(page, standingsData) {
        const currentStandings = paginateArray(standingsData, page);
        const components = [
            createChampionshipContainer(currentStandings, page, maxPages, year)
        ];

        if (maxPages > 1) {
            components.push(createNavigationButtons(page, maxPages));
        }

        return components;
    }

    const initialComponents = createV2Layout(currentPage, standings);

    const reply = await interaction.editReply({
        components: initialComponents,
        flags: [MessageFlags.IsComponentsV2]
    });

    if (maxPages <= 1) return;

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith('standings_'),
        time: COLLECTOR_TIMEOUT
    });

    collector.on('collect', async (buttonInteraction) => {
        try {
            if (buttonInteraction.customId === 'standings_prev' && currentPage > 0) {
                currentPage--;
            } else if (buttonInteraction.customId === 'standings_next' && currentPage < maxPages - 1) {
                currentPage++;
            } else if (buttonInteraction.customId === 'standings_refresh') {
                await buttonInteraction.deferUpdate();
                try {
                    standings = await fetchDriverStandings(year);
                    const refreshedComponents = createV2Layout(currentPage, standings);
                    await buttonInteraction.editReply({
                        components: refreshedComponents,
                        flags: [MessageFlags.IsComponentsV2]
                    });
                } catch (error) {
                    await buttonInteraction.followUp({
                        content: '❌ Failed to refresh standings data. Using cached version.',
                        flags: [MessageFlags.Ephemeral]
                    });
                }
                return;
            } else {
                await buttonInteraction.deferUpdate();
                return;
            }

            const newComponents = createV2Layout(currentPage, standings);
            await buttonInteraction.update({
                components: newComponents,
                flags: [MessageFlags.IsComponentsV2]
            });
        } catch (error) {
            console.error("Error handling pagination:", error);
            try {
                await buttonInteraction.followUp({
                    content: "❌ There was an error updating the standings. Please try the command again.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (followUpError) {
                console.error("Error sending follow-up:", followUpError);
            }
        }
    });

    collector.on('end', async () => {
        try {
            const currentStandings = paginateArray(standings, currentPage);
            const disabledComponents = [
                createChampionshipContainer(currentStandings, currentPage, maxPages, year),
                createDisabledNavigationButtons(currentPage, maxPages)
            ];

            await interaction.editReply({
                components: disabledComponents,
                flags: [MessageFlags.IsComponentsV2]
            });
        } catch (error) {
            // Ignore errors here, as the message might have been deleted
        }
    });
}

// Fallback function for when Components v2 isn't available
function createFallbackEmbed(standings, currentPage, maxPages, year) {
    const { EmbedBuilder } = require('discord.js');

    const embed = new EmbedBuilder()
        .setTitle(`🏆 ${year} Formula 1 Drivers' Championship`)
        .setDescription(`**Page ${currentPage + 1} of ${maxPages}**`)
        .setColor(0xFF0101)
        .setTimestamp();

    standings.forEach((standing) => {
        const driver = standing.Driver;
        const constructor = standing.Constructors[0];
        const constructorData = getConstructorData(constructor.constructorId);

        const wins = standing.wins && parseInt(standing.wins) > 0 ? ` • ${standing.wins} wins` : '';
        const points = parseInt(standing.points);

        let positionEmoji = '';
        switch (parseInt(standing.position)) {
            case 1: positionEmoji = '🥇'; break;
            case 2: positionEmoji = '🥈'; break;
            case 3: positionEmoji = '🥉'; break;
            default: positionEmoji = `${standing.position}.`; break;
        }

        embed.addFields({
            name: `${positionEmoji} ${driver.givenName} ${driver.familyName}`,
            value: `${constructorData.emoji} ${constructorData.name}\n${points} points${wins}`,
            inline: true
        });
    });

    return embed;
}

// Main command module
module.exports = {
    data: new SlashCommandBuilder()
        .setName("drivers-championship")
        .setDescription("Get the current Formula 1 Drivers' Championship standings")
        .addIntegerOption(option =>
            option.setName('year')
            .setDescription('Championship year (defaults to current year)')
            .setMinValue(1950)
            .setMaxValue(getCurrentYear())
            .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const year = interaction.options.getInteger('year') || getCurrentYear();
            const standings = await fetchDriverStandings(year);

            await handleStandingsPagination(interaction, standings, year);

        } catch (error) {
            console.error("Command execution error:", error);

            const errorMessage = error.message.includes('Failed to fetch') ?
                "❌ Unable to fetch championship standings. The F1 API might be temporarily unavailable." :
                "❌ An unexpected error occurred while fetching the standings.";

            try {
                // FIX: Error message now uses TextDisplayBuilders instead of a SectionBuilder
                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# ❌ Error'),
                        new TextDisplayBuilder().setContent(errorMessage)
                    );

                await interaction.editReply({
                    components: [errorContainer],
                    flags: [MessageFlags.IsComponentsV2]
                });
            } catch (replyError) {
                console.error("Error sending v2 error message:", replyError);
                try {
                    await interaction.editReply({
                        content: errorMessage
                    });
                } catch (fallbackError) {
                    console.error("Fallback error message failed:", fallbackError);
                }
            }
        }
    },
};
