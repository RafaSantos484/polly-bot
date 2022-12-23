import { sessions, youtubeApi } from "./server";
import ytStream from "yt-stream";
import Session from "./classes/session.class";

export function getOrCreateSession(serverKey: string) {
  if (!sessions[serverKey]) sessions[serverKey] = new Session();

  return sessions[serverKey];
}

function isPlayCommand(command: string, session: Session) {
  command = command.toLocaleLowerCase();
  if (command === "@meta" || command === "@meter") {
    session.sendMessage(
      "Como é que eu vou advinhar a porra da música? Digite um link ou texto para pesquisa após o comando"
    );
    return false;
  }
  return command.startsWith("@meta ") || command.startsWith("@meter ");
}
function isStopCommand(command: string) {
  command = command.toLocaleLowerCase();
  return command === "@pare" || command === "@parar";
}
function isSkipCommand(command: string) {
  command = command.toLocaleLowerCase();
  return command === "@pule" || command === "@pular";
}
function isTDFWCommand(command: string) {
  command = command.toLocaleLowerCase();
  return command === "@turndownforwhat" || command === "@tdfw";
}

export function getCommandType(command: string, session: Session) {
  if (isPlayCommand(command, session)) return "play";
  else if (isStopCommand(command)) return "stop";
  else if (isSkipCommand(command)) return "skip";
  else if (isTDFWCommand(command)) return "tdfw";
  else return undefined;
}

async function getStreamThroughTitle(title: string) {
  const searchResult = await youtubeApi.videos.search({
    q: title,
    maxResults: 1,
  });
  return await ytStream.stream(
    `https://youtu.be/${searchResult.items[0].id.videoId}`,
    {
      quality: "high",
      type: "audio",
      highWaterMark: 1048576 * 32,
    }
  );
}
export async function getStream(command: string) {
  try {
    const param = command.slice(command.indexOf(" ") + 1).trim();
    return ytStream.validateVideoURL(param)
      ? await ytStream.stream(param, {
          quality: "high",
          type: "audio",
          highWaterMark: 1048576 * 32,
        })
      : await getStreamThroughTitle(param);
  } catch (err) {
    console.log(err);
    return null;
  }
}
