import "reflect-metadata";
import dotenv from "dotenv";
import { MusicBot } from "./bot";
import IOCContainer from "./inversify.config";
import { TYPES } from "./types";
import { Logger } from "./utils";

dotenv.config();

class Application {
  private musicBot: MusicBot;
  private logger: Logger;

  constructor() {
    this.musicBot = IOCContainer.get<MusicBot>(TYPES.MusicBot);
    this.logger = IOCContainer.get<Logger>(TYPES.Logger);
  }

  public start() {
    this.musicBot
      .start()
      .then(() => this.logger.info("Bot started succesfully"))
      .catch((err) => {
        this.logger.error("There was an error starting the Bot: ", err);
      });
  }
}

const app = new Application();
app.start();
