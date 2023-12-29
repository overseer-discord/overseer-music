import { EmbedBuilder, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import { inject, injectable } from "inversify";
import { TYPES } from "../../types";
import { GuildQueueService } from "../queue";
import play from "play-dl";
import { SongInfo } from "../../models/song";
import { ServerQueue } from "../../models/queue";
import {
  createAudioPlayer,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  joinVoiceChannel,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import { Logger, truncateString } from "../../utils";
import { Client as YouTubeIClient, VideoCompact } from "youtubei";

@injectable()
export class PlayerService {
  private logger: Logger;
  private queueService: GuildQueueService;

  commandNames = ["play"];

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.GuildQueueService) guildQueueService: GuildQueueService
  ) {
    this.logger = logger;
    this.queueService = guildQueueService;
  }

  public async queueSongs(
    songs: SongInfo[],
    options: {
      guildId: string;
      voiceChannel: VoiceBasedChannel;
      textChannel: TextBasedChannel;
    }
  ) {
    const serverQueue = this.queueService.getGuildQueue(options.guildId);

    if (!serverQueue) {
      const newServerQueue: ServerQueue = {
        textChannel: options.textChannel,
        voiceChannel: options.voiceChannel,
        connection: null,
        player: null,
        songs: [],
        songPosition: 0,
        volume: 5,
        playing: true,
      };

      this.queueService.addGuildQueue(options.guildId, newServerQueue);
      newServerQueue.songs.push(...songs);

      try {
        const player = createAudioPlayer({
          behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
          },
        });

        var connection = joinVoiceChannel({
          channelId: options.voiceChannel.id,
          guildId: options.guildId,
          adapterCreator: options.voiceChannel.guild
            .voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
          debug: true,
        });

        player.on("error", (error) => {
          console.error(
            "Error:",
            error.message,
            "with track",
            error.resource.metadata
          );
        });

        newServerQueue.player = player;
        newServerQueue.connection = connection;

        const embeddedMessage = await this.playSong(
          newServerQueue.songs[0],
          options
        );

        return embeddedMessage;
      } catch (err) {
        console.log(err);
        this.queueService.removeGuildQueue(options.guildId);
        return err;
      }
    } else {
      serverQueue.songs.push(...songs);
      //Handle playlist
      const addedSongInfoToQueueEmbeddedMessage =
        this.getAddedSongInfoToQueueEmbeddedMessage(songs[0]);
      return addedSongInfoToQueueEmbeddedMessage;
    }
  }

  public async nextSong(guildId: string): Promise<any> {
    const serverQueue: ServerQueue = this.queueService.getGuildQueue(guildId);

    if (serverQueue) {
      const nextSongPosition = (serverQueue.songPosition += 1);

      if (serverQueue.songs[nextSongPosition]) {
        serverQueue.isSkipping = true;
        serverQueue.player.pause();

        const nextSong = serverQueue.songs[nextSongPosition];

        const embed = await this.playSong(nextSong, {
          guildId: guildId,
          textChannel: serverQueue.textChannel,
          voiceChannel: serverQueue.voiceChannel,
        });

        return embed;
      } else {
        return Promise.reject(new Error("Reached the end of the queue"));
      }
    }
  }

  public async previousSong(guildId: string): Promise<any> {
    const serverQueue: ServerQueue = this.queueService.getGuildQueue(guildId);

    if (serverQueue) {
      const previousSongPosition = (serverQueue.songPosition -= 1);

      if (
        previousSongPosition >= 0 &&
        serverQueue.songs[previousSongPosition]
      ) {
        serverQueue.isSkipping = true;
        serverQueue.player.pause();

        const previousSong = serverQueue.songs[previousSongPosition];

        const embed = await this.playSong(previousSong, {
          guildId: guildId,
          textChannel: serverQueue.textChannel,
          voiceChannel: serverQueue.voiceChannel,
        });

        return embed;
      } else {
        return Promise.reject(new Error("Reached the beginning of the queue"));
      }
    }
  }

  public async pauseSong(options: { guildId: string }) {
    const serverQueue: ServerQueue = this.queueService.getGuildQueue(
      options.guildId
    );

    if (serverQueue && serverQueue.songs.length) {
      serverQueue.player.pause();
      serverQueue.isPlaying = false;
    }
  }

  public async resumeSong(guildId: string) {
    const serverQueue: ServerQueue = this.queueService.getGuildQueue(guildId);

    if (serverQueue && serverQueue.songs.length) {
      serverQueue.player.unpause();
      serverQueue.isPlaying = true;
    }
  }

  private async playSong(
    song: SongInfo,
    options: {
      guildId: string;
      textChannel: any;
      voiceChannel: VoiceBasedChannel;
    }
  ) {
    const client = new YouTubeIClient();
    const serverQueue: ServerQueue = this.queueService.getGuildQueue(
      options.guildId
    );

    if (!song) {
      this.queueService.removeGuildQueue(options.guildId);
      return;
    }

    try {
      if (song.url.includes("spotify")) {
        const searchResults = await client.search(song.query);
        const { items } = searchResults;
        const topResult = items[0] as VideoCompact;

        const songURL = new URL("https://www.youtube.com/watch");
        songURL.searchParams.append("v", topResult.id);

        song.description = topResult.description;
        song.uploader = topResult.channel.name;
        song.thumbnail =
          topResult.thumbnails[topResult.thumbnails.length - 1].url;
        song.url = songURL.toString();
      }

      const stream = await play.stream(song.url);
      stream.stream.on("close", () => {
        if (serverQueue.isSkipping === true) {
          serverQueue.isSkipping = false;
        } else {
          this.handleSongFinish(options.guildId, serverQueue);
        }
      });

      const resource = this.createAudioResource(stream.stream, stream.type);

      this.startPlaying(serverQueue, resource);
      const songInfoEmbed = this.getSongInfoEmbeddedMessage(song, serverQueue);

      return songInfoEmbed;
    } catch (err) {
      console.log(err);
    }
  }

  private handleSongFinish(guildId: string, serverQueue: ServerQueue) {
    const nextSongPosition = (serverQueue.songPosition += 1);

    if (nextSongPosition === serverQueue.songs.length) {
      console.log("You have reached the end of the queue");
    } else {
      const nextSong = serverQueue.songs[nextSongPosition];
      this.playSong(nextSong, {
        guildId: guildId,
        textChannel: serverQueue.textChannel,
        voiceChannel: serverQueue.voiceChannel,
      }).then((nextSongInfo) => {
        serverQueue.textChannel.send({ embeds: [nextSongInfo] });
      });
    }
  }

  private createAudioResource(stream: any, type: any) {
    return createAudioResource(stream, {
      inputType: type,
      inlineVolume: true,
    });
  }

  private startPlaying(serverQueue: ServerQueue, resource: any) {
    serverQueue.player.play(resource);
    serverQueue.connection.subscribe(serverQueue.player);
    serverQueue.isPlaying = true;
  }

  getSongInfoEmbeddedMessage = (song: SongInfo, queue: ServerQueue) => {
    return new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(song.title)
      .setURL(song.url)
      .setAuthor({
        name: "Now playing...",
        iconURL: "https://i.imgur.com/AfFp7pu.png",
        url: "https://discord.js.org",
      })
      .setDescription(truncateString(song.description || "--", 50))
      .setThumbnail(song.thumbnail)
      .addFields({ name: "Uploader", value: song.uploader, inline: true })
      .addFields({
        name: "Song position",
        value: `[ ${queue.songPosition + 1} / ${queue.songs.length} ]`,
        inline: true,
      })
      .setTimestamp()
      .setFooter({
        text: "Some footer text here",
        iconURL: "https://i.imgur.com/AfFp7pu.png",
      });
  };

  getAddedSongInfoToQueueEmbeddedMessage = (song: SongInfo) => {
    return new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(song.title)
      .setURL(song.url)
      .setAuthor({
        name: "Added song to queue...",
        iconURL: "https://i.imgur.com/AfFp7pu.png",
        url: "https://discord.js.org",
      })
      .setThumbnail(song.thumbnail);
  };

  getAddedPlaylistToQueueEmbeddedMessage = (songs: SongInfo[]) => {
    return new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Playlist")
      .setAuthor({
        name: `Added ${songs.length} songs to the queue..`,
        iconURL: "https://i.imgur.com/AfFp7pu.png",
        url: "https://discord.js.org",
      })
      .setThumbnail(songs[0].thumbnail);
  };
}
