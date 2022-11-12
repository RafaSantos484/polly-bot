import { Client, TextChannel } from "discord.js";
import dotenv from "dotenv";
import {
  getOrCreateSession,
  getStream,
  isPlayCommand,
  isSkipCommand,
  isStopCommand,
} from "./utils";
import YoutubeApi from "youtube.ts";
import Session from "./classes/session.class";
import { AudioPlayerStatus } from "@discordjs/voice";

dotenv.config();

//export const youtubeApi = new YoutubeApi(process.env.GOOGLE_API_KEY);
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

  // failed to get the voice channel
  const voiceChannel = message.member?.voice.channel;
  const session = getOrCreateSession(message.guild.id);
  session.textChannel = message.channel as TextChannel;
  if (!voiceChannel) {
    await session.sendMessage("Falha ao tentar entrar no canal de voz", true);
    return;
  }

  if (isPlayCommand(content, session)) {
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

    const stream = await getStream(content);
    if (stream) {
      if (!(await session.pushStream(stream))) {
        await session.sendMessage("Falha ao tentar inserir vídeo na fila");
        return;
      }
    } else {
      await session.sendMessage("Falha ao tentar obter informações do vídeo");
      return;
    }
  } else if (isStopCommand(content)) {
    await session.sendMessage("Parando...");
    session.leaveVoiceChannel();
  } else if (isSkipCommand(content)) {
    if (session.player.state.status !== AudioPlayerStatus.Playing) {
      session.sendMessage("Como é que eu vou pular se nem tô tocando nada?");
      return;
    }
    session.skipStream();
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
