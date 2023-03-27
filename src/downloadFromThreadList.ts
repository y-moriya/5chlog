import { createDirectoryIfNotExists } from "./utils.ts";
import { Thread } from "./types.ts";
import { parse } from "../deps.ts";
import { basename, extname } from "https://deno.land/std/path/mod.ts";
import { downloadThread } from "./downloadThread.ts";

async function main() {
  const args = parse(Deno.args);
  const filePath = args._[0] as string;
  if (!filePath) {
    console.error("スレッド一覧ファイルのパスを指定してください。");
    Deno.exit(1);
  }

  const fileNameWithExt = basename(filePath);
  const fileExtension = extname(filePath);

  const fileNameWithoutExt = fileNameWithExt.replace(fileExtension, "");
  const dist = `threads/${fileNameWithoutExt}`;
  createDirectoryIfNotExists(dist);

  const decoder = new TextDecoder("UTF-8");
  const file = Deno.readFileSync(filePath);
  const threads: Thread[] = JSON.parse(decoder.decode(file));

  for (const thread of threads) {
    downloadThread(thread.url, dist);
  }
}

await main();
