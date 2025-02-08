const fs = require("node:fs");
const path = require("node:path");
const blessed = require('blessed');
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const dotenv = require("dotenv");

dotenv.config();

// Add sleep utility function
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Status symbols
const STATUS = {
  INFO: '{blue-fg}ℹ{/blue-fg}',
  SUCCESS: '{green-fg}✓{/green-fg}',
  WARNING: '{yellow-fg}⚠{/yellow-fg}',
  ERROR: '{red-fg}✖{/red-fg}',
  LOADING: '{cyan-fg}◈{/cyan-fg}',
  COMMAND: '{magenta-fg}⌘{/magenta-fg}',
  EVENT: '{white-fg}⚡{/white-fg}',
  CATEGORY: '{yellow-fg}📁{/yellow-fg}',
  SUBCATEGORY: '{cyan-fg}└─{/cyan-fg}',
};

// Add proper console logging setup
const isBun = typeof Bun !== 'undefined';
const NO_TUI_FLAG = process.argv.includes('--no-tui');

// Early exit for console mode
if (NO_TUI_FLAG) {
  // Create basic client
  const client = new Client({ intents: 0 });
  client.commands = new Collection();

  // Basic console logger
  const logToConsole = (type, message) => {
    const timestamp = new Date().toISOString();
    console.info(`[${timestamp}] [${type}] ${message}`);
  };

  // Simple console-only bot startup
  (async () => {
    try {
      logToConsole('INFO', 'Starting bot in console mode...');
      
      // Load commands
      const commandFolders = fs.readdirSync(path.join(__dirname, "commands"));
      for (const folder of commandFolders) {
        const commandPath = path.join(__dirname, "commands", folder);
        const commands = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));
        for (const file of commands) {
          const command = require(path.join(commandPath, file));
          if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            logToConsole('INFO', `Loaded command: ${command.data.name}`);
          }
        }
      }

      // Load events
      const eventsPath = path.join(__dirname, "events");
      const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
      for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        logToConsole('INFO', `Loaded event: ${event.name}`);
      }

      // Login
      await client.login(process.env.TOKEN);
      logToConsole('SUCCESS', 'Bot is now online!');
      
      client.on('ready', () => {
        logToConsole('INFO', `Logged in as ${client.user.tag}`);
      });

    } catch (error) {
      logToConsole('ERROR', error.message);
      process.exit(1);
    }
  })();

  // Exit early to avoid TUI initialization
  return;
}

// Initialize blessed screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Bwoah - Racing Schedule Bot'
});

// Add mouse support
screen.enableMouse();

// Create boot screen container
const bootScreen = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  tags: true
});

// Create main screen container
const mainScreen = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  tags: true,
  hidden: true
});

// Update stats dashboard
const statsBox = blessed.box({
  parent: mainScreen,
  top: '10%',
  left: 'center',
  width: '80%',
  height: '30%',
  label: ' System Statistics ',
  tags: true,
  border: {
    type: 'line',
    fg: 'blue'
  },
  style: {
    border: {
      fg: 'blue'
    }
  }
});

// Update options menu
const optionsBox = blessed.box({
  parent: mainScreen,
  top: '45%',
  left: 'center',
  width: '80%',
  height: '45%',
  label: ' Control Panel ',
  tags: true,
  border: {
    type: 'line',
    fg: 'blue'
  },
  style: {
    border: {
      fg: 'blue'
    }
  }
});

// Update options list items with centered text
const optionsList = blessed.list({
  parent: optionsBox,
  width: '100%',
  height: '100%',
  align: 'center',
  items: [
    '{center}{cyan-fg}[1]{/cyan-fg} Stress Test   - Run system stress test{/center}',
    '{center}{cyan-fg}[2]{/cyan-fg} Reboot        - Restart the bot{/center}',
    '{center}{cyan-fg}[3]{/cyan-fg} Show Logs     - View recent logs{/center}',
    '{center}{cyan-fg}[4]{/cyan-fg} Detailed Logs - View full log history{/center}',
    '{center}{cyan-fg}[5]{/cyan-fg} Poweroff      - Shutdown the bot{/center}',
  ],
  tags: true,
  style: {
    selected: {
      fg: 'blue',
      bold: true
    }
  }
});

