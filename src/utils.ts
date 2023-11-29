import { NodeList } from "https://deno.land/x/deno_dom@v0.1.37/deno-dom-wasm.ts";
import config from "../config.ts";
import {
  datetime,
  DOMParser,
  Element,
  join,
  readAll,
  stringify,
} from "../deps.ts";
import { Chat, Message, Thread, VideoData } from "./types.ts";

/**
 * 指定したミリ秒処理をスリープする
 * @param ms ミリ秒
 * @returns msミリ秒経過後に解決されるPromise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 5chのスレッドHTMLから各書き込みをパースして配列にして返却する
 * @param url 対象のスレッドURL
 * @returns Threadオブジェクト
 */
export async function parseThread(url: string): Promise<Thread> {
  const result: Thread = {
    title: "",
    url: url,
    messages: [],
  };
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const html = new TextDecoder("shift-jis").decode(arrayBuffer);
  const doc = new DOMParser().parseFromString(html, "text/html")!;
  const title = doc.querySelector("title")!;
  result.title = title.textContent?.trim() || "";
  const articles = doc.querySelectorAll("article");
  if (articles.length) {
    result.messages = parseThreadHTMLNew(articles);
    console.info(`DL: ${url}, ${result.title}}`);
    return result;
  }
  const posts = doc.querySelectorAll(".post");
  if (posts.length) {
    result.messages = parseThreadHTMLOld(posts);
    console.info(`DL: ${url}, ${result.title}}`);
    return result;
  }

  throw new Error("スレッドのパースに失敗しました。");
}

/**
 * 5chのスレッドHTMLからarticleタグを抽出したものに対し、各書き込みをパースしてMessageの配列にして返却する
 * @param articles articleタグの配列
 * @returns メッセージオブジェクトの配列
 */
export function parseThreadHTMLNew(articles: NodeList): Message[] {
  const messages: Message[] = [];
  for (const article of articles) {
    try {
      const a = article as Element;
      const name = a.querySelector(".postusername")!;
      const date = a.querySelector(".date")!;
      const message = a.querySelector(".post-content")!;
      const messageText = message.innerHTML.replace(/<br>/g, "\n").trim();
      const dateStr = date.textContent?.trim() + "0"; // ptera はミリ秒を3桁で認識するので 0 で埋める
      const dateObj = datetime().parse(dateStr, DATE_STRING_FORMAT, {
        locale: "ja",
      }).toJSDate();
      const mes: Message = {
        "data-userid": a.getAttribute("data-userid")!,
        "data-id": a.getAttribute("data-id")!,
        "name": name.textContent?.trim(),
        "dateStr": dateStr,
        "date": dateObj,
        "time": 0,
        "message": messageText,
      };
      messages.push(mes);
    } catch (error) {
      if (error instanceof RangeError) {
        // 基本的に 1001, 1002 などのレスなのでログ出力は不要
        // console.debug(
        //   "Message skipped caused by RangeError occurred:",
        //   error.message,
        // );
      } else {
        throw error;
      }
    }
  }
  return messages;
}

/**
 * 5chのスレッドHTMLからpostクラスを抽出したものに対し、各書き込みをパースしてMessageの配列にして返却する
 * @param posts postクラスの配列
 * @returns メッセージオブジェクトの配列
 */
export function parseThreadHTMLOld(posts: NodeList): Message[] {
  const messages: Message[] = [];

  for (const post of posts) {
    try {
      const p = post as Element;
      const name = p.querySelector(".name")!;
      const date = p.querySelector(".date")!;
      const message = p.querySelector(".message")!;
      const escapedSpan = message.querySelector(".escaped")!;

      // Replace <br> tags with \n
      const messageText = escapedSpan.innerHTML.replace(/<br>/g, "\n").trim();

      const dateStr = date.textContent?.trim() + "0"; // ptera はミリ秒を3桁で認識するので 0 で埋める
      const dateObj = datetime().parse(dateStr, DATE_STRING_FORMAT, {
        locale: "ja",
      }).toJSDate();

      const mes: Message = {
        "data-userid": p.getAttribute("data-userid")!,
        "data-id": p.getAttribute("data-id")!,
        "name": name.textContent?.trim(),
        "dateStr": dateStr,
        "date": dateObj,
        "time": 0,
        "message": messageText,
      };

      messages.push(mes);
    } catch (error) {
      if (error instanceof RangeError) {
        // 基本的に 1001, 1002 などのレスなのでログ出力は不要
        // console.debug(
        //   "Message skipped caused by RangeError occurred:",
        //   error.message,
        // );
      } else {
        throw error;
      }
    }
  }

  return messages;
}

