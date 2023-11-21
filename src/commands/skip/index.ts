import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/command";
import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { PlayerService } from "../../services/player";

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

    await this.playerService.skipSong(interaction.guild.id);

    await interaction.deleteReply();
  }
}
