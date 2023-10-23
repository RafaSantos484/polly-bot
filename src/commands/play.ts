import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import { joinVoiceChannel } from "@discordjs/voice";
import playDl from "play-dl";

import { client } from "..";

const command = {
  data: new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Meto(la ele) um vídeo")
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
      await interaction.reply("Meta um input válido");
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

    // After 3s 'reply' method is no longer avaible
    // 'ephemeral: true' grants that the bot can reply after 3s
    await interaction.deferReply({ ephemeral: true });
    const server = client.servers[serverId];
    server.textChannel = interaction.channel;

    let url = "";
    let title: string | undefined;
    const inputType = await playDl.validate(input);
    switch (inputType) {
      case false:
        await interaction.reply("Input inválido");
        return;
      case "yt_video":
        url = input;
        break;
      case "search":
        const searchResult = (await playDl.search(input, { limit: 1 }))[0];
        title = searchResult.title;
        url = searchResult.url;
        break;
      default:
        console.log(input, inputType);
        await interaction.reply("Não consigo processar esse tipo de input");
        return;
    }

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
    server.play(url, interaction, title);
  },
};

export default command;
