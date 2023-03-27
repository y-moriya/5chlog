import {
  createDirectoryIfNotExists,
  downloadThreadsRecursively,
  THREAD_URL_REGEX,
} from "./utils.ts";
import { parse } from "../deps.ts";

async function main() {
  const args = parse(Deno.args);
  const url = args._[0] as string;
  const name = args._[1] as string;
  if (!url) {
    console.error("スレッドURLを指定してください。");
    Deno.exit(1);
  }
  // url ex. https://eagle.5ch.net/test/read.cgi/livejupiter/1679140495/
  if (!url.match(THREAD_URL_REGEX)) {
    console.error("スレッドURLの形式が不正です。");
    Deno.exit(1);
  }
  if (!name) {
    console.error("識別名(ディレクトリ名)を指定してください。");
    Deno.exit(1);
  }

  const dist = `threads/${name}`;
  await createDirectoryIfNotExists(dist);

  await downloadThreadsRecursively(url, dist);
}

await main();
