import { Client, GatewayIntentBits } from "discord.js";
import { Container } from "inversify";
import { MusicBot } from "./bot";
import { JumpCommand } from "./commands/jump";
import { MoveCommand } from "./commands/move";
import NowPlayingCommand from "./commands/nowplaying";
import { PauseCommand } from "./commands/pause";
import PlayCommand from "./commands/play";
import { PreviousCommand } from "./commands/previous";
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
IOCContainer.bind<CommandsHandler>(TYPES.CommandsHandler)
  .to(CommandsHandler)
  .inSingletonScope();
IOCContainer.bind<Logger>(TYPES.Logger).to(Logger).inSingletonScope();
IOCContainer.bind<PlayerService>(TYPES.PlayerService)
  .to(PlayerService)
  .inSingletonScope();
IOCContainer.bind<SkipCommand>(TYPES.SkipCommand)
  .to(SkipCommand)
  .inSingletonScope();
IOCContainer.bind<PreviousCommand>(TYPES.PreviousCommand)
  .to(PreviousCommand)
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
IOCContainer.bind<NowPlayingCommand>(TYPES.NowPlayingCommand)
  .to(NowPlayingCommand)
  .inSingletonScope();
IOCContainer.bind<JumpCommand>(TYPES.JumpCommand)
  .to(JumpCommand)
  .inSingletonScope();
IOCContainer.bind<MoveCommand>(TYPES.MoveCommand)
  .to(MoveCommand)
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
