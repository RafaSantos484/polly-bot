import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import { client } from "..";

const command = {
  data: new SlashCommandBuilder().setName("pare").setDescription("Vou de fuga"),
  execute: async (
    interaction: ChatInputCommandInteraction<CacheType>,
    serverId: string
  ) => {
    const server = client.servers[serverId];
    if (!server.isConnected()) {
      interaction.reply("Eu não tô tocando nada");
    } else {
      interaction.reply("Indo de fuga");
      server.disconnect();
    }
  },
};

export default command;
