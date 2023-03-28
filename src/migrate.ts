import { datetime, parse } from "../deps.ts";
import { DATE_STRING_FORMAT, readJsonFilesInDir } from "./utils.ts";

export async function migrate(dir: string) {
  const threads = await readJsonFilesInDir(`threads/${dir}`);
  for (const thread of threads) {
    thread.messages = thread.messages?.filter((m) => m.date !== "Over 1000");
    thread.messages?.forEach((mes) => {
      if (!mes.dateStr) {
        try {
          mes.dateStr = mes.date as string;
          mes.date = datetime().parse(mes.dateStr + "0", DATE_STRING_FORMAT, {
            locale: "ja",
          }).toJSDate();
          mes.time = 0;
        } catch (error) {
          if (error instanceof RangeError) {
            console.warn("RangeError occurred:", error.message);
          } else {
            throw error;
          }
        }
      }
    });
    const regex = /(\d+)\/?$/;
    const match = thread.url.match(regex)!;
    Deno.writeTextFileSync(
      `threads/${dir}/${match[1]}.json`,
      JSON.stringify(thread),
    );
  }
}

async function main() {
  const args = parse(Deno.args);
  const dir = args._[0] as string;
  if (!dir) {
    console.error(
      "データ形式を変換するスレッド群のディレクトリ名を指定してください。",
    );
    Deno.exit(1);
  }

  await migrate(dir);
}

await main();
