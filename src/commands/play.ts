import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import playDl, { YouTubeVideo } from "play-dl";

import { client, spotify } from "..";
import Utils from "../classes/utils.class";

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
    let input = interaction.options.get("input")?.value;
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
    //await interaction.deferReply({ ephemeral: true });
    await interaction.reply("Processando...");
    const server = client.servers[serverId];
    server.textChannel = interaction.channel;

    const connected = await server.connect(
      voiceChannel.id,
      guild.id,
      guild.voiceAdapterCreator
    );
    if (!connected) {
      await server.sendMessage(
        `Falha ao tentar entrar no canal ${voiceChannel.name}`,
        true,
        interaction
      );
      return;
    }

    let url = "";
    let title: string | undefined;
    let inputType = await playDl.validate(input);
    switch (inputType) {
      case false:
        await interaction.editReply("Input inválido");
        return;
      case "yt_video":
        server.playUrl(input, interaction);
        break;
      case "sp_track":
        server.playUrl(input, interaction, undefined, false, "spotify");
        break;
      case "yt_playlist":
        const playlistInfo = await playDl.playlist_info(input, {
          incomplete: true,
        });

        server.playPlaylist(playlistInfo, interaction);
        break;
      case "sp_playlist":
        const spotifyPlaylistInfo = await spotify.getPlaylistInfoFromUrl(input);
        server.playPlaylist(spotifyPlaylistInfo);
        break;
      case "search":
        //const searchResult = (await playDl.search(input, { limit: 1 }))[0];
        let searchResult: YouTubeVideo;
        try {
          searchResult = await Utils.getYoutubeVideoInfo(input, "search");
        } catch (err: any) {
          await server.sendMessage(err, false, interaction);
          return;
        }

        title = searchResult.title;
        url = searchResult.url;

        server.playUrl(url, interaction, title);
        break;
      default:
        console.log(input, inputType);
        await interaction.editReply("Não consigo processar esse tipo de input");
        return;
    }
  },
};

export default command;
