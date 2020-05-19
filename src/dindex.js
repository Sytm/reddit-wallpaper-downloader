"use strict";

const path = require("path");
const fse = require("fs-extra");

/**
 * Index for the downloaded images that stores information like original download url or the permalink to the post for later use
 *
 * @class DirectoryIndex
 */
class DirectoryIndex {
  /**
   * Creates an instance of DirectoryIndex.
   * @param {string} file Path to the file to read and write from
   * @memberof DirectoryIndex
   */
  constructor(file) {
    this.file = file;
    this.index = undefined;
  }
  /**
   * Tries to read the file from the path. If the file does not exist it initializes the index as empty
   *
   * @memberof DirectoryIndex
   */
  async read() {
    if (await fse.exists(this.file)) {
      this.index = await fse.readJson(this.file, {
        encoding: "utf8",
      });
    } else {
      this.index = {};
    }
  }
  /**
   * Writes the current index to the path. Expects the folder structure to exist already
   *
   * @memberof DirectoryIndex
   */
  async write() {
    await fse.writeJson(this.file, this.index, {
      encoding: "utf8",
    });
  }
  /**
   * Checks if an index entry exists
   *
   * @param {string} id The id of the entry
   * @returns true if the entry is present
   * @memberof DirectoryIndex
   */
  exists(id) {
    return this.index[id] !== undefined;
  }
  /**
   * Gets an entry from the index
   *
   * @param {string} id The id of the entry
   * @returns The entry itself or undefined if it is not present
   * @memberof DirectoryIndex
   */
  get(id) {
    return this.index[id];
  }
  /**
   * Adds a new entry based on the id and entry
   *
   * @param {string} id The id of the entry
   * @param {object} entry The entry itself
   * @memberof DirectoryIndex
   */
  add(id, entry) {
    this.index[id] = entry;
  }
}
/**
 * Creates a new DirectoryIndex instance based on the folder where the file should be in
 *
 * @param {string} folder The folder where the index file resides in
 */
DirectoryIndex.fromFolder = (folder) => {
  return new DirectoryIndex(path.join(folder, ".rwd-index.json"));
};

module.exports = {
  DirectoryIndex,
};
