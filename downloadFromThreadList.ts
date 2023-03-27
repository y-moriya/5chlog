import { createDirectoryIfNotExists, parseThreadHTML, sleep } from "./utils.ts";
import { Thread } from "./types.ts";
import { parse } from "./deps.ts";
import { basename, extname } from "https://deno.land/std/path/mod.ts";

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
    console.log(`start download ${thread.title}`);
    const response = await fetch(thread.url);
    const arrayBuffer = await response.arrayBuffer();
    const html = new TextDecoder("shift-jis").decode(arrayBuffer);
    thread.messages = parseThreadHTML(html);
    const regex = /(\d+)\/?$/;
    const match = thread.url.match(regex);
    if (match) {
      const path = `${dist}/${match[1]}.json`;
      Deno.writeTextFileSync(path, JSON.stringify(thread));
    } else {
      console.log("No thread id found");
      Deno.exit(1);
    }

    console.log("end download");
    await sleep(3000);
  }
}

await main();
