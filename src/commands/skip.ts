import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import { client } from "..";

const command = {
  data: new SlashCommandBuilder()
    .setName("pule")
    .setDescription("Vou pular para a próxima música"),
  execute: async (
    interaction: ChatInputCommandInteraction<CacheType>,
    serverId: string
  ) => {
    const server = client.servers[serverId];
    if (server.isIdle()) {
      await interaction.reply("Não tem nada tocando");
      return;
    }
    await interaction.reply("Pulando...");
    server.player.stop(true);
  },
};

export default command;