// Make options list interactive with mouse
optionsList.interactive = true;
optionsList.mouse = true;

// Add hover effect to options
optionsList.style.item = {
  fg: 'white'
};
optionsList.style.selected = {
  bg: 'blue',
  fg: 'white',
  bold: true
};
optionsList.style.hover = {
  bg: 'cyan',
  fg: 'black'
};

// Add click handlers
optionsList.on('click', async (data) => {
  const index = optionsList.selected;
  await handleOptionSelect(index);
});

// Create main log box
const logBox = blessed.box({
  top: 0,
  left: 0,
  width: '70%',
  height: '100%',
  label: ' Main Log ',
  tags: true,
  border: {
    type: 'line'
  },
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' ',
    track: {
      bg: 'cyan'
    },
    style: {
      inverse: true
    }
  }
});

// Create status box
const statusBox = blessed.box({
  top: 0,
  right: 0,
  width: '30%',
  height: '100%',
  label: ' Status ',
  tags: true,
  border: {
    type: 'line'
  },
  content: '{center}Bot Status{/center}\n\n{bold}Waiting for connection...{/bold}'
});

// Create menu box
const menuBox = blessed.box({
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  label: ' Menu ',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    selected: {
      bg: 'blue'
    }
  }
});

// Create menu list
const menuList = blessed.list({
  parent: menuBox,
  width: '100%',
  height: '100%',
  items: [
    '{cyan-fg}[1]{/cyan-fg} Stress Test  {cyan-fg}[2]{/cyan-fg} Reboot  {cyan-fg}[3]{/cyan-fg} Show Logs  {cyan-fg}[4]{/cyan-fg} Detailed Logs  {cyan-fg}[5]{/cyan-fg} Poweroff'
  ],
  tags: true
});

// Move existing boot screen elements to bootScreen
bootScreen.append(logBox);
bootScreen.append(statusBox);
bootScreen.append(menuBox);

screen.append(bootScreen);
screen.append(mainScreen);

// Add boxes to screen
screen.append(logBox);
screen.append(statusBox);
screen.append(menuBox);

// Enhanced logging function
function log(type, message, subtext = '') {
  const now = new Date();
  const timestamp = now.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(',', '');
  
  const symbol = STATUS[type] || STATUS.INFO;
  let logMessage = `${timestamp} -> [${type}] ${message}`;
  
  // Add color based on message type
  switch(type) {
    case 'SUCCESS':
      logMessage = `{green-fg}${logMessage}{/green-fg}`;
      break;
    case 'COMMAND':
      logMessage = `{magenta-fg}${logMessage}{/magenta-fg}`;
      break;
    case 'EVENT':
      logMessage = `{cyan-fg}${logMessage}{/cyan-fg}`;
      break;
  }

  if (subtext) {
    logBox.pushLine(logMessage);
    logBox.pushLine(`${STATUS.SUBCATEGORY} {gray-fg}${subtext}{/gray-fg}`);
  } else {
    logBox.pushLine(logMessage);
  }
  
  logBox.setScrollPerc(100);
  screen.render();
}

// Override console methods
console.log = (...args) => log('INFO', args.join(' '));
console.error = (...args) => log('ERROR', args.join(' '));
console.warn = (...args) => log('WARNING', args.join(' '));

// Add loading animation
async function showLoading(message, durationMs = 1000) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const loadingInterval = setInterval(() => {
    statusBox.setContent(
      '{center}Bot Status{/center}\n\n' +
      `{cyan-fg}${frames[0]}{/cyan-fg} ${message}`
    );
    frames.push(frames.shift());
    screen.render();
  }, 80);

  await sleep(durationMs);
  clearInterval(loadingInterval);
}

