import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import { joinVoiceChannel } from "@discordjs/voice";
import { client } from "..";

const command = {
  data: new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Meto(la ele) sua música")
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription("Link do que eu vou tocar")
        .setRequired(true)
    ),
  execute: async (
    interaction: ChatInputCommandInteraction<CacheType>,
    serverId: string
  ) => {
    const input = interaction.options.get("input")?.value;
    if (typeof input !== "string") {
      await interaction.reply("Meta um link válido");
      return;
    }

    if (!interaction.guildId) {
      await interaction.reply("Falha ao tentar obter ID do servidor");
      return;
    }
    const guild = client.guilds.cache.get(interaction.guildId);
    if (!guild) {
      await interaction.reply("Falha ao tentar obter informações do servidor");
      return;
    }
    if (!interaction.member) {
      await interaction.reply("Falha ao tentar obter informações do usuário");
      return;
    }
    const member = guild.members.cache.get(interaction.member.user.id);
    if (!member) {
      await interaction.reply("Falha ao tentar obter informações do usuário");
      return;
    }
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      await interaction.reply(
        "Falha ao tentar obter informações do canal de voz"
      );
      return;
    }

    const server = client.servers[serverId];
    server.textChannel = interaction.channel;
    if (!server.isConnected()) {
      server.setConnection(
        joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
        })
      );
      if (!server.subscribePlayer()) {
        server.disconnect();
        await interaction.reply("Falha ao tentar tocar");
        return;
      }
    }
    server.play(input, interaction);
  },
};

export default command;
