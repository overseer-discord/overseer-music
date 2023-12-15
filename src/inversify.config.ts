import { Client, GatewayIntentBits } from "discord.js";
import { Container } from "inversify";
import { MusicBot } from "./bot";
import { PauseCommand } from "./commands/pause";
import PlayCommand from "./commands/play";
import { QueueCommand } from "./commands/queue";
import { ResumeCommand } from "./commands/resume";
import { SkipCommand } from "./commands/skip";
import { CommandsHandler } from "./handlers/command";
import { PlayerService } from "./services/player";
import { GuildQueueService } from "./services/queue";
import { TYPES } from "./types";
import { Logger } from "./utils";

const IOCContainer = new Container();

IOCContainer.bind<MusicBot>(TYPES.MusicBot).to(MusicBot).inSingletonScope();
IOCContainer.bind<GuildQueueService>(TYPES.GuildQueueService)
  .to(GuildQueueService)
  .inSingletonScope();
IOCContainer.bind<CommandsHandler>(TYPES.CommandHandler)
  .to(CommandsHandler)
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
