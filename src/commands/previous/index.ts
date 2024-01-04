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

@injectable()
export class PreviousCommand implements Command {
  private playerService: PlayerService;

  slashCommandConfig;
  commandNames = ["previous"];

  constructor(@inject(TYPES.PlayerService) playerService: PlayerService) {
    this.playerService = playerService;
    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("Go back to the previous song");
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    this.playerService
      .previousSong(interaction.guild.id)
      .then((songInfoEmbed) => {
        interaction.editReply({ embeds: [songInfoEmbed] });
      })
      .catch((error: Error) => {
        interaction.editReply({ content: error.message });
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
      .setTimestamp();
  };
}
