import {
  createDirectoryIfNotExists,
  downloadThread,
  downloadThreadsRecursively,
  downloadVideo,
  filter,
  getVideoData,
  getVideoFileNameWithoutExt,
  merge,
  THREAD_URL_REGEX,
  xml,
} from "./utils.ts";
import { parse } from "../deps.ts";
import { readAll } from "https://deno.land/std@0.191.0/streams/read_all.ts";
import config from "../config.ts";

async function main() {
  const args = parse(Deno.args, {
    default: {
      thread: "",
      output: config.distDir,
    },
    string: ["v", "t", "o", "s", "e"],
    alias: {
      v: "videoId",
      t: "thread",
      o: "output",
      s: "start",
      e: "end",
    },
  });
  const id = args.videoId as string;
  const thread = args.thread as string;
  const output = args.output as string;
  const start = args.start as string;
  const end = args.end as string;

  if (!id) {
    console.error("動画IDを指定してください。");
    Deno.exit(1);
  }
  const threads: string[] = [];
  // url ex. https://eagle.5ch.net/test/read.cgi/livejupiter/1679140495/
  if (!thread.match(THREAD_URL_REGEX)) {
    if (thread == "cache") {
      console.log("キャッシュを利用します。");
    } else {
      let threadListUrlFile;
      // open file
      try {
        if (!thread) {
          threadListUrlFile = `list/${id}.txt`;
        } else {
          threadListUrlFile = thread;
        }
        // read file
        const file = await Deno.open(threadListUrlFile);
        const decoder = new TextDecoder("utf-8");
        const data = await readAll(file);
        const text = decoder.decode(data);
        threads.push(...text.split("\n"));
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          console.error(
            `スレッドURLファイル ${threadListUrlFile} が見つかりませんでした。`,
          );
          Deno.exit(1);
        } else {
          console.error(error);
          Deno.exit(1);
        }
      }
    }
  } else {
    console.error("スレッドURLが不正です。");
    Deno.exit(1);
  }

  const videoData = await getVideoData(id);

  if (!videoData) {
    console.error("動画情報を取得できませんでした。");
    Deno.exit(1);
  }

  // check installed yt-dlp
  const p = new Deno.Command("yt-dlp", {
    args: ["--version"],
    stdin: "null",
    stdout: "null",
  }).spawn();

  const { success } = await p.output();

  let fileName = id;

  if (!success) {
    console.error("yt-dlpがインストールされていません。");
    console.info("動画ダウンロードをスキップします。");
  } else {
    console.info("動画をダウンロードします。時間がかかる場合があります...");
    const code = await downloadVideo(id, output);

    if (code != 0) {
      console.error("動画のダウンロードに失敗しました。");
      Deno.exit(1);
    }

    fileName = getVideoFileNameWithoutExt(id, output);
  }

  if (threads.length > 0) {
    await createDirectoryIfNotExists(`threads/${id}`);
    for (const thread of threads) {
      if (thread.match(THREAD_URL_REGEX)) {
        await downloadThread(thread, `threads/${id}`);
      }
    }
  } else if (thread != "cache") {
    const dist = `threads/${id}`;
    await createDirectoryIfNotExists(dist);

    // スレッド群を threads ディレクトリにダウンロード
    await downloadThreadsRecursively(thread, dist);
  }

  // スレッド群を結合し、merged ディレクトリに出力
  await merge(id);

  // マージされたスレッドを時間でフィルタリング
  const from = new Date(start ? start : videoData.actualStartTime);
  const to = new Date(end ? end : videoData.actualEndTime);
  await filter(id, from, to);

  // 結合したスレッドをXMLに変換し、xml ディレクトリに出力
  await xml(id);

  // dist ディレクトリに移動
  Deno.copyFileSync(`threads/${id}/${id}.xml`, `${output}/${id}.xml`);
  Deno.renameSync(`${output}/${id}.xml`, `${output}/${fileName}.xml`);

  // log complete
  console.log("完了しました。");

  // log output path
  console.log(`出力先: ${output}/${fileName}.xml`);
}

await main();
