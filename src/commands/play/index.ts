import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
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
import IOCContainer from "../../inversify.config";
import { formatSecondsToReadableTime } from "../../utils";
import { GuildQueueService, MediaService, PlayerService } from "../../services";
import { Command, ServerQueue, SongInfo } from "../../models";

enum PlayCommandMessageComponentID {
  NEXT_SONG = "play.nextSongButton",
  PREV_SONG = "play.prevSongButton",
  TOGGLE_PAUSE = "play.pauseSongButton",
}

@injectable()
export default class PlayCommand implements Command {
  private queueService: GuildQueueService;
  private playerService: PlayerService;
  private mediaService: MediaService;

  slashCommandConfig;
  commandNames = ["play"];

  constructor(
    @inject(TYPES.PlayerService) playerService: PlayerService,
    @inject(TYPES.GuildQueueService) queueService: GuildQueueService
  ) {
    this.playerService = playerService;
    this.queueService = queueService;
    this.mediaService = new MediaService();

    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("Plays a song")
      .addStringOption((option) =>
        option
          .setName("input")
          .setDescription("Song name or link")
          .setRequired(true)
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();

      const inputValue = String(interaction.options.data[0].value);

      const songs: SongInfo[] = await this.mediaService.fetchRequestedMedia(
        inputValue
      );

      const voiceChannel: VoiceBasedChannel =
        await this.getVoiceChannelFromInteraction(interaction);

      const embed = await this.playerService.queueSongs(songs, {
        guildId: interaction.guild.id,
        textChannel: interaction.channel,
        voiceChannel: voiceChannel,
      });

      const serverQueue = this.queueService.getGuildQueue(interaction.guildId);
      const messageComponents = this.createMessageComponents(serverQueue);

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
          const nextSongMessageComponents =
            this.createMessageComponents(serverQueue);

          await interaction.update({
            embeds: [nextSongembed],
            components: [nextSongMessageComponents as any],
          });
          break;

        case PlayCommandMessageComponentID.TOGGLE_PAUSE:
          if (serverQueue.isPlaying === true) {
            await this.playerService.pauseSong({
              guildId: interaction.guildId,
            });
          } else {
            await this.playerService.resumeSong(interaction.guildId);
          }

          const togglePauseMessageComponents =
            this.createMessageComponents(serverQueue);

          await interaction.update({
            components: [togglePauseMessageComponents as any],
          });
          break;

        case PlayCommandMessageComponentID.PREV_SONG:
          const previousSongEmbed = await this.playerService.previousSong(
            interaction.guildId
          );

          const previousSongMessageComponents =
            this.createMessageComponents(serverQueue);

          await interaction.update({
            embeds: [previousSongEmbed],
            components: [previousSongMessageComponents as any],
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

  createMessageComponents(serverQueue: ServerQueue): ActionRowBuilder {
    return new ActionRowBuilder().addComponents([
      new ButtonBuilder()
        .setCustomId(PlayCommandMessageComponentID.PREV_SONG)
        .setLabel("  ⏪  ")
        .setDisabled(serverQueue.songPosition === 0)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(PlayCommandMessageComponentID.TOGGLE_PAUSE)
        .setLabel(serverQueue.isPlaying == true ? "  ⏸  " : "  ▶  ")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(PlayCommandMessageComponentID.NEXT_SONG)
        .setLabel("  ⏭️  ")
        .setStyle(ButtonStyle.Primary),
    ]);
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
