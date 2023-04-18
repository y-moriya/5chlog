import { parse } from "../deps.ts";
import { xml } from "./utils.ts";

async function main() {
  const args = parse(Deno.args);
  const title = args._[0] as string;
  if (!title) {
    console.error("合成するスレッド群のディレクトリ名を指定してください。");
    Deno.exit(1);
  }

  await xml(title);
}

await main();
