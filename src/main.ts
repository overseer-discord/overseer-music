import "reflect-metadata";
import dotenv from "dotenv";
import { MusicBot } from "./bot";
import IOCContainer from "../inversify.config";
import { TYPES } from "./types";

dotenv.config();

class Application {
  private bot = IOCContainer.get<MusicBot>(TYPES.MusicBot);

  constructor() {}

  run() {
    this.bot
      .start()
      .then(() => console.log("overseer-music bot started succesfully"))
      .catch((err) => {
        console.error(err);
      });
  }
}

const app = new Application();
app.run();
