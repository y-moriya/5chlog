import { DOMParser, Element } from "../deps.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";

const KAKOLOG_BASE_URL = "https://eagle.5ch.net/livejupiter/kako/";

type Thread = {
  threadId: string;
  threadTitle: string;
  resCount: string;
};

export async function downloadKakolog(num: number) {
  const url = `${KAKOLOG_BASE_URL}kako${to4digit(num)}.html`;
  const response = await fetch(url);
  const text = await response.text();
  // parse dom
  const dom = new DOMParser().parseFromString(text, "text/html");
  // get threads
  const threads = dom?.querySelectorAll(
    "body > div.main > p.main_odd,.main_even",
  );
  if (!threads) {
    console.error("no threads found");
    Deno.exit(1);
  }

  const result: Thread[] = [];
  for (const thread of threads) {
    const element = thread as Element;
    const threadId = element.querySelector("a")?.getAttribute("href")?.match(
      /\/(\d+)\//,
    )?.[1]!;
    const threadTitle = element.querySelector("span.title")?.textContent
      ?.trim()!;
    const resCount = element.querySelector("span.lines")?.textContent?.trim()!;
    result.push({ threadId, threadTitle, resCount });
  }

  return result;
}

// function convert number to 4 digit string
function to4digit(num: number): string {
  return num.toString().padStart(4, "0");
}

// function init sqlite3
function initSqlite3(file: string) {
  const db = new DB(file);

  db.query(
    "CREATE TABLE IF NOT EXISTS threads (threadId NUMERIC PRIMARY KEY , threadTitle TEXT, resCount INTEGER, threadUrl TEXT)",
  );
  return db;
}

// function bulk insert thread data to sqlite3
function bulkInsertThread(db: DB, threads: Thread[]): number {
  const beforeRows = db.query("SELECT threadId FROM threads");
  const stmt = db.prepareQuery(
    "INSERT OR IGNORE INTO threads (threadId, threadTitle, resCount, threadUrl) VALUES (?, ?, ?, ?)",
  );
  for (const thread of threads) {
    const url = `https://eagle.5ch.net/livejupiter/${thread.threadId}/`;
    stmt.execute([thread.threadId, thread.threadTitle, thread.resCount, url]);
  }
  const afterRows = db.query("SELECT threadId FROM threads");
  const insertedRows = afterRows.length - beforeRows.length;

  return insertedRows;
}

const db = initSqlite3("kakolog.db");

for (let i = 0; i < 10000; i++) {
  console.log(`download ${i}`);
  const result = await downloadKakolog(i);
  const insertedRows = bulkInsertThread(db, result);
  if (insertedRows === 0) {
    console.log("no more threads");
    break;
  }

  // sleep(1000)
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
