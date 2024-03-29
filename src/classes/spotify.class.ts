import axios from "axios";
import dotenv from "dotenv";
import { SpotifyTrack } from "play-dl";

dotenv.config();

export type SpotifyPlaylistBasicInfo = {
  title: string;
  tracks: Array<{ id: string; title: string }>;
};

const Authorization = `Basic ${Buffer.from(
  `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
).toString("base64")}`;

export default class Spotify {
  private accessToken: string | undefined;
  private tokenGenerationTime: Date | undefined;

  private async getAccessToken() {
    if (!this.isAccessTokenExpired()) return this.accessToken;

    if (!this.isAccessTokenExpired()) return this.accessToken;

    const res = await axios.post(
      "https://accounts.spotify.com/api/token",
      { grant_type: "client_credentials" },
      {
        headers: {
          Authorization,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    this.tokenGenerationTime = new Date();
    this.accessToken = res.data.access_token;
    return res.data.access_token as string;
  }
  private isAccessTokenExpired() {
    if (!this.accessToken || !this.tokenGenerationTime) return true;
    const deltaT = +new Date() - +this.tokenGenerationTime;
    return deltaT > 3500e3;
  }

  getTrackIdFromUrl(trackUrl: string) {
    return new URL(trackUrl).pathname.split("/").pop();
  }

  async getTrackSearchFromUrl(trackUrl: string) {
    const token = await this.getAccessToken();
    const trackId = this.getTrackIdFromUrl(trackUrl);
    if (!trackId) throw "Falha ao tentar processar URL da faixa do Spotify";

    try {
      const res = await axios.get(
        `https://api.spotify.com/v1/tracks/${trackId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const track = new SpotifyTrack(res.data);
      let search = track.name;
      for (const artist of track.artists) search += ` ${artist.name}`;

      return { search, spotifyId: trackId };
    } catch (err) {
      console.log(err);
      throw "Falha ao tentar obter informações da faixa do Spotify";
    }
  }

  async getPlaylistInfoFromUrl(playlistUrl: string) {
    const token = await this.getAccessToken();
    const playlistId = this.getTrackIdFromUrl(playlistUrl);
    if (!playlistId)
      throw "Falha ao tentar processar URL da playlist do Spotify";

    try {
      const res = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const playlistInfo: SpotifyPlaylistBasicInfo = {
        title: res.data.name,
        tracks: [],
      };
      let title = "";
      for (const item of res.data.tracks.items) {
        if (item.track) {
          title = item.track.name;
          for (const artist of item.track.artists) title += ` ${artist.name}`;

          playlistInfo.tracks.push({ id: item.track.id, title });
        }
        title = "";
      }

      return playlistInfo;
    } catch (err) {
      console.log(err);
      throw "Falha ao tentar obter informações da playlist do Spotify";
    }
  }
}
