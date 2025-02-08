const { EmbedBuilder } = require('discord.js');
const cheerio = require('cheerio');
const db = require('orio.db');

let lastNewsCache = new Set();
const NEWS_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DEV_MODE = false; // Toggle for development testing
const INITIAL_NEWS_LIMIT = 5; // Number of news items to send in dev mode

// Add these to store last fetch state
let lastFetchTime = 0;
let lastProcessedArticles = new Set();

// Add this function to fetch article details
async function fetchArticleDetails(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const timeElement = $('time[datetime]');
        const timestamp = timeElement.attr('datetime');
        const displayTime = timeElement.text().trim();

        return {
            timestamp: parseInt(timestamp),
            displayTime
        };
    } catch (error) {
        console.error('Error fetching article details:', error);
        return null;
    }
}

async function fetchF1News() {
    try {
        const response = await fetch('https://www.formula1.com/en/latest/all.html');
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const newsItems = [];
        
        // Get first article for dev mode or latest news
        const firstArticle = $('a.group').first();
        if (firstArticle.length) {
            const title = firstArticle.find('p.font-titillium.leading-none.text-left').text().trim();
            let url = firstArticle.attr('href');
            if (url && !url.startsWith('http')) {
                url = 'https://www.formula1.com' + url;
            }

            // Get article details including real timestamp
            const details = await fetchArticleDetails(url);
            
            const img = firstArticle.find('img');
            let imageUrl = img.attr('src') || img.attr('srcset')?.split(',')
                .pop()
                .split(' ')[0];

            if (title && url && details) {
                newsItems.push({
                    title,
                    url,
                    imageUrl: imageUrl || 'https://www.formula1.com/etc/designs/fom-website/images/f1_logo.png',
                    category: firstArticle.find('span.font-titillium.leading-none').first().text().trim() || 'News',
                    timestamp: details.timestamp,
                    displayTime: details.displayTime
                });
            }
        }

        console.log(`Found ${newsItems.length} new articles`);
        return newsItems;
    } catch (error) {
        console.error('Error fetching F1 news:', error);
        return [];
    }
}

// Helper function to convert date to Discord timestamp format
function getDiscordTimestamp(date, format = 'R') {
    const timestamp = Math.floor(new Date(date).getTime() / 1000);
    return `<t:${timestamp}:${format}>`;
}

// Add news caching function
async function cacheNews(newsItem) {
    const newsKey = `news_${newsItem.url}`;
    const existingNews = db.get('sent_news') || [];
    
    // Check if news was already sent
    if (existingNews.includes(newsKey)) {
        return false;
    }

    // Add to cache and database
    existingNews.push(newsKey);
    db.set('sent_news', existingNews);
    
    // Keep cache size manageable (last 100 news items)
    if (existingNews.length > 100) {
        existingNews.shift();
        db.set('sent_news', existingNews);
    }

    return true;
}

// Update createNewsEmbed to include proper timestamp
async function createNewsEmbed(newsItem) {
    const embed = new EmbedBuilder()
        .setColor('#e10600')
        .setTitle(newsItem.title.substring(0, 256))
        .setURL(newsItem.url)
        .addFields(
            { name: 'Category', value: newsItem.category || 'News', inline: true },
            { 
                name: 'Published', 
                // Add both relative and full timestamps
                value: `${getDiscordTimestamp(newsItem.timestamp)} (${getDiscordTimestamp(newsItem.timestamp, 'F')})`,
                inline: true 
            }
        )
        .setFooter({
            text: 'Formula 1 Official News',
            iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/2560px-F1.svg.png'
        })
        .setTimestamp();

    // Only set image if URL is valid
    if (newsItem.imageUrl) {
        try {
            new URL(newsItem.imageUrl);
            embed.setImage(newsItem.imageUrl);
        } catch (e) {
            console.error('Invalid image URL:', newsItem.imageUrl);
        }
    }

    return embed;
}

// Update sendNewsToChannels function
async function sendNewsToChannels(client, newsItem) {
    // Check if news was already sent
    const isNewNews = await cacheNews(newsItem);
    if (!isNewNews) {
        console.log('Skipping already sent news:', newsItem.title);
        return;
    }

    const embed = await createNewsEmbed(newsItem);
    const guilds = Array.from(client.guilds.cache.values());

    for (const guild of guilds) {
        try {
            const channelId = db.get(`newschannel_${guild.id}`);
            if (channelId) {
                const channel = await guild.channels.fetch(channelId);
                if (channel?.isTextBased()) {
                    await channel.send({ embeds: [embed] });
                    console.log(`Sent news to ${guild.name} #${channel.name}`);
                }
            }
        } catch (error) {
            console.error(`Error sending news to guild ${guild.id}:`, error);
        }
    }
}

module.exports = {
    name: 'ready',
    once: false,
    async execute(client) {
        console.log('F1 News monitoring started');
        
        // Load existing news cache from database
        const existingNews = db.get('sent_news') || [];
        lastNewsCache = new Set(existingNews);

        if (DEV_MODE) {
            console.log('🔧 Development Mode: Sending newest news item...');
            const allNews = await fetchF1News();
            
            if (allNews.length > 0) {
                // Only send the newest article
                const newestArticle = allNews[allNews.length - 1];
                console.log(`Sending newest article: ${newestArticle.title}`);
                await sendNewsToChannels(client, newestArticle);
                
                // Cache all articles to prevent resending
                allNews.forEach(article => {
                    lastProcessedArticles.add(article.articleId);
                });
            }
        } else {
            // Normal operation: just cache initial articles
            const initialNews = await fetchF1News();
            initialNews.forEach(article => lastProcessedArticles.add(article.articleId));
            console.log(`Cached ${initialNews.length} initial articles`);
        }

        // Normal monitoring
        setInterval(async () => {
            const newArticles = await fetchF1News();
            if (newArticles.length > 0) {
                console.log(`Found ${newArticles.length} new articles to process`);
                for (const article of newArticles) {
                    await sendNewsToChannels(client, article);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }, NEWS_CHECK_INTERVAL);
    },
};
