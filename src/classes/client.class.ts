import {
  Client as _Client,
  Collection,
  SlashCommandBuilder,
  ClientOptions,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import Server from "./server.class";

export default class Client extends _Client {
  commands: Collection<
    string,
    {
      data: any;
      execute: (
        interaction: ChatInputCommandInteraction<CacheType>,
        serverId: string
      ) => any;
    }
  >;
  public servers: { [id: string]: Server };

  constructor(options: ClientOptions) {
    super(options);
    this.commands = new Collection();
    this.servers = {};
  }
}
