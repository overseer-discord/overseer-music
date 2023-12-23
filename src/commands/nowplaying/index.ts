import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  EmbedBuilder,
} from "discord.js";
import { inject, injectable } from "inversify";
import { Command } from "../../models/command";
import { SongInfo } from "../../models/song";
import { GuildQueueService } from "../../services/queue";
import { TYPES } from "../../types";
import { truncateString } from "../../utils";

@injectable()
export default class NowPlayingCommand implements Command {
  private queueService: GuildQueueService;

  commandNames = ["now-playing"];
  description?: string;
  slashCommandConfig?: Omit<
    SlashCommandBuilder,
    "addSubcommand" | "addSubcommandGroup"
  >;

  constructor(
    @inject(TYPES.GuildQueueService) queueService: GuildQueueService
  ) {
    this.queueService = queueService;
    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("See the current playing song");
  }

  async execute(
    interaction: ChatInputCommandInteraction<CacheType>
  ): Promise<void> {
    await interaction.deferReply();
    const serverQueue = this.queueService.getGuildQueue(interaction.guildId);

    if (!serverQueue) {
      console.log("serverQueue.player.state", serverQueue.player.state);
      console.log(
        "There is no server queue || There's nothing playing || queue is empty"
      );
    }

    const currentPlayingSong = serverQueue.songs[serverQueue.songPosition];
    const songInfoEmbed = this.getSongInfoEmbeddedMessage(currentPlayingSong);

    interaction.editReply({ embeds: [songInfoEmbed] });
  }

  getSongInfoEmbeddedMessage = (song: SongInfo) => {
    return new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(song.title)
      .setURL(song.url)
      .setAuthor({
        name: "Currently playing...",
        iconURL: "https://i.imgur.com/AfFp7pu.png",
        url: "https://discord.js.org",
      })
      .setDescription(truncateString(song.description || "--", 50))
      .setThumbnail(song.thumbnail)
      .addFields({ name: "Uploader", value: song.uploader })
      .setTimestamp();
  };
}
