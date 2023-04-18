import config from "../config.ts";
import { datetime, DOMParser, Element, join, stringify } from "../deps.ts";
import { downloadThread } from "./downloadThread.ts";
import { Chat, Message, Thread } from "./types.ts";

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
 * @param html 5chのスレッドHTML
 * @returns メッセージオブジェクトの配列
 */
export function parseThreadHTML(html: string): Message[] {
  const doc = new DOMParser().parseFromString(html, "text/html")!;
  const posts = doc.querySelectorAll(".post");
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
        console.warn(
          "Message skipped caused by RangeError occurred:",
          error.message,
        );
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
 * @param dir 対象のディレクトリ
 */
export async function merge(dir: string) {
  const dirPath = `threads/${dir}`;
  const jsonFilesData = await readJsonFilesInDir(dirPath);
  const allMes: Message[] = [];
  for (const thread of jsonFilesData) {
    allMes.push(...thread.messages!);
  }
  await Deno.writeTextFile(
    `merged/${dir}.json`,
    JSON.stringify(sortAndSanitizeMessages(allMes)),
  );
}

/**
 * @param messages メッセージオブジェクトの配列
 * @returns 日付でソートしてタグを削除したメッセージオブジェクトの配列
 */
export function sortAndSanitizeMessages(messages: Message[]): Message[] {
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
  const json = await Deno.readTextFile(`filtered/${dir}.json`);
  const messages: Message[] = JSON.parse(json);
  const xmlString = convertMessagesToXmlString(messages);

  await Deno.writeTextFile(
    `xml/${dir}.xml`,
    xmlString,
  );
}

/**
 * 指定した期間のメッセージを抽出する
 * @param title ファイル名
 * @param from 開始日時
 * @param to 終了日時
 */
export async function filter(
  title: string,
  from: Date | null,
  to: Date | null,
) {
  const json = await Deno.readTextFile(`merged/${title}.json`);
  const allMes: Message[] = JSON.parse(json);
  const filteredMes = filterMessages(allMes, from, to);

  await Deno.writeTextFile(
    `filtered/${title}.json`,
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
    "#text": message.message.replaceAll("\n", " "), // message
  };
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
