import extend from "extend";
import fse from "fs-extra";
import path from "path";
import envPaths from "env-paths";
import { IConfig, SortMode, Timeframe } from "./types";
import { Arguments } from "yargs";

const paths = envPaths(require("../package.json").name);

export class Config implements IConfig {
  public static readonly defaultPath = path.join(paths.config, "config.json");
  private static readonly defaults: IConfig = {
    quiet: false,
    silent: false,
    subreddit: "wallpapers",
    output: "~/Pictures/Wallpapers/Reddit/",
    "create-subreddit-folder": true,
    "skip-dimension-check": false,
    "min-width": 1920,
    "min-height": 1080,
    "require-landscape": true,
    amount: 20,
    "sort-mode": SortMode.TOP,
    timeframe: Timeframe.ALL,
    region: "GLOBAL",
    "user-agent": "reddit-wallpaper-downloader",
    extensions: [".png", ".jpeg", ".jpg"],
    "allow-external-urls": false,
  };

  public static async fromArgv(argv: Arguments<string>) {
    let config = new Config(argv.config as string);
    await config.load(argv["ignore-config"] === true);
    config.applyArgv(argv);
    return config;
  }

  private readonly configPath: string;
  private values: IConfig = Config.defaults;

  public get quiet(): boolean {
    return this.values.quiet;
  }

  public get silent(): boolean {
    return this.values.silent;
  }

  public get subreddit(): string {
    return this.values.subreddit;
  }

  public get output(): string {
    return this.values.output;
  }

  public get "create-subreddit-folder"(): boolean {
    return this.values["create-subreddit-folder"];
  }

  public get "skip-dimension-check"(): boolean {
    return this.values["skip-dimension-check"];
  }

  public get "min-width"(): number {
    return this.values["min-width"];
  }

  public get "min-height"(): number {
    return this.values["min-height"];
  }

  public get "require-landscape"(): boolean {
    return this.values["require-landscape"];
  }

  public get amount(): number {
    return this.values.amount;
  }

  public get "sort-mode"(): SortMode {
    return this.values["sort-mode"];
  }

  public get timeframe(): Timeframe {
    return this.values.timeframe;
  }

  public get region(): string {
    return this.values.region;
  }

  public get "user-agent"(): string {
    return this.values["user-agent"];
  }

  public get extensions(): string[] {
    return this.values.extensions;
  }

  public get "allow-external-urls"(): boolean {
    return this.values["allow-external-urls"];
  }

  constructor(configPath: string) {
    this.configPath = configPath || Config.defaultPath;
  }

  /**
   * Load the config from the provided path and apply the loaded values to the current object.
   * If the file could not be found the defaults will be used.
   */
  async load(ignore: boolean = false): Promise<void> {
    let customValues: any = {};
    if (!ignore && (await fse.pathExists(this.configPath))) {
      customValues = await fse.readJson(this.configPath, {
        encoding: "utf8",
      });
      // Filter out values that do not belong into the config file
      let defaultPropertyNames: string[] = Object.getOwnPropertyNames(Config.defaults);
      Object.keys(customValues).forEach((key: string) => {
        if (defaultPropertyNames.indexOf(key) === 0) {
          delete customValues[key];
        }
      });
      // do additional stuff with the loaded values
      if (customValues.silent === true) {
        customValues.quiet = true;
      }
    }
    // Cannot use deep extend, because then the extensions array breaks
    // If in the file only one value is used, it replaces the first value, but does not add to it or overrides it entirely
    extend(this.values, Config.defaults, customValues);
  }

  /**
   * Applies the values from the provided argv onto this configuration
   *
   * @param {object} argv The arguments passed to rwd
   * @memberof Config
   */
  applyArgv(argv: Arguments) {
    Object.keys(Config.defaults).forEach((key) => {
      if (argv[key] !== undefined) {
        (this.values as any)[key] = argv[key];
      }
    });
    // do additional stuff with the applied values
    if (this.values.silent) {
      this.values.quiet = true;
    }
  }

  asJSON(): string {
    return JSON.stringify(this.values, undefined, 2);
  }

  /**
   * Write the current configuration to the provided path.
   *
   * @memberof Config
   */
  async write(): Promise<void> {
    await fse.mkdirp(path.dirname(this.configPath));
    await fse.writeFile(this.configPath, this.asJSON(), {
      encoding: "utf8",
    });
  }
}