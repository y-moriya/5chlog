import { Message, Thread } from "./types.ts";
import { join } from "https://deno.land/std/path/mod.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";

/**
 * 指定したディレクトリの json ファイルからデータを全て読み込みます
 * @param dirPath 対象のディレクトリ
 * @returns JSON.parse した結果の配列
 */
async function readJsonFilesInDir(dirPath: string) {
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

async function main() {
  const args = parse(Deno.args);
  const dir = args._[0] as string;
  if (!dir) {
    console.error("合成するスレッド群のディレクトリ名を指定してください。");
    Deno.exit(1);
  }
  const dirPath = `threads/${dir}`;
  const jsonFilesData = await readJsonFilesInDir(dirPath);
  const allMes: Message[] = [];
  for (const thread of jsonFilesData) {
    allMes.push(...thread.messages!);
  }
  Deno.writeTextFileSync(`merged/${dir}.json`, JSON.stringify(allMes));
}

await main();
