import axios from "axios";
import fs from "fs";

/**
 * Downloads a file from the provided url to the local output path
 *
 * @async
 * @param {string} url the remote url where the file is located
 * @param {object} headers additional headers that should be sent along the request
 * @param {string} outputPath the local file where the response should be written to
 * @returns a promise that will get resolved if the download has been finished
 * @see https://stackoverflow.com/a/61269447 for the "inspiration"
 */
export async function downloadFile(url: string, headers: object, outputPath: string): Promise<void> {
  const writer = fs.createWriteStream(outputPath);

  let response = await axios({
    method: "GET",
    url,
    headers,
    responseType: "stream",
  });

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    let error: Error | null = null;
    writer.on("error", (err: Error) => {
      error = err;
      writer.close();
      reject(err);
    });
    writer.on("close", () => {
      if (!error) {
        resolve();
      }
    });
  });
}
