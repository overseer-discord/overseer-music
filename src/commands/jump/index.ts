import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/command";
import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { PlayerService } from "../../services/player";

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
      .catch((error: Error) => {
        interaction.editReply(`Error skipping song: ${error.message}`);
      });
  }
}
