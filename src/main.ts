import "reflect-metadata";
import dotenv from "dotenv";
import { MusicBot } from "./bot";
import IOCContainer from "./inversify.config";
import { TYPES } from "./types";
import { Logger } from "./utils";
import express, { Express, Request, Response } from "express";

dotenv.config();

class Application {
  private musicBot: MusicBot;
  private logger: Logger;

  app: Express = express();
  port = process.env.PORT || 3000;

  constructor() {
    this.musicBot = IOCContainer.get<MusicBot>(TYPES.MusicBot);
    this.logger = IOCContainer.get<Logger>(TYPES.Logger);
  }

  public start() {
    this.musicBot
      .start()
      .then(() => {
        this.logger.info("Bot started successfully");
        this.startServer();
      })
      .catch((err) => {
        this.logger.error("There was an error starting the Bot: ", err);
      });
  }

  public startServer() {
    this.app.get("/health", (req: Request, res: Response) => {
      this.musicBot
        .health()
        .then((health) => {
          res.status(200).send(health);
        })
        .catch((err) => {
          this.logger.error(err);
          res.status(500).send();
        });
    });

    this.app.listen(this.port, () => {
      this.logger.info(
        `[server]: Server is running at http://localhost:${this.port}`
      );
    });
  }
}

const app = new Application();
app.start();
