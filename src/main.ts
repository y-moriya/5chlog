import { createDirectoryIfNotExists, THREAD_URL_REGEX } from "./utils.ts";
import { parse } from "../deps.ts";
import { downloadThread } from "./downloadThread.ts";

/**
 * スレッドを前スレ情報を辿りながらそれぞれの書き込みをJSONファイルに出力する
 * @param url 対象のスレッドURL
 * @param dist JSONファイル保存先のパス
 * @param collectedUrls 再起呼び出しに使用する現在保持しているURL群
 * @returns
 */
async function downloadThreadsRecursively(
  url: string,
  dist: string,
  collectedUrls: Set<string> = new Set(),
): Promise<Set<string>> {
  if (collectedUrls.has(url)) {
    return collectedUrls;
  }

  collectedUrls.add(url);
  const urls = await downloadThread(url, dist);

  for (const nextUrl of urls) {
    await downloadThreadsRecursively(nextUrl, dist, collectedUrls);
  }

  return collectedUrls;
}

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
