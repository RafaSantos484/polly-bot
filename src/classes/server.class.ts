import {
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnection,
  createAudioPlayer,
  createAudioResource,
} from "@discordjs/voice";
import {
  TextBasedChannel,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import ytdl from "ytdl-core";

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

      this.play(nextVideo);
    });
  }

  disconnect() {
    this.queue = [];
    this.player.stop(true);
    if (this.connection) {
      //this.connection.disconnect();
      this.connection.destroy();
      this.connection = undefined;
    }
  }

  async sendMessage(message: string, disconnect = false) {
    await this.textChannel?.send(message);
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

  async play(
    input: string,
    interaction?: ChatInputCommandInteraction<CacheType>
  ) {
    if (!this.connection) return;

    if (
      this.queue.length === 0 &&
      this.player.state.status !== AudioPlayerStatus.Playing &&
      this.player.state.status !== AudioPlayerStatus.Buffering
    ) {
      const stream = ytdl(input, { filter: "audioonly" });
      this.player.play(createAudioResource(stream));
      await (interaction
        ? interaction.reply(`Metendo ${input}`)
        : this.sendMessage(`Metendo ${input}`));
    } else {
      this.queue.push(input);
      await (interaction
        ? interaction.reply(`${input} inserido na fila`)
        : this.sendMessage(`${input} inserido na fila`));
    }
  }
}