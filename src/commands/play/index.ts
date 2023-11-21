import { Command } from "../../models/command";
import * as ytdl from "ytdl-core";
import { SongInfo } from "../../models/song";
import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { PlayerService } from "../../services/player";
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  VoiceBasedChannel,
} from "discord.js";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { Client as YouTubeIClient, VideoCompact } from "youtubei";
import IOCContainer from "../../../inversify.config";

@injectable()
export default class PlayCommand implements Command {
  private playerService: PlayerService;
  private spotifySDK: SpotifyApi;
  private youTubeIClient: YouTubeIClient;

  slashCommandConfig;
  commandNames = ["play"];

  constructor(@inject(TYPES.PlayerService) playerService: PlayerService) {
    this.playerService = playerService;
    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("Plays a song")
      .addStringOption((option) =>
        option
          .setName("input")
          .setDescription("Song name or link")
          .setRequired(true)
      );

    this.spotifySDK = SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET
    );
    this.youTubeIClient = new YouTubeIClient();
  }

  async fetchYouTubePlaylistSongs(url: string): Promise<SongInfo[]> {
    const urlParams = new URLSearchParams(url);
    const playlistID = urlParams.get("list");

    const client = new YouTubeIClient();
    const results = await client.getPlaylist(playlistID);
    let videoItems: VideoCompact[];

    if ("items" in results.videos) {
      results.videos.items;
    }

    const songs: SongInfo[] = videoItems.map((element) => {
      const songURL = new URL("https://www.youtube.com/watch");
      songURL.searchParams.append("v", element.id);

      return {
        url: songURL.toString(),
        title: element.title,
        thumbnail: element.thumbnails[element.thumbnails.length - 1].url,
        query: songURL.toString(),
        description: "From playlist",
        uploader: "Uploader",
      };
    });

    return songs;
  }

  public async fetchRequestedMedia(query): Promise<SongInfo[]> {
    let requestedMedia;
    let requestedMediaURL: string;

    if (query.includes("youtu.be") || query.includes("youtube")) {
      if (query.includes("list")) {
        return await this.fetchYouTubePlaylistSongs(query);
      } else {
        //TODO: Get video id from search & create song object
        requestedMediaURL = query;
        requestedMedia = await ytdl.getInfo(requestedMediaURL);
      }
    } else if (query.includes("https://open.spotify.com")) {
      const type = query.split("/")[3];
      const id = query.split("/")[4];

      console.log(`type: ${type} | id: ${id}`);

      if (type === "track") {
        const result = await this.spotifySDK.tracks.get(id);
        const { name, artists } = result;

        const fullArtists = artists.flatMap((item) => item.name).join(", ");
        const songName = `${fullArtists} - ${name}`;

        const song = {
          url: result.uri,
          title: songName,
          thumbnail: " ",
          description: "Spotify description",
          query: songName,
          uploader: "Spotify uploader",
        };

        return [song];
      } else if (type === "album") {
        const spotifyAlbum = await this.spotifySDK.albums.get(id);

        const artists = spotifyAlbum.artists
          .map((artist) => artist.name)
          .join(" ");

        const { items } = spotifyAlbum.tracks;
        const songs: SongInfo[] = items.map((item) => {
          return {
            url: item.uri,
            title: `${artists} ${item.name}`,
            thumbnail: spotifyAlbum.images[0].url,
            description: "Spotify description",
            query: `${artists} ${item.name}`,
            uploader: spotifyAlbum.label,
          };
        });

        return songs;
      } else if (type === "playlist") {
        const playlist: any = await this.spotifySDK.playlists.getPlaylistItems(
          id
        );
        const { items } = playlist.tracks;
        const songs: SongInfo[] = items.map((item) => {
          const { track } = item;

          const artists = track.artists.map((artist) => artist.name).join(" ");
          return {
            url: track.uri,
            title: `${artists} ${track.name}`,
            thumbnail: " ",
            description: "Spotify description",
            query: `${artists} ${track.name}`,
            uploader: "Spotify uploader",
          };
        });

        return songs;
      }
    } else {
      const searchResults = await this.youTubeIClient.search(query);
      const { items } = searchResults;

      const topResult = items[0] as VideoCompact;
      const { title, thumbnails, description, channel } =
        items[0] as VideoCompact;

      const songURL = new URL("https://www.youtube.com/watch");
      songURL.searchParams.append("v", topResult.id);

      const song: SongInfo = {
        url: songURL.toString(),
        title: title,
        thumbnail: thumbnails[topResult.thumbnails.length - 1].url,
        description: description,
        query: query,
        uploader: channel.name,
      };

      return [song];
    }
  }

  async getVoiceChannelFromInteraction(
    interaction: ChatInputCommandInteraction
  ) {
    const client = IOCContainer.get<Client>(TYPES.DiscordClient);
    const guild = client.guilds.cache.get(interaction.guildId);
    const member = await guild.members.fetch(interaction.member.user.id);

    return member.voice.channel;
  }

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();

      const inputValue = String(interaction.options.data[0].value);

      const songs: SongInfo[] = await this.fetchRequestedMedia(inputValue);

      const voiceChannel: VoiceBasedChannel =
        await this.getVoiceChannelFromInteraction(interaction);

      const embed = await this.playerService.queueSongs(songs, {
        guildId: interaction.guild.id,
        textChannel: interaction.channel,
        voiceChannel: voiceChannel,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      interaction.editReply("Couldn't fetch requested media");
      return Promise.reject(err);
    }
  }
}
