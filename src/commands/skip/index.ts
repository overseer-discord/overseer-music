import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../models/command";
import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { PlayerService } from "../../services/player";
import { SongInfo } from "../../models/song";
import { truncateString } from "../../utils";
import { ServerQueue } from "../../models/queue";
import { GuildQueueService } from "../../services/queue";

@injectable()
export class SkipCommand implements Command {
  private playerService: PlayerService;

  slashCommandConfig;
  commandNames = ["skip"];

  constructor(@inject(TYPES.PlayerService) playerService: PlayerService) {
    this.playerService = playerService;
    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("Skip the currently playing song");
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    this.playerService.nextSong(interaction.guild.id).then((songInfoEmbed) => {
      interaction.editReply({ embeds: [songInfoEmbed] });
    });
  }

  getSongInfoEmbeddedMessage = (song: SongInfo) => {
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
      .addFields({ name: song.uploader, value: song.uploader })
      .setTimestamp()
      .setFooter({
        text: "Some footer text here",
        iconURL: "https://i.imgur.com/AfFp7pu.png",
      });
  };
}
