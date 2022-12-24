import { TextChannel, VoiceBasedChannel } from "discord.js";
import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice";
import ytStream from "yt-stream";
import { getStream } from "../utils";

export default class Session {
  public currentConnection: VoiceConnection | undefined;
  public voiceChannel: VoiceBasedChannel | undefined;
  public textChannel: TextChannel | undefined;
  public player: AudioPlayer;
  public queue: ytStream.Stream[];
  public currentVideoUrl: string;
  public loopVideo: boolean;

  constructor() {
    this.queue = [];
    this.currentVideoUrl = "";
    this.loopVideo = false;
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, async () => {
      if (!this.currentConnection) return;

      if (this.loopVideo) {
        const stream = await getStream(`@meta ${this.currentVideoUrl}`, this);
        if (!stream) {
          await this.sendMessage(
            "Falha ao tentar obter informações do vídeo",
            true
          );
          return;
        }
        if (!(await this.playStream(stream)))
          await this.sendMessage("Falha ao tentar obter conexão atual", true);

        return;
      }

      const nextStream = this.queue.shift();
      this.currentVideoUrl = nextStream?.info.url || "";
      if (!nextStream) {
        await this.sendMessage(
          "A fila não têm mais músicas. Vou de fuga",
          true
        );
      } else if (!(await this.playStream(nextStream))) {
        await this.sendMessage("Falha ao tentar obter conexão atual", true);
      }
    });
    this.player.on("error", (err) => {
      console.log(err);
      this.sendMessage("Falha ao tentar tocar música");
    });
  }

  private resetSession() {
    this.currentConnection?.destroy();
    this.currentConnection = undefined;
    this.voiceChannel = undefined;
    this.textChannel = undefined;
    this.currentVideoUrl = "";

    this.player.stop();
    this.queue = [];
  }

  public async sendMessage(message: string, leaveVoiceChannel = false) {
    await this.textChannel?.send(message);
    //setTimeout(() => sentMessage?.delete(), 60000);
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

  public async playStream(stream: ytStream.Stream) {
    if (!this.currentConnection) return false;

    try {
      this.currentVideoUrl = stream.info.url;
      this.sendMessage(`Metendo ${stream.info.title}`);
      this.player.play(createAudioResource(stream.stream));
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
  public async pushStream(stream: ytStream.Stream) {
    try {
      if (
        this.queue.length === 0 &&
        this.player.state.status !== AudioPlayerStatus.Playing
      ) {
        if (await this.playStream(stream))
          this.currentConnection?.subscribe(this.player);
        else throw new Error();
      } else {
        this.sendMessage(`${stream.info.title} inserido na fila`);
        this.queue.push(stream);
      }
      return true;
    } catch {
      return false;
    }
  }
  public skipStream() {
    try {
      return this.player.stop(true);
    } catch {
      this.sendMessage("Falha ao tentar pular música");
      return false;
    }
  }
}
