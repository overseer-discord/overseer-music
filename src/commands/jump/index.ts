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
export class JumpCommand implements Command {
  private playerService: PlayerService;

  slashCommandConfig;
  commandNames = ["jump"];

  constructor(@inject(TYPES.PlayerService) playerService: PlayerService) {
    this.playerService = playerService;
    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("Jump to a specific song")
      .addNumberOption((option) =>
        option
          .setName("position")
          .setDescription("Position of song to jump to")
          .setRequired(true)
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inputValue = Number(interaction.options.data[0].value);

    this.playerService
      .jumpToSong(interaction.guild.id, inputValue)
      .then((songInfoEmbed) => {
        interaction.editReply({ embeds: [songInfoEmbed] });
      })
      .catch((error) => {
        return new Error(`Error skipping song: ${error}`);
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
