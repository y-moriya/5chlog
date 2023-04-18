import { stringify } from "https://deno.land/x/xml/mod.ts";
import { Message } from "./types.ts";
import { parse } from "../deps.ts";

type Chat = {
  "@thread": number;
  "@no": number;
  "@vpos": number;
  "@date": number;
  "@date_usec": number;
  "@anonimity": number;
  "@user_id": string;
  "@mail": number;
  "#text": string;
};

function convertMessageToXmlChatObj(message: Message, index: number): Chat {
  return {
    "@thread": 0, // 0固定
    "@no": index, // 渡されたindexを入れる
    "@vpos": message.time!, // time を入れる
    "@date": new Date(message.date!).getTime(), // date.getTime()
    "@date_usec": 0, // 0固定
    "@anonimity": 1, // 1固定
    "@user_id": message["data-userid"], // 適当に生成する
    "@mail": 184, // 184固定
    "#text": message.message.replaceAll('\n', ' '), // message
  };
}

function convertMessagesToXmlString(messages: Message[]): string {
  const chats: Chat[] = [];
  for (let i = 0; i < messages.length; i++) {
    // 長すぎるコメントはスキップ
    if (messages[i].message.length > 100) {
      continue;
    }
    chats.push(convertMessageToXmlChatObj(messages[i], i + 1));
  }

  return stringify({
    xml: {
      "@version": "1.0",
      "@encoding": "utf-8",
    },
    packet: {
      chat: chats,
    },
  });
}

async function main() {
  const args = parse(Deno.args);
  const title = args._[0] as string;
  if (!title) {
    console.error("合成するスレッド群のディレクトリ名を指定してください。");
    Deno.exit(1);
  }

  const json = await Deno.readTextFile(`filtered/${title}.json`);
  const messages: Message[] = JSON.parse(json);
  const xmlString = convertMessagesToXmlString(messages);

  await Deno.writeTextFile(
    `xml/${title}.xml`,
    xmlString,
  );
}

await main();
