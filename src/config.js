"use strict";

const extend = require("extend");
// Filesystem stuff
const fse = require("fs-extra");
const path = require("path");
const mkdirp = require("mkdirp");
const envPaths = require("env-paths");

const paths = envPaths(require("../package.json").name);

class Config {
  constructor(configPath) {
    this.configPath = configPath || Config.defaultPath;
  }
  /**
   * Load the config from the provided path and apply the loaded values to the current object.
   * If the file could not be found the defaults will be used.
   *
   * @memberof Config
   */
  async load(ignore = false) {
    let customValues = {};
    if (!ignore && (await fse.exists(this.configPath))) {
      customValues = await fse.readJson(this.configPath, {
        encoding: "utf8",
      });
      // Filter out values that do not belong into the config file
      Object.keys(customValues).forEach((key) => {
        if (Config.defaults[key] === undefined) {
          delete customValues[key];
        }
      });
      // do additional stuff with the loaded values
      if (customValues.silent === true) {
        customValues.quiet = true;
      }
    }
    extend(true, this, Config.defaults, customValues);
  }
  /**
   * Applies the values from the provided argv onto this configuration
   *
   * @param {object} argv The arguments passed to rwd
   * @memberof Config
   */
  applyArgv(argv) {
    Object.keys(Config.defaults).forEach((key) => {
      if (argv[key] !== undefined) {
        this[key] = argv[key];
      }
    });
    // do additional stuff with the applied values
    if (this.silent === true) {
      this.quiet = true;
    }
  }
  asJSON() {
    // Filter out other values like configPath from the final json
    return JSON.stringify(this, Object.keys(Config.defaults), 2);
  }
  /**
   * Write the current configuration to the provided path.
   *
   * @memberof Config
   */
  async write() {
    await mkdirp(path.dirname(this.configPath));
    await fse.writeFile(this.configPath, this.asJSON(), {
      encoding: "utf8",
    });
  }
}

Config.fromArgv = async (argv) => {
  let config = new Config(argv.config);
  await config.load(argv["ignore-config"] === true);
  config.applyArgv(argv);
  return config;
};

Config.defaultPath = path.join(paths.config, "config.json");

Config.defaults = {
  // if quiet will only print errors
  quiet: false,
  // if silent will print nothing
  silent: false,
  // the subreddit to download the images from
  subreddit: "wallpapers",
  // directory where the final downloaded pictures should be located
  output: "~/Pictures/Wallpapers/Reddit/",
  // should an extra folder for each subreddit be created
  "create-subreddit-folder": true,
  "min-width": 1920,
  "min-height": 1080,
  // If set to true, the image is required to be wider than its high
  "require-landscape": true,
  amount: 20,
  // available sort modes: hot, new, random, rising, top, controversial
  "sort-mode": "top",
  // if sort mode is top or controversial, this setting is used:
  // available timeframes: hour day week month year all
  timeframe: "all",
  // if sort mode is host, this setting is used:
  // for available regions check have a look at this: https://www.reddit.com/dev/api#GET_hot
  region: "GLOBAL",
  // the useragent that should be used for the request. the version is automatically appended
  "user-agent": "reddit-wallpaper-downloader",
  // file extensions in the url that should be downloaded. does not verify the actual content of the file
  extensions: [".png", ".jpeg", ".jpg"],
  // If set to false, only download urls from i.redd.it or i.imgur.com are allowed
  "allow-external-urls": false,
};

module.exports = {
  Config,
};
