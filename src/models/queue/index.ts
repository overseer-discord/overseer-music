import { AudioPlayer, VoiceConnection } from "@discordjs/voice";
import { TextBasedChannel } from "discord.js";
import { SongInfo } from "../song";

export interface ServerQueue {
  textChannel: TextBasedChannel;
  voiceChannel: any;
  connection: VoiceConnection;
  player: AudioPlayer;
  songs: SongInfo[];
  songPosition: number;
  volume: number;
  playing: boolean;
  isSkipping?: boolean;
  page?: number;
}
