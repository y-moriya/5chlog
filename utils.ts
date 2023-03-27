import { DOMParser, Element } from "./deps.ts";
import { Message } from "./types.ts";

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
    const p = post as Element;
    const name = p.querySelector(".name")!;
    const date = p.querySelector(".date")!;
    const message = p.querySelector(".message")!;
    const escapedSpan = message.querySelector(".escaped")!;

    // Replace <br> tags with \n
    const messageText = escapedSpan.innerHTML.replace(/<br>/g, "\n").trim();

    const mes: Message = {
      "data-userid": p.getAttribute("data-userid")!,
      "data-id": p.getAttribute("data-id")!,
      "name": name.textContent?.trim(),
      "date": date.textContent?.trim(),
      "message": messageText,
    };

    messages.push(mes);
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
 * 5chのスレッドURLにマッチする正規表現
 */
export const THREAD_URL_REGEX =
  /(https:\/\/[^.]+\.5ch\.net\/test\/read\.cgi\/[^\/]+\/\d+\/?)/g;
