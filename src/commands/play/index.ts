import { Command } from "../../models/command";
import * as ytdl from "ytdl-core";
import { SongInfo } from "../../models/song";
import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { PlayerService } from "../../services/player";
import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandBuilder,
  VoiceBasedChannel,
} from "discord.js";
import { Artist, SpotifyApi } from "@spotify/web-api-ts-sdk";
import { Client as YouTubeIClient, VideoCompact } from "youtubei";
import IOCContainer from "../../inversify.config";

@injectable()
export default class PlayCommand implements Command {
  private playerService: PlayerService;
  private spotifyApi: SpotifyApi;
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

    this.spotifyApi = SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET
    );
    this.youTubeIClient = new YouTubeIClient();
  }

  async fetchYoutubeMedia(uri: string) {
    if (uri.includes("list")) {
      const urlParams = new URLSearchParams(uri);
      const playlistID = urlParams.get("list");

      const client = new YouTubeIClient();
      const results = await client.getPlaylist(playlistID);
      let videoItems: VideoCompact[];

      if ("items" in results.videos) {
        videoItems = results.videos.items;
      } else {
        videoItems = results.videos;
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
    } else {
      const requestedMedia = await ytdl.getInfo(uri);

      if (requestedMedia) {
        const { videoDetails } = requestedMedia;
        const { thumbnails } = videoDetails;
        const thumbnail =
          videoDetails.thumbnails[thumbnails.length - 1].url || null;

        const song = {
          url: videoDetails.video_url,
          title: videoDetails.title,
          thumbnail: thumbnail || " ",
          description: videoDetails.title,
          query: uri,
          uploader: videoDetails.author.name,
        };

        return [song];
      }
    }
  }

  async fetchSpotifyMedia(uri: string): Promise<SongInfo[]> {
    const type = uri.split("/")[3];
    const id = uri.split("/")[4];

    if (type === "track") {
      const result = await this.spotifyApi.tracks.get(id);
      const { name, artists } = result;

      const allArtists = artists
        .flatMap((artist: Artist) => artist.name)
        .join(" ");
      const songName = `${allArtists} - ${name}`;

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
      const spotifyAlbum = await this.spotifyApi.albums.get(id);

      const allArtists: string = spotifyAlbum.artists
        .map((artist: Artist) => artist.name)
        .join(" ");

      const { items } = spotifyAlbum.tracks;
      const songs: SongInfo[] = items.map((item) => {
        return {
          url: item.uri,
          title: `${allArtists} ${item.name}`,
          thumbnail: spotifyAlbum.images[0].url,
          description: "Spotify description",
          query: `${allArtists} ${item.name}`,
          uploader: spotifyAlbum.label,
        };
      });

      return songs;
    } else if (type === "playlist") {
      const playlist: any = await this.spotifyApi.playlists.getPlaylistItems(
        id
      );
      const { items } = playlist.tracks;
      const songs: SongInfo[] = items.map((item) => {
        const { track } = item;

        const artists = track.artists.map((artist) => artist.name).join(" ");
        return {
          url: track.uri,
          title: `${artists} ${track.name}`,
          thumbnail:
            "https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/folder_920_201707260845-1.png",
          description: "Spotify description",
          query: `${artists} ${track.name}`,
          uploader: "Spotify uploader",
        };
      });

      return songs;
    }
  }

  public async fetchRequestedMedia(query: string): Promise<SongInfo[]> {
    if (query.includes("youtu.be") || query.includes("youtube")) {
      return await this.fetchYoutubeMedia(query);
    } else if (query.includes("https://open.spotify.com")) {
      return this.fetchSpotifyMedia(query);
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

      if (songs.length > 1) {
        const queueEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setDescription(`${songs.length} songs added to the queue`)
          .setTimestamp()
          .setFooter({
            text: "Some footer text here",
            iconURL: "https://i.imgur.com/AfFp7pu.png",
          });
        interaction.channel.send({ embeds: [queueEmbed] });
      }

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