const client = new Client({
  intents: 0,
});

client.commands = new Collection();

// Enhanced command loading
async function loadCommands() {
  const foldersPath = path.join(__dirname, "commands");
  const commandFolders = fs.readdirSync(foldersPath);
  
  log('INFO', 'Loading commands...', `Found ${commandFolders.length} categories`);
  await sleep(500);

  let totalCommands = 0;

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    
    log('CATEGORY', `📁 Category: ${folder}`, `Found ${commandFiles.length} commands`);
    await sleep(200);

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      await showLoading(`Loading ${file}`, 300);
      
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        log('SUCCESS', `Command loaded: ${command.data.name}`, `Category: ${folder}`);
        totalCommands++;
      } else {
        log('WARNING', `Invalid command: ${file}`, 'Missing required properties');
      }
      await sleep(100);
    }
  }

  log('SUCCESS', `All commands loaded successfully!`, `Total commands: ${totalCommands}`);
}

// Enhanced event loading
async function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
  
  log('INFO', 'Loading events...', `Found ${eventFiles.length} events`);
  await sleep(500);

  let loadedEvents = 0;

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    await showLoading(`Loading ${file}`, 300);
    
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    
    log('SUCCESS', `Event loaded: ${event.name}`, `Type: ${event.once ? 'Once' : 'On'}`);
    loadedEvents++;
    await sleep(100);
  }

  log('SUCCESS', `All events loaded successfully!`, `Total events: ${loadedEvents}`);
}

// Enhanced ready event
client.once('ready', async () => {
  // First clear the status box of the waiting message
  statusBox.setContent('');
  screen.render();
  
  // Show loading animation
  await showLoading('Finalizing startup', 1000);
  
  // Update initial stats
  stats = {
    warnings: 0,
    errors: 0,
    users: client.users.cache.size,
    guilds: client.guilds.cache.size,
    commands: client.commands.size,
    events: client.eventNames().length,
    uptime: 0
  };

  // Update the status display immediately
  updateStats();
  
  // Hide boot screen elements
  bootScreen.hide();
  logBox.hide();
  statusBox.hide();
  menuBox.hide();
  
  // Show and update main screen
  mainScreen.show();
  optionsList.focus();
  
  // Start stats update interval
  setInterval(updateStats, 1000);
  
  log('SUCCESS', 'Bot is ready!', `Logged in as ${client.user.tag}`);
  screen.render();
  
  currentFocus = 'options';
  optionsList.focus();
  screen.render();
});

// Enhanced keyboard shortcuts
screen.key(['q', 'C-c'], (ch, key) => {
  log('WARNING', 'Shutting down...');
  setTimeout(() => process.exit(0), 1000);
});

screen.key(['r'], (ch, key) => {
  logBox.setContent('');
  log('INFO', 'Log cleared');
  screen.render();
});

// Add menu functions
async function stressTest() {
  log('INFO', 'Starting stress test...');
  // Simulate heavy load
  for (let i = 0; i < 5; i++) {
    await showLoading(`Stress testing... Phase ${i + 1}/5`, 1000);
    log('INFO', `Stress test phase ${i + 1} completed`);
  }
  log('SUCCESS', 'Stress test completed');
}

async function reboot() {
  log('WARNING', 'Rebooting system...');
  await showLoading('Preparing for reboot', 1000);
  log('INFO', 'Shutting down services');
  await sleep(500);
  process.on('exit', () => {
    require('child_process').spawn(process.argv.shift(), process.argv, {
      cwd: process.cwd(),
      detached: true,
      stdio: 'inherit'
    });
  });
  process.exit();
}

