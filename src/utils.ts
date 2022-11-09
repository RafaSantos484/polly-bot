import { session, youtubeApi } from "./server";
import { Video } from "./classes/session.class";

export function isPlayCommand(command: string) {
  command = command.toLocaleLowerCase();
  if (command === "@meta" || command === "@meter") {
    session.sendMessage(
      "Como é que eu vou advinhar a porra da música? Digite um link ou texto para pesquisa após o comando"
    );
    return false;
  }
  return command.startsWith("@meta ") || command.startsWith("@meter ");
}
export function isStopCommand(command: string) {
  command = command.toLocaleLowerCase();
  return command === "@pare" || command === "@parar";
}
export function isSkipCommand(command: string) {
  command = command.toLocaleLowerCase();
  return command === "@pule" || command === "@pular";
}

async function getVideoThroughTitle(title: string) {
  const searchResult = await youtubeApi.videos.search({
    q: title,
    maxResults: 1,
  });
  return {
    title: searchResult.items[0].snippet.title,
    url: `https://www.youtube.com/watch?v=${searchResult.items[0].id.videoId}`,
  } as Video;
}
export async function getVideo(command: string) {
  try {
    let i = command.indexOf(" ");
    do i++;
    while (command[i] === " ");

    const param = command.substring(i);
    if (param.startsWith("https://youtu.be")) {
      const videoId = param.split("/").pop();
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const videoInfo = await youtubeApi.videos.get(url);
      return { title: videoInfo.snippet.title, url } as Video;
    } else if (param.startsWith("https://www.youtube.com")) {
      const videoInfo = await youtubeApi.videos.get(param.split("&")[0]);
      return {
        title: videoInfo.snippet.title,
        url: `https://www.youtube.com/watch?v=${videoInfo.id}`,
      } as Video;
    } else return await getVideoThroughTitle(param);
  } catch (err) {
    console.log(err);
    return null;
  }
}
