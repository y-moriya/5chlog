import {
  createDirectoryIfNotExists,
  downloadThreadsRecursively,
  filter,
  merge,
  THREAD_URL_REGEX,
  xml,
} from "./utils.ts";
import { parse } from "../deps.ts";

async function main() {
  const args = parse(Deno.args);
  const url = args._[0] as string;
  const name = args._[1] as string;
  const from = new Date(args._[2] as string);
  const to = new Date(args._[3] as string);

  if (!url) {
    console.error("スレッドURLを指定してください。");
    Deno.exit(1);
  }
  // url ex. https://eagle.5ch.net/test/read.cgi/livejupiter/1679140495/
  if ((url != 'cache') && !url.match(THREAD_URL_REGEX)) {
    console.error("スレッドURLの形式が不正です。");
    Deno.exit(1);
  }
  if (!name) {
    console.error("識別名(ディレクトリ名)を指定してください。");
    Deno.exit(1);
  }

  if (url != 'cache') {
    const dist = `threads/${name}`;
    await createDirectoryIfNotExists(dist);

    // スレッド群を threads ディレクトリにダウンロード
    await downloadThreadsRecursively(url, dist);
  }
  // スレッド群を結合し、merged ディレクトリに出力
  await merge(name);

  if (!from || isNaN(from.getTime()) || !to || isNaN(to.getTime())) {
    console.info(
      "抽出開始時刻および抽出終了時刻が指定されていないため、全てのメッセージを出力します。",
    );
    await filter(name, null, null);
  } else {
    await filter(name, from, to);
  }

  // 結合したスレッドをXMLに変換し、xml ディレクトリに出力
  await xml(name);
}

await main();
