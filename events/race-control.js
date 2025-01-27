const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const db = require('orio.db');
const fetch = require('node-fetch');

let messageQueue = new Set();
const REFRESH_INTERVAL = 2000; // 2 seconds
let lastProcessedTimestamp = null;

const FLAG_COLORS = {
    'RED': 0xFF0000,
    'YELLOW': 0xFFFF00,
    'DOUBLE YELLOW': 0xFFD700,
    'GREEN': 0x00FF00,
    'BLUE': 0x0000FF,
    'WHITE': 0xFFFFFF,
    'BLACK': 0x000000,
    'BLACK AND WHITE': 0x808080,
    'CHEQUERED': 0xFFFFFF,
    'DEFAULT': 0x1E8449 // A nice F1 green for default cases
};

const DRIVER_MAPPINGS = {
    '1': { team: 'red-bull', driver: 'verstappen', name: 'VER', fullName: 'Max Verstappen' },
    '11': { team: 'red-bull', driver: 'perez', name: 'PER', fullName: 'Sergio Perez' },
    '16': { team: 'ferrari', driver: 'leclerc', name: 'LEC', fullName: 'Charles Leclerc' },
    '55': { team: 'ferrari', driver: 'sainz', name: 'SAI', fullName: 'Carlos Sainz' },
    '63': { team: 'mercedes', driver: 'russell', name: 'RUS', fullName: 'George Russell' },
    '44': { team: 'mercedes', driver: 'hamilton', name: 'HAM', fullName: 'Lewis Hamilton' },
    '4': { team: 'mclaren', driver: 'norris', name: 'NOR', fullName: 'Lando Norris' },
    '81': { team: 'mclaren', driver: 'piastri', name: 'PIA', fullName: 'Oscar Piastri' },
    '14': { team: 'aston-martin', driver: 'alonso', name: 'ALO', fullName: 'Fernando Alonso' },
    '18': { team: 'aston-martin', driver: 'stroll', name: 'STR', fullName: 'Lance Stroll' },
    '31': { team: 'rb', driver: 'tsunoda', name: 'TSU', fullName: 'Yuki Tsunoda' },
    '3': { team: 'rb', driver: 'ricciardo', name: 'RIC', fullName: 'Daniel Ricciardo' },
    '27': { team: 'haas', driver: 'hulkenberg', name: 'HUL', fullName: 'Nico Hulkenberg' },
    '20': { team: 'haas', driver: 'magnussen', name: 'MAG', fullName: 'Kevin Magnussen' },
    '77': { team: 'sauber', driver: 'bottas', name: 'BOT', fullName: 'Valtteri Bottas' },
    '24': { team: 'sauber', driver: 'zhou', name: 'ZHO', fullName: 'Zhou Guanyu' },
    '10': { team: 'alpine', driver: 'gasly', name: 'GAS', fullName: 'Pierre Gasly' },
    '2': { team: 'alpine', driver: 'ocon', name: 'OCO', fullName: 'Esteban Ocon' },
    '23': { team: 'williams', driver: 'albon', name: 'ALB', fullName: 'Alexander Albon' },
    '22': { team: 'williams', driver: 'sargeant', name: 'SAR', fullName: 'Logan Sargeant' }
};

const MESSAGES_PER_PAGE = 10;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let currentRaceInfo = null; // Store current race info

