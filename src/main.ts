import {
  downloadVideo,
  filter,
  getVideoData,
  getVideoFileNameWithoutExt,
  merge,
  prepareAndDownloadThreads,
  xml,
} from "./utils.ts";
import { parse } from "../deps.ts";
import config from "../config.ts";

async function main() {
  const args = parse(Deno.args, {
    default: {
      thread: "",
      output: config.distDir,
      cache: false,
    },
    string: ["v", "t", "o", "s", "e", "c"],
    alias: {
      v: "videoId",
      t: "thread",
      o: "output",
      s: "start",
      e: "end",
      c: "cache",
    },
  });
  const id = args.videoId as string;
  const thread = (args.thread as string).trim();
  const output = args.output as string;
  const start = args.start as string;
  const end = args.end as string;
  const cache = args.cache ? true : false;

  if (!id) {
    console.error("動画IDを指定してください。");
    Deno.exit(1);
  }

  // スレッドのダウンロード
  if (cache) {
    console.info("スレッドキャッシュを使用します。");
  } else {
    await prepareAndDownloadThreads(id, thread);
  }

  // 動画情報の取得
  const videoData = await getVideoData(id);

  if (!videoData) {
    console.error("動画情報を取得できませんでした。");
    Deno.exit(1);
  }

  // 動画のダウンロード
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

  // スレッド群を結合し、merged ディレクトリに出力
  await merge(id);

  // マージされたスレッドを時間でフィルタリング
  const from = new Date(start ? start : videoData.actualStartTime);
  const to = new Date(end ? end : videoData.actualEndTime);
  console.log({from});
  console.log({to});
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
