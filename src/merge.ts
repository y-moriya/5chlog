import { parse } from "../deps.ts";
import { merge } from "./utils.ts";

async function main() {
  const args = parse(Deno.args);
  const dir = args._[0] as string;
  if (!dir) {
    console.error("合成するスレッド群のディレクトリ名を指定してください。");
    Deno.exit(1);
  }

  await merge(dir);
}

await main();