const DEV_MODE = true; // Toggle this for development testing
const TEST_MESSAGES = [
    {
        category: 'Flag',
        date: new Date().toISOString(),
        driver_number: null,
        flag: 'GREEN',
        lap_number: 1,
        message: 'TRACK CLEAR - GREEN FLAG',
        scope: 'Track',
        sector: null
    },
    {
        category: 'Drs',
        date: new Date().toISOString(),
        driver_number: null,
        flag: null,
        lap_number: 2,
        message: 'DRS ENABLED',
        scope: 'Track',
        sector: null
    },
    {
        category: 'Flag',
        date: new Date().toISOString(),
        driver_number: 1,
        flag: 'YELLOW',
        lap_number: 5,
        message: 'YELLOW FLAG IN SECTOR 2',
        scope: 'Track',
        sector: 2
    },
    {
        category: 'CarEvent',
        date: new Date().toISOString(),
        driver_number: 44,
        flag: null,
        lap_number: 8,
        message: 'CAR 44 (HAM) TIME 1:32.654 DELETED - TRACK LIMITS AT TURN 4',
        scope: 'Driver',
        sector: null
    },
    {
        category: 'SafetyCar',
        date: new Date().toISOString(),
        driver_number: null,
        flag: null,
        lap_number: 15,
        message: 'SAFETY CAR DEPLOYED',
        scope: 'Track',
        sector: null
    },
    {
        category: 'Flag',
        date: new Date().toISOString(),
        driver_number: 55,
        flag: 'BLACK AND WHITE',
        lap_number: 20,
        message: 'BLACK AND WHITE FLAG FOR CAR 55 (SAI) - TRACK LIMITS',
        scope: 'Driver',
        sector: null
    },
    {
        category: 'Flag',
        date: new Date().toISOString(),
        driver_number: null,
        flag: 'CHEQUERED',
        lap_number: 50,
        message: 'CHEQUERED FLAG',
        scope: 'Track',
        sector: null
    }
];

async function getCurrentRace() {
    try {
        const year = new Date().getFullYear();
        const url = `https://raw.githubusercontent.com/sportstimes/f1/main/_db/f1/${year}.json`;
        const response = await fetch(url);
        const data = await response.json();
        
        const now = new Date();
        const currentRace = data.races.find(race => {
            const raceDate = new Date(race.sessions.gp);
            const racePractice = new Date(race.sessions.fp1);
            return now >= racePractice && now <= new Date(raceDate.getTime() + 4 * 60 * 60 * 1000); // Race + 4 hours
        });

        if (currentRace) {
            return currentRace;
        }
        return null;
    } catch (error) {
        console.error('Error fetching current race info:', error);
        return null;
    }
}

function getTrackImageUrl(raceName) {
    const formattedName = raceName
        .replace("Monaco", "Monoco")
        .replace("Canadian", "Canada")
        .replace("Spanish", "Spain")
        .replace("Barcelona", "Spain")
        .replace("Las Vegas", "Las_Vegas")
        .replace("Australian", "Australia");

    return `https://media.formula1.com/image/upload/f_auto/q_auto/v1677244985/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${formattedName}_Circuit.png.transform/8col/image.png`;
}

async function fetchRaceControl() {
    const url = 'https://api.openf1.org/v1/race_control?meeting_key=latest';
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Only get messages after our last processed timestamp
        if (lastProcessedTimestamp) {
            return data.filter(msg => new Date(msg.date) > new Date(lastProcessedTimestamp));
        }
        
        // On first run, just set the timestamp without returning messages
        if (data.length > 0) {
            lastProcessedTimestamp = data[data.length - 1].date;
        }
        return [];
    } catch (error) {
        console.error('Error fetching race control data:', error);
        return [];
    }
}

