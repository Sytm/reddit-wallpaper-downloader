#!/usr/bin/env node
"use strict";

require("make-promises-safe");
const chalk = require("chalk");

const { Config } = require("./src/config");
const { Downloader } = require("./src/downloader");

require("yargs")
  .usage("Usage: $0 <command> [options]")

  .group(["quiet", "silent"], "Verbosity:")
  .option("q", {
    boolean: true,
    alias: "quiet",
    description: "Only print errors to the console",
  })
  .option("silent", {
    boolean: true,
    description: "Print nothing to the console",
  })

  .group(["output", "create-subreddit-folder"], "Output:")
  .option("o", {
    string: true,
    alias: "output",
    description: "Set the output folder",
  })
  .option("O", {
    boolean: true,
    alias: "create-subreddit-folder",
    description:
      "Create a subfolder for each subreddit in the provided output folder",
  })

  .group(
    ["subreddit", "amount", "sort-mode", "timeframe", "region"],
    "Reddit selection:",
  )
  .option("s", {
    string: true,
    alias: "subreddit",
    description: "Subreddit to retrieve the posts from",
  })
  .option("a", {
    number: true,
    alias: "amount",
    description: "Final amount of new images",
  })
  .option("S", {
    choices: ["hot", "new", "random", "rising", "top", "controversial"],
    alias: "sort-mode",
    description: "Sorting to use to request listings from subreddits",
  })
  .option("t", {
    choices: ["hour", "day", "week", "month", "year", "all"],
    alias: "timeframe",
    description: "Timeframe for top and controversial",
  })
  .option("r", {
    string: true,
    alias: "region",
    description:
      "Region to use for hot. See https://www.reddit.com/dev/api#GET_hot",
  })

  .group(
    ["user-agent", "extensions", "allow-external-urls"],
    "Download settings:",
  )
  .option("u", {
    string: true,
    alias: "user-agent",
    description: "Set a custom User-Agent for API requests",
  })
  .option("e", {
    array: true,
    alias: "extensions",
    description: "Valid file extensions that get downloaded",
  })
  .option("E", {
    boolean: true,
    alias: "allow-external-urls",
    description:
      "Allow download of images from hosts other than i.redd.it and i.imgur.com",
  })

  .group(
    ["min-width", "min-height", "require-landscape", "skip-dimension-check"],
    "Image filter:",
  )
  .option("w", {
    number: true,
    alias: "min-width",
    description: "Minimum width for an image to be kept",
  })
  .option("h", {
    number: true,
    alias: "min-height",
    description: "Minimum height for an image to be kept",
  })
  .option("l", {
    boolean: true,
    alias: "require-landscape",
    description: "Require images which are wider than they are high",
  })
  .option("skip-dimension-check", {
    boolean: true,
    description: "Do not run checks on the image resolution",
  })

  .group(["config", "ignore-config"], "Configuration:")
  .option("c", {
    string: true,
    alias: "config",
    description: "Specify the location of the config file",
  })
  .option("i", {
    boolean: true,
    alias: "ignore-config",
    description: "Ignore the config at the default location",
  })

  .command(
    "$0",
    "Download the images using the effective config",
    () => {},
    async (argv) => {
      let config = await Config.fromArgv(argv);
      let downloader = new Downloader(config);
      if (!config.quiet) {
        console.log(chalk.green("Starting download"));
      }

      await downloader.download();

      if (!config.quiet) {
        console.log(chalk.green("Download finished"));
      }
    },
  )
  .command(
    "inspect <file>",
    "Get details about a downloaded image",
    () => {},
    async (argv) => {
      const path = require("path");
      const fse = require("fs-extra");
      const { DirectoryIndex } = require("./src/dindex");
      let { file } = argv;

      if (await fse.exists(file)) {
        // Name is actually the id
        let { dir, name } = path.parse(file);
        let dindex = DirectoryIndex.fromFolder(dir);
        await dindex.read();
        if (dindex.exists(name)) {
          let meta = dindex.get(name);
          console.log(chalk.cyan(JSON.stringify(meta, undefined, 2)));
        } else {
          console.log(
            chalk.red(
              `The file ${file} does not seem to be registered in the rwd index`,
            ),
          );
        }
      } else {
        console.log(chalk.red(`The file ${file} does not exist`));
      }
    },
  )
  .command(
    "write-config",
    "Write the effective config into a file and exit",
    () => {},
    async (argv) => {
      let config = await Config.fromArgv(argv);
      config.write();
      if (!config.quiet) {
        console.log(chalk.green("The config has been written successfully"));
      }
    },
  )
  .command(
    "print-config",
    "Print the effective config to the console and exit",
    () => {},
    async (argv) => {
      let config = await Config.fromArgv(argv);
      console.log(chalk.cyan(config.asJSON()));
    },
  )
  .command(
    "find-config",
    "Print the path of the default config and exit",
    () => {},
    () => {
      console.log(
        chalk.cyan(
          "The default configuration file is located at " +
            chalk.bold(Config.defaultPath),
        ),
      );
    },
  ).argv;
