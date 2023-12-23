import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { CommandContext } from "./context";

export interface Command {
  readonly commandNames: string[];
  readonly description?: string;
  slashCommandConfig?: Omit<
    SlashCommandBuilder,
    "addSubcommand" | "addSubcommandGroup"
  >;

  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  handleMessageComponent?(interaction: ButtonInteraction): Promise<void>;
  hasPermissionToRun?(parsedUserCommand: CommandContext): boolean;
}
