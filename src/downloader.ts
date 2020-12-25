import { promisify } from "util";
import chalk from "chalk";
import axios from "axios";
import envPaths from "env-paths";
import { imageSize } from "image-size";
import { URL } from "url";

// Filesystem stuff
import path from "path";
import home from "home";
import fse from "fs-extra";

import { DirectoryIndex } from "./directoryindex";
import { downloadFile } from "./helpers";
import { IConfig, RedditListing, RedditPost } from "./types";
import { ISizeCalculationResult } from "image-size/dist/types/interface";

const sizeOf = promisify(imageSize);
const paths = envPaths(require("../package.json").name);

export class Downloader {
  private readonly output: string;
  private readonly headers: object;
  private index?: DirectoryIndex;
  private limit: number = 0;
  private after?: string;

  constructor(private readonly config: IConfig) {

    // Set the output directory using config values and set the according index file
    this.output = home.resolve(this.config.output);

    if (this.config["create-subreddit-folder"]) {
      this.output = path.join(this.output, this.config.subreddit);
    }

    let userAgent = `${config["user-agent"]} v${
      require("../package.json").version
    }`;
    this.headers = {
      "User-Agent": userAgent,
    };
  }

  /**
   * Download the posts using the provided configuration at creation
   *
   * @returns
   */
  async download(): Promise<boolean> {
    if (!(await this.verifySubreddit())) {
      return false;
    }
    await this.prepareOutput();

    let remaining = this.config.amount;
    // If there are still posts remaining to get the required amount, keep going
    while (remaining > 0) {
      // The limit for limit is 100.
      // In the case that there are less useable posts that meet all requirements try to overshoot by 50% of the remaining posts
      this.limit = Math.min(100, Math.ceil(remaining * 1.5));

      // Get all posts and then try to download them all.
      let posts = await this.getPosts();
      let finished = await Promise.all(
        posts.map((post) => {
          return this.downloadPost(post);
        }),
      );
      // Go through every finished download result
      for (let i = 0; i < finished.length; i++) {
        let result = finished[i];
        // Didn't match requirements or could not download, continue
        if (result === false) {
          continue;
        }
        // If there are still posts remaining to get the required amount
        if (remaining > 0) {
          // copy the downloaded files into the final directory and decrement the remainder
          await result(true);
          remaining--;
        } else {
          // Discard the files if we have enough
          await result(false);
        }
      }
    }

    await this.writeIndex();

    return true;
  }

  /**
   * Create the output and temp directories if they do not exist and load DirectoryIndex
   *
   * @memberof Downloader
   */
  async prepareOutput(): Promise<void> {
    this.index = DirectoryIndex.fromFolder(this.output);
    await Promise.all([
      fse.mkdirp(paths.temp),
      fse.mkdirp(this.output),
      this.index.read(),
    ]);
  }

  /**
   * Writes the index of downloaded images into the donwload file
   *
   * @memberof Downloader
   */
  async writeIndex(): Promise<void> {
    try {
      await this.index?.write();
    } catch (e) {
      if (!this.config.silent) {
        console.error(chalk.red(`Could not write index file (${e.message})`));
      }
    }
  }

  /**
   * Check if the subreddit exists or not
   *
   * @returns true if could be found, else false
   * @memberof Downloader
   */
  async verifySubreddit(): Promise<boolean> {
    try {
      await axios({
        method: "GET",
        url: `https://reddit.com/r/${this.config.subreddit}.json`,
        headers: this.headers,
      });
      return true;
    } catch (e) {
      if (!this.config.silent) {
        console.error(
          chalk.red(`The subreddit r/${this.config.subreddit} does not exist`),
        );
      }
      return false;
    }
  }

  async getPosts(): Promise<RedditPost[]> {
    try {
      let response = await axios({
        method: "GET",
        url: this.createPostsUrl(),
        headers: this.headers,
        responseType: "json",
      });
      let listing = response.data;
      this.after = listing.data.after;
      return this.transformListing(listing);
    } catch (e) {
      if (!this.config.silent) {
        console.error(chalk.red(`Could not fetch posts (${e.message})`));
      }
    }
    return [];
  }

  /**
   * Transforms the listing returned by reddit into an array of usable post objects
   *
   * @param {object} listing the listing returned by the reddit api
   * @returns an array of post objects
   * @memberof Downloader
   */
  transformListing(listing: RedditListing): RedditPost[] {
    let posts = listing.data.children;
    return posts.map((element: { data: RedditPost; }) => {
      return element.data;
    });
  }

  /**
   * Creates an url that can be used to fetch the posts from a subreddit, applying the neccessary values from the config
   *
   * @returns An url string to get the posts of a subreddit
   * @memberof Downloader
   */
  createPostsUrl(): string {
    let url = `https://reddit.com/r/${this.config.subreddit}/${this.config["sort-mode"]}.json?raw_json=1&limit=${this.limit}`;
    switch (this.config["sort-mode"]) {
      case "top":
      case "controversial":
        url += `&t=${this.config["timeframe"]}`;
        break;
      case "hot":
        url += `&t=${this.config["region"]}`;
        break;
      default:
        break;
    }
    if (this.after !== undefined) {
      url += `&after=${this.after}`;
    }
    return url;
  }