async function postMessage(client, message) {
    console.log('Processing message:', message.message);
    const messageKey = `${message.date}_${message.message}`;
    
    if (messageQueue.has(messageKey)) return;
    messageQueue.add(messageKey);

    // Determine embed color and icon based on category and flag
    let embedColor = FLAG_COLORS.DEFAULT;
    let categoryIcon = '🏎️';
    
    if (message.flag && FLAG_COLORS[message.flag]) {
        embedColor = FLAG_COLORS[message.flag];
    }

    // Category-specific icons and colors
    switch(message.category) {
        case 'SafetyCar':
            embedColor = 0xFFA500;
            categoryIcon = '🚨';
            break;
        case 'Flag':
            categoryIcon = '🚩';
            break;
        case 'Drs':
            categoryIcon = '📡';
            embedColor = 0x800080; // Purple for DRS
            break;
        case 'CarEvent':
            categoryIcon = '🛠️';
            break;
    }

    const embed = {
        color: embedColor,
        title: `${categoryIcon} Race Control Message`,
        fields: [
            {
                name: '📊 Category',
                value: `\`${message.category || 'N/A'}\``,
                inline: true
            }
        ],
        description: `**${message.message}**`,
        footer: {
            text: `Race Control • ${message.scope || 'Track'} Event`
        },
        timestamp: new Date(message.date)
    };

    // Add DRS image for DRS messages
    if (message.category === 'Drs') {
        embed.image = {
            url: 'https://raw.githubusercontent.com/Batuhantrkgl/Bwoah/main/assets/images/F1%20-%20DRS.png'
        };
    }

    // Add flag field if exists
    if (message.flag) {
        embed.fields.push({
            name: '🚩 Flag Status',
            value: `\`${message.flag}\``,
            inline: true
        });
    }

    // Add driver number if exists
    if (message.driver_number) {
        const driverInfo = DRIVER_MAPPINGS[message.driver_number];
        if (driverInfo) {
            embed.thumbnail = {
                url: `https://media.formula1.com/image/upload/f_auto,c_limit,q_auto,w_1320/content/dam/fom-website/drivers/2024Drivers/${driverInfo.driver}`
            };
            embed.author = {
                name: `${driverInfo.fullName} (${message.driver_number}) - ${message.message.split('-')[1]?.trim() || 'Driver Event'}`,
                icon_url: `https://media.formula1.com/d_team_car_fallback_image.png/content/dam/fom-website/teams/2025/${driverInfo.team}.png`
            };
        }
        embed.fields.push({
            name: '🏁 Driver',
            value: `\`Car ${message.driver_number}\``,
            inline: true
        });
    }

    // Add sector if exists
    if (message.sector) {
        embed.fields.push({
            name: '🔄 Sector',
            value: `\`Sector ${message.sector}\``,
            inline: true
        });
        if (currentRaceInfo) {
            embed.image = {
                url: getTrackImageUrl(currentRaceInfo.name)
            };
        }
    }

    // Add lap number if exists
    if (message.lap_number) {
        embed.fields.push({
            name: '📍 Lap',
            value: `\`Lap ${message.lap_number}\``,
            inline: true
        });
    }

    const guilds = Array.from(client.guilds.cache.values());
    console.log(`Checking ${guilds.length} guilds`);

    // Add DRS image for DRS messages
    if (message.category === 'Drs') {
        embed.image = {
            url: 'attachment://F1 - DRS.png'
        };
        const attachment = new AttachmentBuilder('./assets/images/F1 - DRS.png');
        
        // Update all guild sends to include the attachment
        for (const guild of guilds) {
            try {
                const channelId = db.get(`logchannel_${guild.id}`);
                console.log(`Guild ${guild.name} (${guild.id}), Channel ID:`, channelId);

                if (channelId) {
                    const channel = await guild.channels.fetch(channelId);
                    console.log(`Found channel: ${channel?.name}`);

                    if (channel && channel.isTextBased()) {
                        await channel.send({ 
                            embeds: [embed],
                            files: [attachment]
                        });
                        console.log(`Successfully sent message to ${guild.name} #${channel.name}`);
                    }
                }
            } catch (error) {
                console.error(`Error processing guild ${guild.id}:`, error);
            }
        }
        return; // Exit early since we've handled the sending
    }

    // Regular non-DRS message sending
    for (const guild of guilds) {
        try {
            const channelId = db.get(`logchannel_${guild.id}`);
            console.log(`Guild ${guild.name} (${guild.id}), Channel ID:`, channelId);

            if (channelId) {
                const channel = await guild.channels.fetch(channelId);
                console.log(`Found channel: ${channel?.name}`);

                if (channel && channel.isTextBased()) {
                    await channel.send({ embeds: [embed] });
                    console.log(`Successfully sent message to ${guild.name} #${channel.name}`);
                }
            }
        } catch (error) {
            console.error(`Error processing guild ${guild.id}:`, error);
        }
    }
}

