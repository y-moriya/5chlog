import { parse } from "../deps.ts";
import { filter } from "./utils.ts";

async function main() {
  const args = parse(Deno.args);
  const title = args._[0] as string;
  const from = new Date(args._[1] as string);
  const to = new Date(args._[2] as string);

  // deno run -A src/filter.ts test 2023-03-23T10:01:29.980Z 2023-03-23T10:01:54.320Z
  // deno run -A src/filter.ts 4th_fes_DAY1 2023-03-18T09:00:40.620Z 2023-03-18T11:56:19.420Z
  // deno run -A src/filter.ts 4th_fes_DAY2 2023-03-19T09:00:38.770Z 2023-03-19T12:04:34.800Z
  // deno run -A src/filter.ts holo27 2023-03-19T04:00:50.100Z 2023-03-19T05:40:52.800Z

  if (!title) {
    console.error(
      "抽出する合成されたデータの識別子を指定してください。",
    );
    Deno.exit(1);
  }

  if (!from || isNaN(from.getTime())) {
    console.error("抽出開始時刻を指定してください。");
    Deno.exit(1);
  }

  if (!to || isNaN(to.getTime())) {
    console.error("抽出終了時刻を指定してください。");
    Deno.exit(1);
  }

  await filter(title, from, to);
}

await main();
