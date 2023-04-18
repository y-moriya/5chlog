import {
  fileExists,
  parseThreadHTML,
  sleep,
  THREAD_URL_REGEX,
} from "./utils.ts";

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
  const regex = /(\d+)\/?$/;
  const match = url.match(regex);
  let path;
  if (match) {
    path = `${dist}/${match[1]}.json`;
  } else {
    console.error("No thread id found");
    Deno.exit(1);
  }

  if (await fileExists(path)) {
    console.info("skip because File exists");
    return [];
  }

  console.info(`start download ${url}`);
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const html = new TextDecoder("shift-jis").decode(arrayBuffer);
  const thread = {
    title: "",
    url: url,
    messages: parseThreadHTML(html),
  };
  Deno.writeTextFileSync(path, JSON.stringify(thread));
  console.info("end download");
  await sleep(3000);

  return thread.messages[0]?.message.match(THREAD_URL_REGEX) || [];
}
