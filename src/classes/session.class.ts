import { TextChannel, VoiceBasedChannel } from "discord.js";
import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice";
import ytdl from "ytdl-core";

export type Video = {
  title: string;
  url: string;
};

export default class Session {
  public currentConnection: VoiceConnection | undefined;
  public voiceChannel: VoiceBasedChannel | undefined;
  public textChannel: TextChannel | undefined;
  public player: AudioPlayer;
  public currentVideo: Video | undefined;
  public queue: Video[];

  constructor() {
    this.queue = [];
    this.player = createAudioPlayer();
    this.player.on(AudioPlayerStatus.Idle, async () => {
      if (!this.currentConnection) return;

      const newVideo = this.queue.shift();
      if (!newVideo) {
        await this.sendMessage("A fila não têm mais músicas. Vou de fuga");
        this.leaveVoiceChannel();
      } else if (!this.playVideo(newVideo)) {
        await this.sendMessage("Falha ao tentar obter conexão atual", true);
        return;
      }
    });
    this.player.on("error", (err) => {
      console.log(err);
      this.sendMessage(
        "Falha ao tentar tocar música. Tentando tocar novamente"
      );
      try {
        if (!this.currentVideo) throw new Error();

        const stream = ytdl(this.currentVideo.url, {
          filter: "audioonly",
          begin: err.resource.playbackDuration,
        });
        this.player.play(createAudioResource(stream));
        this.sendMessage("Tocando novamente");
      } catch {
        this.sendMessage("Falha ao tentar tocar novamente");
      }
    });
  }

  private resetSession() {
    this.currentConnection?.destroy();
    this.currentConnection = undefined;
    this.voiceChannel = undefined;
    this.textChannel = undefined;
    this.currentVideo = undefined;

    this.player.stop();
    this.queue = [];
  }

  public async sendMessage(message: string, leaveVoiceChannel = false) {
    const sentMessage = await this.textChannel?.send(message);
    setTimeout(() => sentMessage?.delete(), 60000);
    if (leaveVoiceChannel) this.leaveVoiceChannel();
  }

  public joinVoiceChannel() {
    if (!this.voiceChannel) return false;

    const channelId = this.voiceChannel.id;
    const guildId = this.voiceChannel.guildId;
    const adapterCreator = this.voiceChannel.guild.voiceAdapterCreator;
    try {
      this.currentConnection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator,
      });
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
  public leaveVoiceChannel() {
    try {
      this.resetSession();
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  public playVideo(video: Video) {
    if (!this.currentConnection) return false;

    try {
      this.sendMessage(`Metendo ${video.title}`);
      const stream = ytdl(video.url, { filter: "audioonly" });
      this.player.play(createAudioResource(stream));
      this.currentVideo = video;
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
  public async pushVideo(video: Video) {
    try {
      if (
        this.queue.length === 0 &&
        this.player.state.status !== AudioPlayerStatus.Playing
      ) {
        if (this.playVideo(video))
          this.currentConnection?.subscribe(this.player);
        else throw new Error();
      } else {
        this.sendMessage(`${video.title} inserido na fila`);
        this.queue.push(video);
      }
      return true;
    } catch {
      await this.sendMessage("Falha ao tentar obter conexão atual", true);
      return false;
    }
  }
  public skipVideo() {
    try {
      if (this.player.state.status !== AudioPlayerStatus.Playing) {
        this.sendMessage("Como é que eu vou pular se nem tô tocando nada?");
        return false;
      } else if (!this.player.stop(true)) throw new Error();

      return true;
    } catch {
      this.sendMessage("Falha ao tentar pular música");
      return false;
    }
  }
}
