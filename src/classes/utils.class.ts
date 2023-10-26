import { search, stream, video_basic_info } from "play-dl";

export default class Utils {
  static shuffleArray<T>(array: T[]) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  static async getYoutubeVideoInfo(
    query: string,
    inputType: "url" | "search" = "url"
  ) {
    try {
      if (inputType === "search") {
        return (await search(`audio ${query}`, { limit: 1 }))[0];
      } else {
        // inputType === "url"
        return (await video_basic_info(query)).video_details;
      }
    } catch (err: any) {
      if (err.toString().includes("Sign in to confirm your age")) {
        throw "Não posso tocar vídeos com restrição de idade";
      } else throw "Falha ao tentar tentar tocar vídeo";
    }
  }

  static async getStream(youtubeStream: string) {
    try {
      return await stream(youtubeStream);
    } catch (err: any) {
      if (err.toString().includes("Sign in to confirm your age")) {
        throw "Não posso tocar vídeos com restrição de idade";
      } else throw "Falha ao tentar tentar tocar vídeo";
    }
  }
}