  /**
   * Tries to downlaod the post, checking against the values in the config if it is valid.
   *
   * @param {object} post The post from the reddit api listing to download
   * @returns true if the download was a success
   * @memberof Downloader
   */
  async downloadPost(post: RedditPost): Promise<false | ((keep: boolean) => void)> {
    let url = new URL(post.url);
    if (!this.checkHost(url)) {
      if (!this.config.quiet) {
        console.log(chalk.magenta("Skipping post from untrusted host"));
      }
      return false;
    }
    if (!this.checkExtension(url)) {
      if (!this.config.quiet) {
        console.log(
          chalk.magenta("Skipping post because the extension is not allowed"),
        );
      }
      return false;
    }
    if (this.isDuplicate(post)) {
      if (!this.config.quiet) {
        console.log(
          chalk.magenta("Skipping post because it has been already downloaded"),
        );
      }
      return false;
    }
    let extension = path.extname(url.pathname);
    let postFileName = post.id + extension;
    let tempFile = path.join(paths.temp, postFileName);

    try {
      await downloadFile(post.url, this.headers, tempFile);
    } catch (e) {
      if (!this.config.silent) {
        console.error(chalk.red(`Could not download post (${e.message})`));
      }
      return false;
    }

    if (!this.config["skip-dimension-check"]) {
      try {
        let dimensions = await sizeOf(tempFile);

        if (dimensions === undefined) {
          if (!this.config.quiet) {
            console.log(
              chalk.magenta(
                "Skipping post because the image dimensions could not be determined"
              )
            );
          }
          await fse.unlink(tempFile);
          return false;
        }

        if (!this.isImageLandscape(dimensions)) {
          if (!this.config.quiet) {
            console.log(
              chalk.magenta(
                "Skipping post because the image is not a landscape picture",
              ),
            );
          }
          await fse.unlink(tempFile);
          return false;
        }
        if (!this.checkImageResolution(dimensions)) {
          if (!this.config.quiet) {
            console.log(chalk.magenta("Skipping low resolution image"));
          }
          await fse.unlink(tempFile);
          return false;
        }
      } catch (e) {
        console.error(
          chalk.red(`Could not check dimensions of image (${e.message})`),
        );
        return false;
      }
    }

    if (!this.config.quiet) {
      console.log(chalk.green(`Successfully downloaded ${postFileName}`));
    }

    let finalPath = path.join(this.output, postFileName);

    return async (keep) => {
      if (keep) {
        await fse.move(tempFile, finalPath);

        this.index?.add(post.id, {
          file: path.basename(finalPath),
          title: post.title,
          url: post.url,
          permalink: `https://reddit.com${post.permalink}`,
        });
      } else {
        await fse.unlink(tempFile);
      }
    };
  }

  /**
   * Check if an url matches one of the defined extensions
   *
   * @param {URL} { pathname } the URL object
   * @returns true if its an image, false otherwise
   * @memberof Downloader
   */
  checkExtension({ pathname }: URL) {
    let length = this.config.extensions.length;
    if (length === 0) {
      return true;
    }
    for (let i = 0; i < length; i++) {
      if (pathname.endsWith(this.config.extensions[i])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if the image is wider than it is high to validate it is a landscape picture
   *
   * @param {object} { width, height } the dimensions of the image
   * @returns true if it is landscape or the config allows portrait images
   * @memberof Downloader
   */
  isImageLandscape({ width, height }: ISizeCalculationResult) {
    if (width === undefined) {
      width = 0;
    }
    if (height === undefined) {
      height = 0;
    }

    return !this.config["require-landscape"] || width > height;
  }

  /**
   * Checks if the dimensions of the image are big enough to statisfy the values provided in the config
   *
   * @param {object} { width, height } the dimensions of the image
   * @returns true if the resolution of the image is big enough
   * @memberof Downloader
   */
  checkImageResolution({ width, height }: ISizeCalculationResult) {
    if (width === undefined) {
      width = 0;
    }
    if (height === undefined) {
      height = 0;
    }

    return (
      width >= this.config["min-width"] && height >= this.config["min-height"]
    );
  }

  /**
   * Checks if the url can be trusted to download the images. By default only urls with the hostname of i.redd.it and i.imgur.com are allowed,
   * but this restriction can be disabled
   *
   * @param {URL} { hostname } the URL object
   * @returns true if the url should be trusted for download or not
   * @memberof Downloader
   */
  checkHost({ hostname }: URL) {
    if (this.config["allow-external-urls"]) {
      return true;
    }
    return hostname === "i.redd.it" || hostname === "i.imgur.com";
  }

  /**
   * Checks the index if an image with that id has already been downloaded
   *
   * @param {object} { id } the post object
   * @returns true if the post has not been downloaded yet
   * @memberof Downloader
   */
  isDuplicate({ id }: RedditPost) {
    return this.index?.exists(id);
  }
}
