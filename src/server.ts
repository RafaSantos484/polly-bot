import { Client, TextChannel } from "discord.js";
import dotenv from "dotenv";
import {
  getCommandType,
  getOrCreateSession,
  getSpecialPlayCommand,
  getStream,
} from "./utils";
import YoutubeApi from "youtube.ts";
import Session from "./classes/session.class";
import { AudioPlayerStatus } from "@discordjs/voice";

dotenv.config();

const client = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent", "GuildVoiceStates"],
});
export const sessions: { [serverKey: string]: Session } = {};
export const youtubeApi = new YoutubeApi(process.env.GOOGLE_API_KEY);

client.on("ready", () => {
  console.log(`Logged as ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  // the author is a bot
  if (message.author.bot) return;
  // couldn't get server's id
  if (!message.guild?.id) return;

  const { content } = message;
  // its not a command of the bot
  if (!content.startsWith("@")) return;

  const session = getOrCreateSession(message.guild.id);
  session.textChannel = message.channel as TextChannel;
  const voiceChannel = message.member?.voice.channel;

  const command = getCommandType(content, session);
  if (!command) return;
  // failed to get the voice channel
  if (!voiceChannel) {
    await session.sendMessage("Falha ao tentar entrar no canal de voz", true);
    return;
  }

  if (command === "play") {
    if (!session.voiceChannel) {
      session.voiceChannel = voiceChannel;
      const joinedChannel = session.joinVoiceChannel();
      if (!joinedChannel) {
        await session.sendMessage(
          "Falha ao tentar entrar no canal de voz",
          true
        );
        return;
      }
    }

    const stream = await getStream(
      getSpecialPlayCommand(content) || content,
      session
    );
    if (stream) {
      session.currentVideoUrl = stream.info.url;
      if (!(await session.pushStream(stream))) {
        await session.sendMessage("Falha ao tentar inserir vídeo na fila");
        return;
      }
    } else {
      await session.sendMessage("Falha ao tentar obter informações do vídeo");
      return;
    }
  } else if (command === "stop") {
    await session.sendMessage("Parando...", true);
  } else if (command === "skip") {
    if (session.player.state.status !== AudioPlayerStatus.Playing) {
      session.sendMessage("Como é que eu vou pular se nem tô tocando nada?");
      return;
    }
    session.skipStream();
  } else if (command === "toogle_loop_video") {
    if (session.loopVideo) {
      session.sendMessage("Desativando loop de vídeo");
    } else {
      session.sendMessage("Ativando loop de vídeo");
    }
    session.loopVideo = !session.loopVideo;
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
