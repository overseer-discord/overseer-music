import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../models/command";
import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { GuildQueueService } from "../../services/queue";

@injectable()
export class QueueCommand implements Command {
  private queueService: GuildQueueService;

  slashCommandConfig;
  commandNames = ["queue"];

  constructor(
    @inject(TYPES.GuildQueueService) queueService: GuildQueueService,
  ) {
    this.queueService = queueService;
    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("See the queue");
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    let page = 1;
    const serverQueue = this.queueService.getGuildQueue(interaction.guildId);

    const confirm = new ButtonBuilder()
      .setCustomId("confirm")
      .setLabel("  > >  ")
      .setStyle(ButtonStyle.Primary);

    const cancel = new ButtonBuilder()
      .setCustomId("cancel")
      .setLabel("  < <  ")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(cancel, confirm);

    const songsMessage = serverQueue.songs.map((song, index) => {
      if (index < page * 20) {
        return `${index + 1}) ${song.title}`;
      }
    });

    const response = await interaction.editReply({
      content: "```" + songsMessage.join("\n") + "```",
      components: [row as any],
    });

    const collectorFilter = (i) => i.user.id === interaction.user.id;

    try {
      const confirmation = await response.awaitMessageComponent({
        filter: collectorFilter,
        time: 60000,
      });

      const { customId } = confirmation;
      if (customId === "confirm") {
        ++page;

        const songsMessage = serverQueue.songs.map((song, index) => {
          const limit = page * 20;
          if (index < limit - 10 && index < limit) {
            return `${index + 1}) ${song.title}`;
          }
        });

        await interaction.editReply({
          content: "```" + songsMessage.join("\n") + "```",
          components: [row as any],
        });
      } else if (customId === "cancel") {
        await confirmation.update({
          content: "Action cancelled",
          components: [],
        });
      }
    } catch (e) {
      await interaction.editReply({
        content: "Confirmation not received within 1 minute, cancelling",
        components: [],
      });
    }
  }
}
