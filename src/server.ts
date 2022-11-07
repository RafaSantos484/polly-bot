import { Client, TextChannel } from "discord.js";
import dotenv from "dotenv";
import YoutubeApi from "youtube.ts"; // https://www.npmjs.com/package/youtube.ts
import { getVideo, isPlayCommand } from "./utils";
import Session from "./classes/session.class";

dotenv.config();

export const youtubeApi = new YoutubeApi(process.env.GOOGLE_API_KEY);
const client = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent", "GuildVoiceStates"],
});
export const session = new Session();

client.on("ready", () => {
  console.log(`Logged as ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  // the author is a bot
  if (message.author.bot) return;

  const { content } = message;
  // its not a command of the bot
  if (!content.startsWith("@")) return;

  // failed to get the voice channel
  const voiceChannel = message.member?.voice.channel;
  session.textChannel = message.channel as TextChannel;
  if (!voiceChannel) {
    await session.sendMessage("Falha ao tentar entrar no canal de voz", true);
    return;
  }

  if (isPlayCommand(content)) {
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

    const video = await getVideo(content);
    if (video) {
      session.pushVideo(video);
    } else {
      // its not necessary to stop playing
      await session.sendMessage("Falha ao tentar obter informações do vídeo");
      return;
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
