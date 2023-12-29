# Overseer music

<p align="center">
  <img src="public\overseer-music-github-readme-cover.png?raw=true" alt="Overseer music custom image"/>
</p>

This is a simple Discord music bot written in TypeScript using Yarn as the package manager. It utilizes Discord.js for interacting with the Discord API and features basic music playback capabilities.

## Prerequisites

Before you start, make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/overseer-discord/overseer-music.git
   ```

2. Navigate to the project directory:

   ```bash
   cd overseer-music
   ```

3. Install dependencies using Yarn:

   ```bash
   yarn
   ```

## Configuration

1. Create a new Discord bot and obtain the token. You can do this by creating a new application on the [Discord Developer Portal](https://discord.com/developers/applications).

2. Rename the `.env.example` file to `.env` and update the fields with the neccesarry values

## Usage

### Development

To run the bot in development mode with automatic restarts, use:

```bash
yarn dev
```

This will start the bot using `nodemon`, which watches for file changes and automatically restarts the bot.

### Production

Before running the bot in production, make sure to build the TypeScript code:

```bash
yarn build
```

Then start the bot:

```bash
yarn start
```

## Scripts

The following scripts are available in the `package.json` file:

- **test:** Run Jest tests.
- **dev:** Start the bot in development mode using `nodemon`.
- **build:** Compile TypeScript code.

Feel free to modify and extend the functionality of the bot according to your needs. Happy coding!
