import path from "path";
import fse from "fs-extra";
import { IDirectoryIndex, ImageMetaData } from "./types";

/**
 * Index for the downloaded images that stores information like original download url or the permalink to the post for later use
 */
export class DirectoryIndex {
  /**
   * Creates a new DirectoryIndex instance based on the folder where the file should be in
   *
   * @param {string} folder The folder where the index file resides in
   */
  public static fromFolder(folder: string) {
    return new DirectoryIndex(path.join(folder, ".rwd-index.json"));
  }


  private index?: IDirectoryIndex;

  /**
   * Creates an instance of DirectoryIndex.
   */
  constructor(private file: string) {
  }

  /**
   * Tries to read the file from the path. If the file does not exist it initializes the index as empty
   */
  async read(): Promise<void> {
    if (await fse.pathExists(this.file)) {
      this.index = await fse.readJson(this.file, {
        encoding: "utf8",
      });
    } else {
      this.index = {};
    }
  }

  /**
   * Writes the current index to the path. Expects the folder structure to exist already
   */
  async write(): Promise<void> {
    await fse.writeJson(this.file, this.index, {
      encoding: "utf8",
    });
  }

  /**
   * Checks if an index entry exists
   *
   * @param {string} id The id of the entry
   * @returns true if the entry is present
   */
  exists(id: string): boolean {
    if (this.index === undefined) {
      return false;
    }
    return this.index[id] !== undefined;
  }

  /**
   * Gets an entry from the index
   *
   * @param {string} id The id of the entry
   * @returns The entry itself or undefined if it is not present
   */
  get(id: string): ImageMetaData | undefined {
    if (this.index === undefined) {
      return undefined;
    }
    return this.index[id];
  }

  /**
   * Adds a new entry based on the id and entry
   *
   * @param {string} id The id of the entry
   * @param {object} entry The entry itself
   */
  add(id: string, entry: ImageMetaData): void {
    if (this.index !== undefined) {
      this.index[id] = entry;
    }
  }
}