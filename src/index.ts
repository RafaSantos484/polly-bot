import express from "express";
import { REST, Routes } from "discord.js";
import dotenv from "dotenv";

import Client from "./classes/client.class";
import { exit } from "node:process";
import Server from "./classes/server.class";

import pingCommand from "./commands/ping";
import playCommand from "./commands/play";
import stopCommand from "./commands/stop";
import skipCommand from "./commands/skip";
import Spotify from "./classes/spotify.class";

dotenv.config();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_BOT_CLIENT_ID;
//const GUILD_TEST_ID = process.env.DISCORD_BOT_TEST_GUILD_ID;
if (!TOKEN || !APP_ID) {
  console.log("Missing secrets in .env");
  exit(1);
}

export const spotify = new Spotify();

export const client = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent", "GuildVoiceStates"],
});
client.commands.set(pingCommand.data.name, pingCommand);
client.commands.set(playCommand.data.name, playCommand);
client.commands.set(stopCommand.data.name, stopCommand);
client.commands.set(skipCommand.data.name, skipCommand);

client.once("ready", () => {
  console.log(`Logged as ${client.user?.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    interaction.reply("Comando não encontrado");
    return;
  }
  const { guildId } = interaction;
  if (!guildId) {
    interaction.reply("Falha ao tentar obter informações do servidor");
    return;
  }
  if (!(guildId in client.servers)) client.servers[guildId] = new Server();

  try {
    await command.execute(interaction, guildId);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(TOKEN);
(async () => {
  try {
    console.log(
      `Started refreshing ${client.commands.size} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const commandsData = client.commands.map((c) => c.data);
    /*const data = await rest.put(
      Routes.applicationGuildCommands(APP_ID, GUILD_TEST_ID || ""),
      { body: commandsData }
    );*/
    const data = await rest.put(Routes.applicationCommands(APP_ID), {
      body: commandsData,
    });

    console.log(
      `Successfully reloaded ${(data as any).length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();

client.login(TOKEN);

// Only useful for keeping render server running
export const app = express();
const port = process.env.PORT || 5900;

app.head("/", (_req, res) => {
  console.log("received ping");
  res.send("Listening");
});

app.listen(port, () => {
  console.log(`Server is listening at port ${port}`);
});