function showDetailedLogs() {
  const detailedBox = blessed.box({
    top: 'center',
    left: 'center',
    width: '80%',
    height: '80%',
    label: ' Detailed Logs ',
    content: '',
    tags: true,
    border: {
      type: 'line'
    },
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'cyan'
      },
      style: {
        inverse: true
      }
    }
  });

  // Set focus to detailed logs
  currentFocus = 'detailed';
  screen.append(detailedBox);
  detailedBox.focus();

  // Update keyboard handlers for detailed logs
  detailedBox.key(['escape', 'q'], () => {
    currentFocus = 'options';
    detailedBox.destroy();
    optionsList.focus();
    screen.render();
  });

  detailedBox.key(['up', 'k'], () => {
    if (currentFocus === 'detailed') {
      detailedBox.scroll(-1);
      screen.render();
    }
  });
  
  detailedBox.key(['down', 'j'], () => {
    if (currentFocus === 'detailed') {
      detailedBox.scroll(1);
      screen.render();
    }
  });

  // Load detailed logs
  const content = logBox.getContent()
    .split('\n')
    .map(line => `${line}\n`)
    .join('');
  
  detailedBox.setContent(content);
  screen.render();

  // Close on Escape
  detailedBox.key(['escape', 'q'], () => {
    detailedBox.destroy();
    screen.render();
  });

  // Make detailed logs box interactive
  detailedBox.interactive = true;
  detailedBox.mouse = true;
  detailedBox.keys = true;
  
  // Add scroll support
  detailedBox.key(['up', 'k'], () => {
    detailedBox.scroll(-1);
    screen.render();
  });
  
  detailedBox.key(['down', 'j'], () => {
    detailedBox.scroll(1);
    screen.render();
  });
  
  detailedBox.key(['pageup'], () => {
    detailedBox.scroll(-detailedBox.height);
    screen.render();
  });
  
  detailedBox.key(['pagedown'], () => {
    detailedBox.scroll(detailedBox.height);
    screen.render();
  });
  
  // Add mouse wheel support
  detailedBox.on('wheeldown', () => {
    detailedBox.scroll(1);
    screen.render();
  });
  
  detailedBox.on('wheelup', () => {
    detailedBox.scroll(-1);
    screen.render();
  });
}

// Add keyboard shortcuts for menu items
screen.key(['1'], () => stressTest());
screen.key(['2'], () => reboot());
screen.key(['3'], () => {
  logBox.focus();
  screen.render();
});
screen.key(['4'], () => showDetailedLogs());
screen.key(['5'], (ch, key) => {
  log('WARNING', 'Shutting down...');
  setTimeout(() => process.exit(0), 1000);
});

// Add stats tracking
let stats = {
  warnings: 0,
  errors: 0,
  users: 0,
  guilds: 0,
  commands: 0,
  events: 0,
  uptime: 0
};

// Update stats display
function updateStats() {
  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  const isOnline = client.ws.status === 0; // 0 means connected

  statsBox.setContent(
    '{center}{bold}System Status Overview{/bold}{/center}\n\n' +
    '{center}' +
    `{red-fg}Errors:{/red-fg}    ${stats.errors.toString().padEnd(5)} {yellow-fg}Warnings:{/yellow-fg} ${stats.warnings}\n` +
    `{blue-fg}Users:{/blue-fg}     ${stats.users.toString().padEnd(5)} {green-fg}Guilds:{/green-fg}   ${stats.guilds}\n` +
    `{magenta-fg}Commands:{/magenta-fg} ${stats.commands.toString().padEnd(5)} {cyan-fg}Events:{/cyan-fg}   ${stats.events}\n` +
    `{white-fg}Uptime:{/white-fg}    ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s\n\n` +
    `${isOnline ? '{green-fg}● ONLINE{/green-fg}' : '{red-fg}● OFFLINE{/red-fg}'}` +
    '{/center}'
  );
  
  screen.render();
}

// Modify existing logging function to track stats
const originalLog = log;
log = function(type, message, subtext = '') {
  if (type === 'WARNING') stats.warnings++;
  if (type === 'ERROR') stats.errors++;
  originalLog(type, message, subtext);
  updateStats();
};

