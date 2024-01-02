import { Command } from "../../models/command";
import * as ytdl from "ytdl-core";
import { SongInfo } from "../../models/song";
import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { PlayerService } from "../../services/player";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandBuilder,
  VoiceBasedChannel,
} from "discord.js";
import { Artist, SpotifyApi } from "@spotify/web-api-ts-sdk";
import { Client as YouTubeIClient, VideoCompact } from "youtubei";
import IOCContainer from "../../inversify.config";
import { GuildQueueService } from "../../services/queue";
import { res } from "pino-std-serializers";
import { formatSecondsToReadableTime } from "../../utils";

enum PlayCommandMessageComponentID {
  NEXT_SONG = "play.nextSongButton",
  PREV_SONG = "play.prevSongButton",
  PAUSE_SONG = "play.pauseSongButton",
}

@injectable()
export default class PlayCommand implements Command {
  private queueService: GuildQueueService;
  private playerService: PlayerService;
  private spotifyApi: SpotifyApi;
  private youTubeIClient: YouTubeIClient;
  private messageComponents;

  slashCommandConfig;
  commandNames = ["play"];

  constructor(
    @inject(TYPES.PlayerService) playerService: PlayerService,
    @inject(TYPES.GuildQueueService) queueService: GuildQueueService
  ) {
    this.playerService = playerService;
    this.queueService = queueService;
    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("Plays a song")
      .addStringOption((option) =>
        option
          .setName("input")
          .setDescription("Song name or link")
          .setRequired(true)
      );

    const nextSongButton = new ButtonBuilder()
      .setCustomId(PlayCommandMessageComponentID.NEXT_SONG)
      .setLabel("  ⏭️  ")
      .setStyle(ButtonStyle.Primary);

    const pauseSongButton = new ButtonBuilder()
      .setCustomId(PlayCommandMessageComponentID.PAUSE_SONG)
      .setLabel("  ⏸  ")
      .setStyle(ButtonStyle.Primary);

    const prevSongButton = new ButtonBuilder()
      .setCustomId(PlayCommandMessageComponentID.PREV_SONG)
      .setLabel("  ⏮️  ")
      .setStyle(ButtonStyle.Primary);

    this.messageComponents = new ActionRowBuilder().addComponents(
      prevSongButton,
      pauseSongButton,
      nextSongButton
    );

    this.spotifyApi = SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET
    );
    this.youTubeIClient = new YouTubeIClient();
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

      const messageComponents = new ActionRowBuilder();

      messageComponents.addComponents(
        new ButtonBuilder()
          .setCustomId(PlayCommandMessageComponentID.NEXT_SONG)
          .setLabel("  ⏭️  ")
          .setStyle(ButtonStyle.Primary)
      );

      messageComponents.addComponents(
        new ButtonBuilder()
          .setCustomId(PlayCommandMessageComponentID.PAUSE_SONG)
          .setLabel("  ⏸  ")
          .setStyle(ButtonStyle.Primary)
      );

      messageComponents.addComponents(
        new ButtonBuilder()
          .setCustomId(PlayCommandMessageComponentID.PREV_SONG)
          .setLabel("  ⏮️  ")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({
        embeds: [embed],
        components: [messageComponents as any],
      });

      if (songs.length > 1) {
        const playlistDuration = songs.reduce(
          (totalDuration, song) => totalDuration + song.duration,
          0
        );
        const formattedSeconds = formatSecondsToReadableTime(playlistDuration);

        const queueEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(
            `${songs.length} songs added to the queue \`${formattedSeconds} \``
          )
          .setTimestamp();
        interaction.channel.send({ embeds: [queueEmbed] });
      }
    } catch (err) {
      interaction.editReply("Couldn't fetch requested media");
      return Promise.reject(err);
    }
  }

  async handleMessageComponent(interaction: ButtonInteraction) {
    const serverQueue = this.queueService.getGuildQueue(interaction.guildId);
    const { customId } = interaction;

    try {
      switch (customId) {
        case PlayCommandMessageComponentID.NEXT_SONG:
          const nextSongembed = await this.playerService.nextSong(
            interaction.guildId
          );
          await interaction.update({
            embeds: [nextSongembed],
            components: [this.messageComponents as any],
          });
          break;
        case PlayCommandMessageComponentID.PAUSE_SONG:
          if (serverQueue.isPlaying == true) {
            await this.playerService.pauseSong({
              guildId: interaction.guildId,
            });

            const nextSongButton = new ButtonBuilder()
              .setCustomId(PlayCommandMessageComponentID.NEXT_SONG)
              .setLabel("  ⏭️  ")
              .setStyle(ButtonStyle.Primary);

            const pauseSongButton = new ButtonBuilder()
              .setCustomId(PlayCommandMessageComponentID.PAUSE_SONG)
              .setLabel("  ▶  ")
              .setStyle(ButtonStyle.Primary);

            const prevSongButton = new ButtonBuilder()
              .setCustomId(PlayCommandMessageComponentID.PREV_SONG)
              .setLabel("  ⏮️  ")
              .setStyle(ButtonStyle.Primary);

            const messageComponents = new ActionRowBuilder().addComponents(
              prevSongButton,
              pauseSongButton,
              nextSongButton
            );

            await interaction.update({
              components: [messageComponents as any],
            });
            break;
          } else {
            await this.playerService.resumeSong(interaction.guildId);

            const nextSongButton = new ButtonBuilder()
              .setCustomId(PlayCommandMessageComponentID.NEXT_SONG)
              .setLabel("  ⏭️  ")
              .setStyle(ButtonStyle.Primary);

            const pauseSongButton = new ButtonBuilder()
              .setCustomId(PlayCommandMessageComponentID.PAUSE_SONG)
              .setLabel("  ⏸  ")
              .setStyle(ButtonStyle.Primary);

            const prevSongButton = new ButtonBuilder()
              .setCustomId(PlayCommandMessageComponentID.PREV_SONG)
              .setLabel("  ⏮️  ")
              .setStyle(ButtonStyle.Primary);

            const messageComponents = new ActionRowBuilder().addComponents(
              prevSongButton,
              pauseSongButton,
              nextSongButton
            );

            await interaction.update({
              components: [messageComponents as any],
            });
            break;
          }
        case PlayCommandMessageComponentID.PREV_SONG:
          const previousSongEmbed = await this.playerService.previousSong(
            interaction.guildId
          );
          await interaction.update({
            embeds: [previousSongEmbed],
            components: [this.messageComponents as any],
          });
          break;
        default:
          break;
      }
    } catch (e) {
      await interaction.editReply({
        content: "Confirmation not received within 1 minute, cancelling",
        components: [],
      });
    }
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
          duration: element.duration,
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
          duration: Number(videoDetails.lengthSeconds),
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
        duration: result.duration_ms * 1000,
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
          duration: item.duration_ms * 1000,
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
          duration: track.duration_ms * 1000,
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
        duration: topResult.duration,
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
}