/**
 * ディレクトリが存在しない場合作成する
 * @param dirPath 対象のディレクトリ
 */
export async function createDirectoryIfNotExists(dirPath: string) {
  try {
    await Deno.stat(dirPath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      await Deno.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

/**
 * ファイルが存在するかどうかを判定する
 * @param filePath 対象のファイルパス
 * @returns ファイルが存在すれば true
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fileInfo = await Deno.stat(filePath);
    return fileInfo.isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw error;
    }
  }
}

/**
 * 指定したディレクトリの json ファイルからデータを全て読み込む
 * @param dirPath 対象のディレクトリ
 * @returns JSON.parse した結果の配列
 */
export async function readJsonFilesInDir(dirPath: string): Promise<Thread[]> {
  const jsonFiles: Thread[] = [];

  for await (const entry of Deno.readDir(dirPath)) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      // continue if file name is merged.json or filtered.json
      if (entry.name === "merged.json" || entry.name === "filtered.json") {
        continue;
      }
      const filePath = join(dirPath, entry.name);
      const jsonContent = await Deno.readTextFile(filePath);
      const jsonData = JSON.parse(jsonContent);
      jsonFiles.push(jsonData);
    }
  }

  return jsonFiles;
}

/**
 * 指定したディレクトリの json ファイルに含まれる message をマージして一つの json に出力する
 * @param videoId 対象のディレクトリ
 */
export async function merge(videoId: string) {
  const dirPath = `threads/${videoId}`;
  const jsonFilesData = await readJsonFilesInDir(dirPath);
  const allMes: Message[] = [];
  for (const thread of jsonFilesData) {
    allMes.push(...thread.messages!);
  }
  await Deno.writeTextFile(
    `threads/${videoId}/merged.json`,
    JSON.stringify(sortAndSanitizeMessages(allMes)),
  );
}

/**
 * @param messages メッセージオブジェクトの配列
 * @returns 日付でソートしてタグを削除したメッセージオブジェクトの配列
 */
export function sortAndSanitizeMessages(messages: Message[]): Message[] {
  if (messages.length === 0) {
    console.info("No messages found.");
    return messages;
  }
  const sortedMessages = messages.sort((a, b) => {
    return new Date(a.date!).getTime() - new Date(b.date!).getTime()!;
  });

  // 最も古い日付のメッセージを起点とする
  const referenceDate = new Date(sortedMessages[0].date!);

  sortedMessages.forEach((message) => {
    // 経過秒数を計算し、timeプロパティに格納
    message.time = new Date(message.date!).getTime() - referenceDate.getTime();
    // タグを削除
    message.message = replaceTags(message.message);
  });

  return sortedMessages;
}

/**
 * メッセージオブジェクトの配列から XML ファイルを出力する
 * @param dir 対象のディレクトリ
 */
export async function xml(dir: string) {
  const json = await Deno.readTextFile(`threads/${dir}/filtered.json`);
  const messages: Message[] = JSON.parse(json);
  const xmlString = convertMessagesToXmlString(messages);

  await Deno.writeTextFile(
    `threads/${dir}/${dir}.xml`,
    xmlString,
  );
}

/**
 * 指定した期間のメッセージを抽出する
 * @param videoId ファイル名
 * @param from 開始日時
 * @param to 終了日時
 */
export async function filter(
  videoId: string,
  from: Date | null,
  to: Date | null,
) {
  const json = await Deno.readTextFile(`threads/${videoId}/merged.json`);
  const allMes: Message[] = JSON.parse(json);
  const filteredMes = filterMessages(allMes, from, to);

  await Deno.writeTextFile(
    `threads/${videoId}/filtered.json`,
    JSON.stringify(filteredMes),
  );
}

export function filterMessages(
  messages: Message[],
  from: Date | null,
  to: Date | null,
): Message[] {
  const start = !from ? new Date(messages[0].date!) : from;
  const end = !to ? new Date(messages[messages.length - 1].date!) : to;

  const filterMessages = messages.filter((mes) => {
    return start <= new Date(mes.date!) && new Date(mes.date!) <= end;
  });
  filterMessages.forEach((mes) => {
    mes.time = (new Date(mes.date!).getTime() - start.getTime()) / 10;
    mes.message = replaceTags(mes.message);
    mes.message = replaceSpan(mes.message);
    mes.message = replaceAnchorLink(mes.message);
  });

  return filterMessages;
}

export function replaceAnchorLink(text: string): string {
  const rawText = text.replace(/<a[^>]*>([^<]*)<\/a>/gi, "$1");
  return rawText.replaceAll("&gt;", ">");
}

export function replaceSpan(text: string): string {
  return text.replace(/<span[^>]*>([^<]*)<\/span>/gi, "$1");
}

export function replaceTags(text: string): string {
  return text.replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * スレッドを前スレ情報を辿りながらそれぞれの書き込みをJSONファイルに出力する
 * @param url 対象のスレッドURL
 * @param dist JSONファイル保存先のパス
 * @param collectedUrls 再起呼び出しに使用する現在保持しているURL群
 * @param downloadFn スレッドをダウンロードし、前スレッドのURLを返却する関数
 * @returns
 */
export async function downloadThreadsRecursively(
  url: string,
  dist: string,
  collectedUrls: Set<string> = new Set(),
  downloadFn: (url: string, dist: string) => Promise<string[]> = downloadThread,
): Promise<Set<string>> {
  if (collectedUrls.has(url)) {
    return collectedUrls;
  }

  collectedUrls.add(url);
  const urls = await downloadFn(url, dist);

  for (const nextUrl of urls) {
    await downloadThreadsRecursively(nextUrl, dist, collectedUrls, downloadFn);
  }

  return collectedUrls;
}

/**
 * 5chのスレッドURLにマッチする正規表現
 */
export const THREAD_URL_REGEX =
  /(https:\/\/[^.]+\.5ch\.net\/test\/read\.cgi\/[^\/]+\/\d+\/?)/g;

// https://bbs.jpnkn.com/test/read.cgi/hllb/1693137341/
export const THREAD_URL_JPNKN_REGEX =
  /https:\/\/bbs\.jpnkn\.com\/test\/read\.cgi\/([^\/]+)\/(\d+)\/?/;

export const DATE_STRING_FORMAT = "YYYY/MM/dd(www) HH:mm:ss.S";

export function convertMessageToXmlChatObj(
  message: Message,
  index: number,
): Chat {
  return {
    "@thread": 0, // 0固定
    "@no": index, // 渡されたindexを入れる
    "@vpos": message.time!, // time を入れる
    "@date": new Date(message.date!).getTime(), // date.getTime()
    "@date_usec": 0, // 0固定
    "@anonimity": 1, // 1固定
    "@user_id": message["data-userid"], // 適当に生成する
    "@mail": 184, // 184固定
    "#text": replaceNewLineWithSpace(
      replaceAllSpacesWithOneSpace(message.message),
    ), // message
  };
}

// function to replace all spaces with 1 space
export function replaceAllSpacesWithOneSpace(text: string): string {
  return text.replace(/\s+/g, " ");
}

// function to replace \n with space
export function replaceNewLineWithSpace(text: string): string {
  return text.replace(/\n/g, " ");
}

/**
 * メッセージ一覧を xml に変換する
 * @param messages メッセージ一覧
 * @returns xml 文字列
 */
export function convertMessagesToXmlString(messages: Message[]): string {
  const chats: Chat[] = [];
  for (let i = 0; i < messages.length; i++) {
    // 長すぎるコメントはスキップ
    if (
      messages[i].message.length > parseInt(config.maxLengthOfComment as string)
    ) {
      continue;
    }
    chats.push(convertMessageToXmlChatObj(messages[i], i + 1));
  }

  return stringify({
    xml: {
      "@version": "1.0",
      "@encoding": "UTF-8",
    },
    packet: {
      chat: chats,
    },
  });
}

/**
 * Youtube Data API を使用して、動画の情報を取得する
 * @param videoId 動画ID
 * @returns 動画データオブジェクト
 */
export async function getVideoData(videoId: string): Promise<VideoData | null> {
  const apiKey = config.youtubeApiKey;
  const url =
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,liveStreamingDetails`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 403) {
      console.error("YouTube Data API のキーが無効です");
      return null;
    }
    console.error(response);
    throw new Error("Network response was not ok");
  }
  const data = await response.json();
  return {
    title: data.items[0].snippet.title,
    id: videoId,
    actualStartTime: data.items[0].liveStreamingDetails.actualStartTime,
    actualEndTime: data.items[0].liveStreamingDetails.actualEndTime,
  };
}

/**
 * yt-dlp を利用して、動画をダウンロードする
 * @param videoId 動画ID
 */
export async function downloadVideo(
  videoId: string,
  dir: string,
): Promise<number> {
  const p = new Deno.Command("yt-dlp", {
    args: [videoId, "-o", `${dir}/${videoId}_%(title)s.%(ext)s`],
    stdin: "piped",
    stdout: "piped",
  }).spawn();

  const { code, stdout } = await p.output();

  console.info(new TextDecoder().decode(stdout));

  return code;
}

/**
 * 指定した動画IDのファイル名を取得する
 * @param videoId
 * @returns ファイル名
 */
export function getVideoFileNameWithoutExt(
  videoId: string,
  dir: string,
): string {
  // find file name
  const files = Deno.readDirSync(dir);
  const fileName = [...files].find((file) => file.name.includes(videoId));
  if (!fileName) {
    throw new Error("file not found");
  }
  return fileName.name.replace(/\.[^/.]+$/, "");
}

/**
 * スレッドのコメントすべてを json ファイルに出力し、前スレ候補のURLの配列を返す
 * @param url 対象のスレッドURL
 * @param dist 保存先のパス
 * @returns 前スレ候補のURLの配列
 */
export async function downloadThread(
  url: string,
  dist: string,
): Promise<string[]> {
  const regex = /\/(\d+)/;
  const match = url.match(regex);
  let path;
  if (match) {
    path = `${dist}/${match[1]}.json`;
  } else {
    console.error("No thread id found");
    Deno.exit(1);
  }

  if (await fileExists(path)) {
    console.info("download thread: skip because File exists");
    return [];
  }

  const thread = await parseThread(url);
  Deno.writeTextFileSync(path, JSON.stringify(thread));
  await sleep(3000);

  return thread.messages![0]?.message.match(THREAD_URL_REGEX) || [];
}

export function getJsUrlFromJpnknUrl(url: string): string {
  const match = url.match(THREAD_URL_JPNKN_REGEX);
  if (!match) {
    throw new Error("url parse error");
  }
  const board = match[1];
  const threadId = match[2];
  return `https://edge.jpnkn.com/p/${board}/${threadId}/js`;
}

export async function downloadThreadJpnkn(
  url: string,
  dist: string,
): Promise<string[]> {
  const regex = /\/(\d+)/;
  const match = url.match(regex);
  let path;
  if (match) {
    path = `${dist}/${match[1]}.json`;
  } else {
    console.error("No thread id found");
    Deno.exit(1);
  }

  if (await fileExists(path)) {
    console.info("download thread: skip because File exists");
    return [];
  }

  console.info(`Jpnknスレッドをダウンロードします: ${url}`);
  const jsUrl = getJsUrlFromJpnknUrl(url);
  const response = await fetch(jsUrl);
  const arrayBuffer = await response.arrayBuffer();
  const text = new TextDecoder("shift-jis").decode(arrayBuffer);
  const match2 = text.match(/var dat = \('(.+)'\)/);
  if (!match2) {
    throw new Error("dat not found");
  }
  const lines = match2[1].split("\\n");
  const match3 = lines[0].match(/<>(.+)$/);
  const title = match3 ? match3[1] : "";
  const thread = {
    title: title,
    url: url,
    messages: lines.map((line, index) => parseLineJpnkn(line, index + 1))
      .filter((message) => message !== null) as Message[],
  };
  Deno.writeTextFileSync(path, JSON.stringify(thread));
  await sleep(3000);

  return thread.messages[0]?.message.match(THREAD_URL_JPNKN_REGEX) || [];
}

export function parseLineJpnkn(
  line: string,
  lineNumber: number,
): Message | null {
  // line ex.)
  // 名無しのホロリス </b>(ﾜｯﾁｮｲW ce8a-uy4e)<b><><>2023/08/27(日) 20:03:58.90 ID:uBTiP4EI<>さんポル<>
  // 名無しのホロリス </b>(ﾜｯﾁｮｲW 6726-44QY)<b><>sage<>2023/08/27(日) 20:04:00.79 ID:Xo7lzOf1<>へい！<>
  const regex = /(.+)<\/b>\((.+)\)<b><>(.*)<>(.*) (ID:[^<]*)<>(.*)/;
  const match = line.match(regex);
  if (!match) {
    // しばしば 4001 などの不要なレスのため、エラーにはしない
    console.error(`line parse error: ${line}`);
    return null;
  }

  const dateStr = match[4] + "0"; // ptera はミリ秒を3桁で認識するので 0 で埋める
  const dateObj = datetime().parse(dateStr, DATE_STRING_FORMAT, {
    locale: "ja",
  }).toJSDate();

  return {
    "data-userid": match[5],
    "data-id": lineNumber.toString(),
    "name": match[1].trim(),
    "dateStr": dateStr,
    "date": dateObj,
    "time": 0,
    "message": convertMessageJpnkn(match[6]),
  };
}

function convertMessageJpnkn(message: string): string {
  return new DOMParser().parseFromString(
    message.replaceAll("<br>", "\n").trim().replace(/<>$/, ""),
    "text/html",
  )!
    .documentElement!.textContent.replaceAll("\\", "");
}

/**
 * ファイルからスレッドのURLを読み込む
 * @param id 動画ID。ファイル名に使用する
 * @returns スレッドURLの配列
 */
export async function readFileToList(id: string): Promise<string[]> {
  const threadListUrlFile = `list/${id}.txt`;
  let file: Deno.FsFile | null = null;
  try {
    // open file
    file = await Deno.open(threadListUrlFile);
    const decoder = new TextDecoder("utf-8");
    const data = await readAll(file);
    const text = decoder.decode(data);
    const split = text.split("\n");
    const filtered = split.filter((url) => url !== "").map((url) => url.trim());
    return filtered;
  } catch (error) {
    throw error instanceof Deno.errors.NotFound
      ? new Error(
        `スレッドURLファイル ${threadListUrlFile} が見つかりませんでした。`,
      )
      : error;
  } finally {
    if (file) {
      file.close();
    }
  }
}

/**
 * 指定したIDのディレクトリを作成し、キャッシュが有効でない場合はスレッドを読み込んでダウンロードします。
 * @param {string} id - ディレクトリ名およびスレッドリストファイル名として使用される識別子。
 * @param {string} thread - ダウンロードするスレッドのURL。空文字列の場合はidからスレッドリストを取得します。
 * @throws {Error} スレッドURLが正規表現にマッチしない場合にエラーをスローします。
 * @returns {Promise<void>}
 */
export async function prepareAndDownloadThreads(
  id: string,
  thread: string,
): Promise<void> {
  await createDirectoryIfNotExists(`threads/${id}`);

  if (thread) {
    await validateAndDownloadThreadRecursively(thread, `threads/${id}`);
    return;
  }

  const threads = await readFileToList(id);
  for (const th of threads) {
    await validateAndDownloadThread(th, `threads/${id}`);
  }
}

export async function validateAndDownloadThread(thread: string, dir: string) {
  if (thread.match(THREAD_URL_REGEX)) {
    await downloadThread(thread, dir);
    return;
  }
  if (thread.match(THREAD_URL_JPNKN_REGEX)) {
    await downloadThreadJpnkn(thread, dir);
    return;
  }

  throw new Error(`スレッドURLが不正です: ${thread}`);
}

export async function validateAndDownloadThreadRecursively(
  thread: string,
  dir: string,
) {
  if (thread.match(THREAD_URL_REGEX)) {
    await downloadThreadsRecursively(thread, dir);
    return;
  }

  if (thread.match(THREAD_URL_JPNKN_REGEX)) {
    await downloadThreadsRecursively(
      thread,
      dir,
      new Set(),
      downloadThreadJpnkn,
    );
    return;
  }

  throw new Error(`スレッドURLが不正です: ${thread}`);
}
