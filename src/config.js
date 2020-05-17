"use strict";

const { promisify } = require("util");
const extend = require("extend");
// Filesystem stuff
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const envPaths = require("env-paths");

// Promisified fs calls
const fsExists = promisify(fs.exists);
const fsReadFile = promisify(fs.readFile);
const fsWriteFile = promisify(fs.writeFile);

const paths = envPaths(require("../package.json").name);

class Config {
  constructor(configPath) {
    this.configPath = configPath || path.join(paths.config, "config.json");
  }
  /**
   * Load the config from the provided path and apply the loaded values to the current object.
   * If the file could not be found the defaults will be used.
   *
   * @memberof Config
   */
  async load() {
    let customValues = {};
    if (await fsExists(this.configPath)) {
      customValues = JSON.parse(await fsReadFile(this.configPath, "utf8"));
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
   * Write the current configuration to the provided path.
   *
   * @memberof Config
   */
  async write() {
    // Filter out other values like configPath from the final json
    let jsonValue = JSON.stringify(this, Object.keys(Config.defaults), 2);
    await mkdirp(path.dirname(this.configPath));
    fsWriteFile(this.configPath, jsonValue, {
      encoding: "utf8",
    });
  }
}

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
  // available time windows: hour day week moth year all
  "time-window": "all",
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
