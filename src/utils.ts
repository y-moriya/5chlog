import { datetime, DOMParser, Element, join } from "../deps.ts";
import { downloadThread } from "./downloadThread.ts";
import { Message, Thread } from "./types.ts";

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
  const sortedMessages = allMes.sort((a, b) => {
    return new Date(a.date!).getTime() - new Date(b.date!).getTime()!;
  });

  // 最も古い日付のメッセージを起点とする
  const referenceDate = new Date(sortedMessages[0].date!);

  sortedMessages.forEach((message) => {
    // 経過秒数を計算し、timeプロパティに格納
    message.time =
      (new Date(message.date!).getTime() - referenceDate.getTime()) / 1000;
  });

  Deno.writeTextFileSync(`merged/${dir}.json`, JSON.stringify(sortedMessages));
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
