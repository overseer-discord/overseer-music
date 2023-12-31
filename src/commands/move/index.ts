import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../models/command";
import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { PlayerService } from "../../services/player";

@injectable()
export class MoveCommand implements Command {
  private playerService: PlayerService;

  slashCommandConfig;
  commandNames = ["move"];

  constructor(@inject(TYPES.PlayerService) playerService: PlayerService) {
    this.playerService = playerService;
    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("Move a specific song around the playlist")
      .addNumberOption((option) =>
        option
          .setName("songposition")
          .setDescription("Position of the song you want to move")
          .setRequired(true)
      )
      .addNumberOption((option) =>
        option
          .setName("movetoposition")
          .setDescription("Position in the queue to move the song to")
          .setRequired(true)
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const songPosition = Number(interaction.options.data[0].value);
    const moveToPosition = Number(interaction.options.data[1].value);

    this.playerService
      .moveSong(interaction.guild.id, songPosition, moveToPosition)
      .then(() => {
        interaction.editReply(
          `Song moved from position ${songPosition} to ${moveToPosition}`
        );
      })
      .catch((error: Error) => {
        interaction.editReply(error.message);
      });
  }
}
