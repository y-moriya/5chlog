import {
addSecToDate,
  createDirectoryIfNotExists,
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

async function main() {
  const args = parse(Deno.args, {
    string: ["v", "t"],
    alias: {
      v: "videoId",
      t: "thread"
    }
  });
  const id = args.videoId as string;
  const url = args.thread as string;

  if (!id) {
    console.error("動画IDを指定してください。");
    Deno.exit(1);
  }
  if (!url) {
    console.error("スレッドURLを指定してください。");
    Deno.exit(1);
  }
  // url ex. https://eagle.5ch.net/test/read.cgi/livejupiter/1679140495/
  if ((url != 'cache') && !url.match(THREAD_URL_REGEX)) {
    console.error("スレッドURLの形式が不正です。");
    Deno.exit(1);
  }

  const videoData = await getVideoData(id);

  if (!videoData) {
    console.error("動画IDが不正です。");
    Deno.exit(1);
  }

  const code = await downloadVideo(id);

  if (code != 0) {
    console.error("動画のダウンロードに失敗しました。");
    Deno.exit(1);
  }

  const fileName = getVideoFileNameWithoutExt(id);

  if (url != 'cache') {
    const dist = `threads/${id}`;
    await createDirectoryIfNotExists(dist);

    // スレッド群を threads ディレクトリにダウンロード
    await downloadThreadsRecursively(url, dist);
  }

  // スレッド群を結合し、merged ディレクトリに出力
  await merge(id);

  // マージされたスレッドを時間でフィルタリング
  const from = new Date(videoData.actualStartTime);
  const to = new Date(videoData.actualEndTime);
  await filter(id, from, to);

  // 結合したスレッドをXMLに変換し、xml ディレクトリに出力
  await xml(id);

  // dist ディレクトリに移動
  Deno.renameSync(`xml/${id}.xml`, `dist/${fileName}.xml`);
}

await main();
