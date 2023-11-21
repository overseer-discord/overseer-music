import { Client, GatewayIntentBits } from "discord.js";
import { Container } from "inversify";
import { MusicBot } from "./src/bot";
import { PauseCommand } from "./src/commands/pause";
import PlayCommand from "./src/commands/play";
import { QueueCommand } from "./src/commands/queue";
import { ResumeCommand } from "./src/commands/resume";
import { SkipCommand } from "./src/commands/skip";
import { CommandHandler } from "./src/handlers/command";
import { PlayerService } from "./src/services/player";
import { GuildQueueService } from "./src/services/queue";
import { TYPES } from "./src/types";
import { Logger } from "./src/utils";

const IOCContainer = new Container();

IOCContainer.bind<MusicBot>(TYPES.MusicBot).to(MusicBot).inSingletonScope();
IOCContainer.bind<GuildQueueService>(TYPES.GuildQueueService)
  .to(GuildQueueService)
  .inSingletonScope();
IOCContainer.bind<CommandHandler>(TYPES.CommandHandler)
  .to(CommandHandler)
  .inSingletonScope();
IOCContainer.bind<Logger>(TYPES.Logger).to(Logger).inSingletonScope();
IOCContainer.bind<PlayerService>(TYPES.PlayerService)
  .to(PlayerService)
  .inSingletonScope();
IOCContainer.bind<SkipCommand>(TYPES.SkipCommand)
  .to(SkipCommand)
  .inSingletonScope();
IOCContainer.bind<PlayCommand>(TYPES.PlayCommand)
  .to(PlayCommand)
  .inSingletonScope();
IOCContainer.bind<PauseCommand>(TYPES.PauseCommand)
  .to(PauseCommand)
  .inSingletonScope();
IOCContainer.bind<ResumeCommand>(TYPES.ResumeCommand)
  .to(ResumeCommand)
  .inSingletonScope();
IOCContainer.bind<QueueCommand>(TYPES.QueueCommand)
  .to(QueueCommand)
  .inSingletonScope();
IOCContainer.bind<Client>(TYPES.DiscordClient).toConstantValue(
  new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
    ],
    shards: "auto",
    failIfNotExists: false,
  })
);

export default IOCContainer;