// Add interactive option selection
optionsList.on('select', async (item, index) => {
  switch(index) {
    case 0: await stressTest(); break;
    case 1: await reboot(); break;
    case 2: showLogs(); break;
    case 3: showDetailedLogs(); break;
    case 4: 
      log('WARNING', 'Shutting down...');
      setTimeout(() => process.exit(0), 1000);
      break;
  }
});

// Consolidated option handling function
async function handleOptionSelect(index) {
  switch(index) {
    case 0: 
      optionsList.style.selected.bg = 'yellow';
      screen.render();
      await stressTest(); 
      optionsList.style.selected.bg = 'blue';
      screen.render();
      break;
    case 1: await reboot(); break;
    case 2: 
      currentFocus = 'logs';
      logBox.focus();
      logBox.mouse = true;
      screen.render(); 
      break;
    case 3: await showDetailedLogs(); break;
    case 4: 
      log('WARNING', 'Shutting down...');
      setTimeout(() => process.exit(0), 1000);
      break;
  }
}

// Add focus management
let currentFocus = 'options'; // Track current focus: 'options', 'logs', 'detailed'

// Update keyboard handlers to check focus
screen.key(['up', 'down', 'k', 'j'], (ch, key) => {
  if (currentFocus === 'options') {
    if (key.name === 'up' || key.name === 'k') optionsList.up();
    if (key.name === 'down' || key.name === 'j') optionsList.down();
    screen.render();
  }
});

// Update keyboard shortcuts to use the handler
screen.key(['1', '2', '3', '4', '5'], async (ch, key) => {
  const index = parseInt(key.name) - 1;
  if (index >= 0 && index < 5) {
    await handleOptionSelect(index);
  }
});

// Add navigation keys
screen.key(['up', 'down', 'k', 'j'], (ch, key) => {
  if (key.name === 'up' || key.name === 'k') optionsList.up();
  if (key.name === 'down' || key.name === 'j') optionsList.down();
  screen.render();
});

// Add Enter key support
screen.key(['enter'], async () => {
  await handleOptionSelect(optionsList.selected);
});

// Add global escape handler to return focus to options
screen.key(['escape'], () => {
  if (currentFocus !== 'options') {
    currentFocus = 'options';
    optionsList.focus();
    screen.render();
  }
});

// Start the bot
async function startBot() {
  if (NO_TUI_FLAG) {
    console.log('Starting bot in console mode...');
    try {
      const commandFolders = fs.readdirSync(path.join(__dirname, "commands"));
      console.log(`Loading ${commandFolders.length} command categories...`);
      await loadCommands();
      
      const eventFiles = fs.readdirSync(path.join(__dirname, "events"));
      console.log(`Loading ${eventFiles.length} events...`);
      await loadEvents();
      
      console.log('Connecting to Discord...');
      await client.login(process.env.TOKEN);
      console.log('Bot started successfully!');
    } catch (error) {
      console.error('Failed to start bot:', error);
      process.exit(1);
    }
    return;
  }

  // Existing TUI startup code
  log('INFO', 'Starting Bwoah Racing Schedule Bot...');
  await sleep(1000);
  try {
    log('INFO', 'Initializing command system...');
    await loadCommands();
    await sleep(500);
    
    log('INFO', 'Initializing event system...');
    await loadEvents();
    await sleep(500);
    
    log('INFO', 'Connecting to Discord...');
    await client.login(process.env.TOKEN);
    
    log('SUCCESS', 'Startup completed successfully!');
  } catch (error) {
    log('ERROR', 'Failed to start bot', error.message);
    await sleep(1000);
    process.exit(1);
  }
}

// Update help text box position
const helpBox = blessed.box({
  parent: mainScreen,
  bottom: '5%',
  left: 'center',
  width: '80%',
  height: 1,
  content: '{center}Arrow keys/Mouse to navigate | Enter to select | Q to quit | R to clear logs{/center}',
  tags: true,
  style: {
    fg: 'gray'
  }
});

// Render initial screen
screen.render();
startBot();
