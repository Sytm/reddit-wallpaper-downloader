export enum SortMode {
  HOT = "hot",
  NEW = "new",
  RISING = "rising",
  TOP = "top",
  CONTROVERSIAL = "controversial"
}

export enum Timeframe {
  HOUR = "hour",
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
  ALL = "all"
}

export interface IConfig {
  /**
   * If quiet mode is enabled, we will only print errors
   */
  quiet: boolean;
  /**
   * If silent mode is enabled, we will print nothing
   */
  silent: boolean;
  /**
   * The subreddit to download the images from
   */
  subreddit: string;
  /**
   * Directory where the final downloaded pictures should be stored at
   */
  output: string;
  /**
   * Should the program create a separate subfolder for each subreddit
   */
  "create-subreddit-folder": boolean;
  /**
   * Skip the dimension checks for min width/height completely
   */
  "skip-dimension-check": boolean;
  /**
   * The minimum image width for it to be kept
   */
  "min-width": number;
  /**
   * The minimum image height for it to be kept
   */
  "min-height": number;
  /**
   * If it is set to true, the image is required to be wider than it is high
   */
  "require-landscape": boolean;
  /**
   * The final amount of valid downloaded images
   */
  amount: number;
  /**
   * The sort mode to rank the postings by
   */
  "sort-mode": SortMode;
  /**
   * If the sort mode is set to TOP or CONTROVERSIAL, this setting is used
   */
  timeframe: Timeframe;
  /**
   * If the sort mode is set to HOT, this setting is used.
   * For available regions have a look at this: https://www.reddit.com/dev/api#GET_hot
   */
  region: string;
  /**
   * The UserAgent that should be used for the requests. The version is automatically appended
   */
  "user-agent": string;
  /**
   * File extensions in the URL that should be downloaded. Does not verify the actual content of the file
   */
  extensions: string[];
  /**
   * If set to false, only download urls from i.redd.it or i.imgur.com are allowed
   */
  "allow-external-urls": boolean;
}

export interface ImageMetaData {
  file: string;
  title: string;
  permalink: string;
  url: string;
}

export interface IDirectoryIndex {
  [postId: string]: ImageMetaData;
}