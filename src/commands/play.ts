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
    .setDescription("Meto(la ele) uma faixa ou playlist")
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription("Link do que eu vou tocar")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("params").setDescription("Me diga como devo tocar")
    ),
  execute: async (
    interaction: ChatInputCommandInteraction<CacheType>,
    serverId: string
  ) => {
    const input = interaction.options.get("input")?.value;
    const paramsStr = interaction.options.get("params")?.value;
    if (typeof input !== "string") {
      await interaction.reply("Meta um input válido");
      return;
    }
    let params: string[] = [];
    if (typeof paramsStr === "string") {
      params = paramsStr.split(" ").map((p) => p.toLowerCase());
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

    const inputType = await playDl.validate(input);
    /*const playNow = params.includes("agora");
    const shuffle =
      params.includes("embaralhe") || params.includes("embaralhar");*/
    const hasParam = {
      playNow: false,
      shuffle: false,
    };
    for (const param of params) {
      if (param === "agora") hasParam.playNow = true;
      if (param === "embaralhe" || param === "embaralhar")
        hasParam.shuffle = true;
    }
    if (inputType === false) {
      await interaction.editReply("Input inválido");
      return;
    } else if (inputType === "yt_video") {
      server.playSrc(
        input,
        "youtubeUrl",
        interaction,
        undefined,
        hasParam.playNow
      );
    } else if (inputType === "sp_track") {
      server.playSrc(
        input,
        "spotifyUrl",
        interaction,
        undefined,
        hasParam.playNow
      );
    } else if (inputType === "yt_playlist") {
      const playlistInfo = await playDl.playlist_info(input, {
        incomplete: true,
      });
      server.playPlaylist(
        playlistInfo,
        interaction,
        hasParam.playNow,
        hasParam.shuffle
      );
    } else if (inputType === "sp_playlist") {
      const spotifyPlaylistInfo = await spotify.getPlaylistInfoFromUrl(input);
      server.playPlaylist(
        spotifyPlaylistInfo,
        interaction,
        hasParam.playNow,
        hasParam.shuffle
      );
    } else if (inputType === "search") {
      //const searchResult = (await playDl.search(input, { limit: 1 }))[0];
      let searchResult: YouTubeVideo;
      try {
        searchResult = await Utils.getYoutubeVideoInfo(input, "search");
      } catch (err: any) {
        await server.sendMessage(err, false, interaction);
        return;
      }

      const { url, title } = searchResult;
      server.playSrc(url, "youtubeUrl", interaction, title, hasParam.playNow);
    } else {
      console.log(input, inputType);
      await interaction.editReply("Não consigo processar esse tipo de input");
    }
  },
};

export default command;
