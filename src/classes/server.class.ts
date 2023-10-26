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
import {
  SoundCloudStream,
  YouTubePlayList,
  YouTubeStream,
  search,
} from "play-dl";
import Utils from "./utils.class";
import { firebase, spotify } from "..";
import { SpotifyPlaylistBasicInfo } from "./spotify.class";

type SrcType = "youtubeUrl" | "spotifyUrl" | "search";
type Queue = Array<{ src: string; srcType: SrcType; title?: string }>;

export default class Server {
  queue: Queue;
  textChannel: TextBasedChannel | null;
  private connection: VoiceConnection | undefined;
  player: AudioPlayer;

  constructor() {
    this.queue = [];
    this.textChannel = null;
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, async () => {
      this.playNextUrlOnQueue();
    });
    this.player.on("error", async (err) => {
      console.error(err.message);
      await this.sendMessage("Rolou um erro enquanto estava tocando vídeo");
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

  pushToQueue(src: string, srcType: SrcType, title?: string) {
    this.queue.push({ src, title, srcType });
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
    const nextTrack = this.queue.shift();
    if (nextTrack) {
      await this.playSrc(
        nextTrack.src,
        nextTrack.srcType,
        undefined,
        nextTrack.title,
        true
      );
    } else {
      await this.sendMessage("A fila não têm mais músicas. Vou de fuga", true);
    }
  }
  async playSrc(
    src: string,
    srcType: SrcType,
    interaction?: ChatInputCommandInteraction<CacheType>,
    title?: string,
    playNow = false
  ) {
    if (!this.connection) return;

    if (this.isIdle() || playNow) {
      let stream: YouTubeStream | SoundCloudStream;
      try {
        if (srcType === "spotifyUrl") {
          const spotifyId = spotify.getTrackIdFromUrl(src);
          if (!spotifyId) {
            this.sendMessage(
              "Falha ao tentar obter Id da track do Spotify",
              false,
              interaction
            );
            this.playNextUrlOnQueue();
            return;
          }

          if (spotifyId in firebase.spotifyToYoutube) {
            const youtubeInfo = firebase.spotifyToYoutube[spotifyId];
            title = youtubeInfo.title;
            src = `https://www.youtube.com/watch?v=${youtubeInfo.youtubeId}`;
          } else {
            const { search, spotifyId } = await spotify.getTrackSearchFromUrl(
              src
            );
            const searchResult = await Utils.getYoutubeVideoInfo(
              search,
              "search"
            );
            if (searchResult.id) {
              firebase.spotifyToYoutube[spotifyId] = {
                youtubeId: searchResult.id,
                title: searchResult.title || "",
              };
              await firebase.setSpotifyToYoutubeDoc(firebase.spotifyToYoutube);
            }
            title = searchResult.title;
            src = searchResult.url;
          }
        } else if (srcType === "search") {
          const searchResult = await Utils.getYoutubeVideoInfo(src, "search");
          title = searchResult.title || "";
          src = searchResult.url;
        }

        title = title || (await Utils.getYoutubeVideoInfo(src)).title;
        stream = await Utils.getStream(src);
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
      this.pushToQueue(src, srcType, title);
      this.sendMessage("Vídeo inserido na fila", false, interaction);
    }
  }

  async playPlaylist(
    playlist: YouTubePlayList | SpotifyPlaylistBasicInfo,
    interaction?: ChatInputCommandInteraction<CacheType>,
    playNow = false,
    shuffle = false
  ) {
    if (!this.connection) return;

    //const tracks = await playlist.all_tracks();
    const title = playlist.title;
    let mappedTracks: Queue;
    if (playlist instanceof YouTubePlayList) {
      const tracks = await playlist.all_videos();
      mappedTracks = tracks.map((track) => ({
        src: track.url,
        title: track.title,
        srcType: "youtubeUrl",
      }));
    } else {
      /*mappedTracks = playlist.tracksSearch.map((search) => ({
        src: search,
        srcType: "search",
      }));*/
      mappedTracks = playlist.tracks.map((track) => ({
        src: `https://open.spotify.com/intl-pt/track/${track.id}`,
        srcType: "spotifyUrl",
        title: track.title,
      }));
    }

    if (shuffle) {
      mappedTracks = Utils.shuffleArray(mappedTracks);
    }

    if (this.isIdle() || playNow) {
      this.queue = mappedTracks;
      await this.sendMessage(`Metendo playlist ${title}`, false, interaction);
      await this.playNextUrlOnQueue();
    } else {
      this.queue = this.queue.concat(mappedTracks);
      this.sendMessage(
        `Playlist ${title} inserida na fila`,
        false,
        interaction
      );
    }
  }
}