async function createRaceSummary(client, messages) {
    const embed = new EmbedBuilder()
        .setTitle('🏁 Race Control Summary')
        .setColor(FLAG_COLORS.DEFAULT)
        .setTimestamp()
        .setFooter({ text: 'Race Control Summary' });

    // Create first page of messages
    const fields = messages.slice(0, MESSAGES_PER_PAGE).map(msg => ({
        name: `${new Date(msg.date).toLocaleTimeString()}`,
        value: `**${msg.category}**: ${msg.message}`,
        inline: false
    }));

    embed.addFields(fields);

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
                .setDisabled(messages.length <= MESSAGES_PER_PAGE)
        );

    // Send summary to all configured channels
    const guilds = Array.from(client.guilds.cache.values());
    for (const guild of guilds) {
        try {
            const channelId = db.get(`logchannel_${guild.id}`);
            if (channelId) {
                const channel = await guild.channels.fetch(channelId);
                if (channel?.isTextBased()) {
                    const reply = await channel.send({
                        content: '**Race Summary Report**',
                        embeds: [embed],
                        components: [row]
                    });

                    // Set up pagination
                    const collector = reply.createMessageComponentCollector({ time: 600000 }); // 10 minutes
                    let currentPage = 0;

                    collector.on('collect', async i => {
                        const newPage = i.customId === 'prev' ? currentPage - 1 : currentPage + 1;
                        const newFields = messages
                            .slice(newPage * MESSAGES_PER_PAGE, (newPage + 1) * MESSAGES_PER_PAGE)
                            .map(msg => ({
                                name: `${new Date(msg.date).toLocaleTimeString()}`,
                                value: `**${msg.category}**: ${msg.message}`,
                                inline: false
                            }));

                        const newEmbed = EmbedBuilder.from(embed)
                            .setFields(newFields)
                            .setFooter({ text: `Page ${newPage + 1}/${Math.ceil(messages.length / MESSAGES_PER_PAGE)}` });

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
                                    .setDisabled((newPage + 1) * MESSAGES_PER_PAGE >= messages.length)
                            );

                        await i.update({ embeds: [newEmbed], components: [newRow] });
                        currentPage = newPage;
                    });

                    collector.on('end', () => {
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
                        reply.edit({ components: [disabledRow] }).catch(console.error);
                    });
                }
            }
        } catch (error) {
            console.error(`Error sending summary to guild ${guild.id}:`, error);
        }
    }
}

let raceMessages = []; // Store messages for summary

module.exports = {
    name: 'ready',
    once: false,
    async execute(client) {
        console.log('Race control monitoring started');

        // Initial race info fetch
        currentRaceInfo = await getCurrentRace();
        
        // Update race info every 5 minutes
        setInterval(async () => {
            currentRaceInfo = await getCurrentRace();
        }, 5 * 60 * 1000);

        // Send initial status message to all configured channels
        const guilds = Array.from(client.guilds.cache.values());
        for (const guild of guilds) {
            try {
                const channelId = db.get(`logchannel_${guild.id}`);
                if (channelId) {
                    const channel = await guild.channels.fetch(channelId);
                    if (channel?.isTextBased()) {
                        await channel.send({
                            embeds: [{
                                color: FLAG_COLORS.DEFAULT,
                                title: '🏁 Race Control System',
                                description: 'Race Monitoring System Started.',
                                timestamp: new Date()
                            }]
                        });
                    }
                }
            } catch (error) {
                console.error(`Error sending initial message to guild ${guild.id}:`, error);
            }
        }

        if (DEV_MODE) {
            console.log('🔧 Development Mode: Sending test messages...');
            // Send test messages with delays
            for (const message of TEST_MESSAGES) {
                await postMessage(client, message);
                raceMessages.push(message);
                
                if (message.flag === 'CHEQUERED') {
                    console.log('Race ended, creating summary...');
                    await createRaceSummary(client, raceMessages);
                    raceMessages = [];
                }
                await sleep(5000); // 5 second delay between test messages
            }
        } else {
            // Initialize by fetching current state without sending messages
            await fetchRaceControl();
            
            setInterval(async () => {
                const messages = await fetchRaceControl();
                for (const message of messages) {
                    await postMessage(client, message);
                    raceMessages.push(message);
                    
                    if (message.flag === 'CHEQUERED') {
                        console.log('Race ended, creating summary...');
                        await createRaceSummary(client, raceMessages);
                        raceMessages = [];
                    }
                    await sleep(500);
                }
            }, REFRESH_INTERVAL);
        }
    },
};
