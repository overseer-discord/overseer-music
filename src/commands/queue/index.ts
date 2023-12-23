import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../models/command";
import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { GuildQueueService } from "../../services/queue";

@injectable()
export class QueueCommand implements Command {
  private queueService: GuildQueueService;
  private messageComponents;

  slashCommandConfig;
  commandNames = ["queue"];

  constructor(
    @inject(TYPES.GuildQueueService) queueService: GuildQueueService
  ) {
    this.queueService = queueService;
    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("See the queue");

    const confirm = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("  > >  ")
      .setStyle(ButtonStyle.Primary);

    const cancel = new ButtonBuilder()
      .setCustomId("previous")
      .setLabel("  < <  ")
      .setStyle(ButtonStyle.Primary);

    this.messageComponents = new ActionRowBuilder().addComponents(
      cancel,
      confirm
    );
  }

  async handleMessageComponent(interaction: ButtonInteraction) {
    const serverQueue = this.queueService.getGuildQueue(interaction.guildId);
    const { customId } = interaction;

    try {
      if (customId === "next") {
        ++serverQueue.page;

        const pageSize = 20;
        const startIndex = (serverQueue.page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const songsMessage = serverQueue.songs
          .slice(startIndex, endIndex)
          .map((song, index) => {
            return `${startIndex + index + 1}) ${song.title}`;
          });

        await interaction.message.edit({
          content: "``` ...\n\n" + songsMessage.join("\n") + "```",
          components: [this.messageComponents as any],
        });
      } else if (customId === "previous") {
        // await confirmation.update({
        //   content: "Action cancelled",
        //   components: [],
        // });
      }
    } catch (e) {
      await interaction.editReply({
        content: "Confirmation not received within 1 minute, cancelling",
        components: [],
      });
    }
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const serverQueue = this.queueService.getGuildQueue(interaction.guildId);

    serverQueue.page = 1;

    const songsMessage = serverQueue.songs.map((song, index) => {
      if (index < serverQueue.page * 20) {
        return `${index + 1}) ${song.title}`;
      }
    });

    await interaction.editReply({
      content: "```" + songsMessage.join("\n") + "```",
      components: [this.messageComponents as any],
    });

    // const collectorFilter = (i) => i.user.id === interaction.user.id;

    // try {
    //   const confirmation = await response.awaitMessageComponent({
    //     filter: collectorFilter,
    //     time: 60000,
    //   });

    //   const { customId } = confirmation;
    //   if (customId === "next") {
    //     ++page;

    //     const pageSize = 20;
    //     const startIndex = (page - 1) * pageSize;
    //     const endIndex = startIndex + pageSize;

    //     const songsMessage = serverQueue.songs
    //       .slice(startIndex, endIndex)
    //       .map((song, index) => {
    //         return `${startIndex + index + 1}) ${song.title}`;
    //       });

    //     console.log("songsMessage", "```" + songsMessage.join("\n") + "```");
    //     console.log("songsMessage.length()", songsMessage.length);
    //     // await interaction.editReply({
    //     //   content: "```" + songsMessage.join("\n") + "```",
    //     //   components: [row as any],
    //     // });
    //     await confirmation.update({
    //       content: "```" + songsMessage.join("\n") + "```",
    //       components: [row as any],
    //     });
    //   } else if (customId === "previous") {
    //     await confirmation.update({
    //       content: "Action cancelled",
    //       components: [],
    //     });
    //   }
    // } catch (e) {
    //   await interaction.editReply({
    //     content: "Confirmation not received within 1 minute, cancelling",
    //     components: [],
    //   });
    // }
  }
}
