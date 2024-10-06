# Bwoah!

![GitHub stars](https://img.shields.io/github/stars/batuhantrkgl/bwoah?style=social)
![Last commit](https://img.shields.io/github/last-commit/batuhantrkgl/bwoah)

**Stay ahead in the race with Bwoah!** Get real-time F1 driver details and the latest grand prix updates directly from Discord!

## Introduction

Bwoah! is the ultimate companion for motorsport enthusiasts, designed to keep you in the loop with the latest updates and events across various racing series, particularly Formula 1. Whether you're a seasoned fan or just getting started, Bwoah! offers all the essential information you need to enhance your motorsport experience.

## Features

- **Accurate and Up-to-date Information**: Always be informed with the latest updates about drivers and races.
- **User-Friendly Interface**: A sleek and intuitive design presents information clearly and appealingly.
- **Comprehensive Details**: Get in-depth stats on drivers and specifics about the latest grand prix.

## Current Commands

### `/driver-details driver-name:[DriverName]`
Retrieve comprehensive details about any motorsport driver, including driver numbers and team affiliations. For example, learn everything about Lando Norris with a single command!

### `/last-grandprix:[Category]`
Stay updated on the latest grand prix events with a detailed overview, including circuit details, location, country, start times, and DRS zones.

### `/next-grandprix:[Category]`
Plan ahead with information about the upcoming grand prix events. Never miss out on the action with details similar to those provided in `/last-grandprix`.

### `/calendar category:[Category]`
Access the complete schedule of all races for the year with a single command. Ideal for fans who want to stay informed about race dates and locations across various motorsports.

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- A Discord bot token (create your bot at the [Discord Developer Portal](https://discord.com/developers/applications))

### Steps
1. **Clone the repository**:
    ```bash
    git clone https://github.com/batuhantrkgl/bwoah.git
    cd bwoah
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Create a `.env` file** in the root directory and add your bot token:
    ```
    TOKEN=YOUR_BOT_TOKEN
    clientId:YOUR_BOT_CLIENTID
    ```

4. **Start the bot**:
    ```bash
    node index.js
    ```

5. **Invite Bwoah! to your Discord server**: [Invite Link](https://discord.com/oauth2/authorize?client_id=1245289535923945553)

6. **Set up permissions**: Ensure Bwoah! has the necessary permissions to read messages and send replies in your channels.

## Getting Support

For any issues or feature requests, feel free to reach out on our support channel or create an issue in our repository.

## Future Updates

Bwoah! is continually being improved with new features and commands. Stay tuned for updates to enhance your motorsport experience!

## Contributing

Contributions are welcome! If you have ideas for new features or improvements, please submit a pull request or open an issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Stay ahead in the race with Bwoah!, the essential tool for any motorsport enthusiast!
