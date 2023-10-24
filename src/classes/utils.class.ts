import { search, stream, video_basic_info } from "play-dl";

export default class Utils {
  static async getYoutubeVideoInfo(
    query: string,
    inputType: "url" | "search" = "url"
  ) {
    if (inputType === "search") {
      return (await search(query, { limit: 1 }))[0];
    } else {
      // inputType === "url"
      return (await video_basic_info(query)).video_details;
    }
  }

  static async getStream(url: string) {
    try {
      return await stream(url);
    } catch (err: any) {
      if (err.toString().includes("Sign in to confirm your age")) {
        throw "Não posso tocar vídeos com restrição de idade";
      } else throw "Falha ao tentar tentar tocar vídeo";
    }
  }
}
