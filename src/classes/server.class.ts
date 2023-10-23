import {
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnection,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import {
  TextBasedChannel,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import playDl, { YouTubePlayList } from "play-dl";

export default class Server {
  queue: string[];
  textChannel: TextBasedChannel | null;
  private connection: VoiceConnection | undefined;
  player: AudioPlayer;

  constructor() {
    this.queue = [];
    this.textChannel = null;
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, async () => {
      if (!this.connection) return;

      const nextVideo = this.queue.shift();
      if (!nextVideo) {
        await this.sendMessage(
          "A fila não têm mais músicas. Vou de fuga",
          true
        );
        return;
      }

      const videoInfo = await playDl.video_info(nextVideo);
      const { title } = videoInfo.video_details;
      const stream = await playDl.stream_from_info(videoInfo);
      this.sendMessage(`Metendo ${title}`);
      this.player.play(
        createAudioResource(stream.stream, { inputType: stream.type })
      );
    });
    this.player.on("error", async (err) => {
      console.error(err.message);
      console.error(err.resource);
      await this.sendMessage("Deu ruim", true);
      this.disconnect();
    });
  }

  async connect(
    voiceChannelId: string,
    guildId: string,
    voiceAdapterCreator: any,
    interaction?: ChatInputCommandInteraction<CacheType>
  ) {
    if (
      !this.connection ||
      this.connection.joinConfig.channelId !== voiceChannelId
    ) {
      this.setConnection(
        joinVoiceChannel({
          channelId: voiceChannelId,
          guildId,
          adapterCreator: voiceAdapterCreator,
        })
      );
      if (!this.subscribePlayer()) {
        this.disconnect();
        await this.sendMessage("Falha ao tentar tocar", true, interaction);
        return false;
      }
    }
    return true;
  }
  disconnect() {
    const { connection } = this;
    this.connection = undefined;
    this.queue = [];
    this.player.stop(true);
    connection?.destroy();
  }

  async sendMessage(
    message: string,
    disconnect = false,
    interaction?: ChatInputCommandInteraction<CacheType>
  ) {
    await (interaction
      ? interaction.editReply(message)
      : this.textChannel?.send(message));
    //setTimeout(() => sentMessage?.delete(), 60000);
    if (disconnect) this.disconnect();
  }

  setConnection(connection: VoiceConnection) {
    this.disconnect();
    this.connection = connection;
  }
  isConnected() {
    return !!this.connection;
  }
  subscribePlayer() {
    if (this.connection) {
      const dispatch = this.connection.subscribe(this.player);
      return !!dispatch;
    }
    return false;
  }
  isIdle() {
    return (
      this.queue.length === 0 &&
      this.player.state.status !== AudioPlayerStatus.Playing &&
      this.player.state.status !== AudioPlayerStatus.Buffering
    );
  }

  async playYoutubeUrl(
    youtubeUrl: string,
    interaction?: ChatInputCommandInteraction<CacheType>,
    title?: string
  ) {
    if (!this.connection) return;

    // TODO: validar input
    if (this.isIdle()) {
      if (interaction) {
        await interaction.editReply("Metendo");
      }

      //const stream = ytdl(input, { filter: "audioonly" });
      title =
        title || (await playDl.video_info(youtubeUrl)).video_details.title;
      const stream = await playDl.stream(youtubeUrl);

      this.player.play(
        createAudioResource(stream.stream, { inputType: stream.type })
      );
      if (title) {
        this.sendMessage(`Metendo ${title}`, false, interaction);
      }
    } else {
      this.queue.push(youtubeUrl);
      this.sendMessage("Vídeo inserido na fila", false, interaction);
    }
  }
  async playYoutubePlaylist(
    youtubePlaylist: YouTubePlayList,
    interaction?: ChatInputCommandInteraction<CacheType>,
    title?: string
  ) {
    if (!this.connection) return;

    const videos = await youtubePlaylist.all_videos();
    if (this.isIdle()) {
      const nextVideo = videos.shift();
      if (!nextVideo) return;

      await this.sendMessage(`Metendo playlist ${title}`, false, interaction);
      await this.playYoutubeUrl(nextVideo.url, undefined, nextVideo.title);
      this.queue = this.queue.concat(videos.map((video) => video.url));
    } else {
      this.queue = this.queue.concat(videos.map((video) => video.url));
      this.sendMessage(
        `Playlist ${title} inserida na fila`,
        false,
        interaction
      );
    }
  }
}
