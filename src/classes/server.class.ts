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
import playDl, {
  SoundCloudStream,
  YouTubePlayList,
  YouTubeStream,
} from "play-dl";
import Utils from "./utils.class";

type UrlType = "youtube" | "spotfy";

export default class Server {
  queue: Array<{ url: string; urlType: UrlType; title?: string }>;
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

      let stream: YouTubeStream | SoundCloudStream;
      try {
        stream = await Utils.getStream(nextVideo.url);
      } catch (err: any) {
        await this.sendMessage(err);
        await this.playNextUrlOnQueue();
        return;
      }

      const title =
        nextVideo.title ||
        (await playDl.video_info(nextVideo.url)).video_details;
      this.sendMessage(`Metendo ${title}`);
      this.player.play(
        createAudioResource(stream.stream, { inputType: stream.type })
      );
    });
    this.player.on("error", async (err) => {
      console.error(err.message);
      await this.sendMessage("Erro enquanto estava tocando vídeo", true);
      await this.playNextUrlOnQueue();
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

  pushToQueue(url: string, title?: string, urlType: UrlType = "youtube") {
    this.queue.push({ url, title, urlType });
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

  private async playNextUrlOnQueue() {
    const nextVideo = this.queue.shift();
    if (nextVideo) {
      await this.playYoutubeUrl(
        nextVideo.url,
        undefined,
        nextVideo.title,
        true
      );
    } else {
      await this.sendMessage("A fila não têm mais músicas. Vou de fuga", true);
    }
  }
  async playYoutubeUrl(
    youtubeUrl: string,
    interaction?: ChatInputCommandInteraction<CacheType>,
    title?: string,
    playNow = false
  ) {
    if (!this.connection) return;

    if (this.isIdle() || playNow) {
      let stream: YouTubeStream | SoundCloudStream;
      try {
        title = title || (await Utils.getYoutubeVideoInfo(youtubeUrl)).title;
        stream = await Utils.getStream(youtubeUrl);
      } catch (err: any) {
        await this.sendMessage(err, false, interaction);
        await this.playNextUrlOnQueue();
        return;
      }

      this.player.play(
        createAudioResource(stream.stream, { inputType: stream.type })
      );
      this.sendMessage(`Metendo ${title}`, false, interaction);
    } else {
      this.pushToQueue(youtubeUrl);
      this.sendMessage("Vídeo inserido na fila", false, interaction);
    }
  }
  async playPlaylist(
    youtubePlaylist: YouTubePlayList,
    interaction?: ChatInputCommandInteraction<CacheType>,
    title?: string,
    type: UrlType = "youtube"
  ) {
    if (!this.connection) return;

    const videos = await youtubePlaylist.all_videos();
    if (this.isIdle()) {
      this.queue = videos.map((video) => ({
        url: video.url,
        title: video.title,
        urlType: type,
      }));
      await this.sendMessage(`Metendo playlist ${title}`, false, interaction);
      await this.playNextUrlOnQueue();
    } else {
      this.queue = this.queue.concat(
        videos.map((video) => ({
          url: video.url,
          title: video.title,
          urlType: type,
        }))
      );
      this.sendMessage(
        `Playlist ${title} inserida na fila`,
        false,
        interaction
      );
    }
  }
}
