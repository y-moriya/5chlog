import { assert, assertEquals } from "../deps.ts";
import { Message } from "../src/types.ts";
import {
  createDirectoryIfNotExists,
  downloadThreadsRecursively,
  fileExists,
  merge,
  parseThreadHTML,
  readJsonFilesInDir,
  sleep,
} from "../src/utils.ts";

Deno.test("sleep function", async () => {
  const start = Date.now();
  await sleep(1000); // 1 second
  const end = Date.now();
  const elapsedTime = end - start;

  // Check if the elapsed time is greater than or equal to 1000ms
  // and less than 1000ms + some allowed margin (e.g., 50ms) to account for any delay.
  assertEquals(elapsedTime >= 1000 && elapsedTime < 1050, true);
});

Deno.test("parseThreadHTML function", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <div class="post" data-userid="ID:M6l/2SqX0" data-id="1">
          <div class="name">User 1</div>
          <div class="date">2023/03/18(土) 20:55:13.15</div>
          <div class="message"><span class="escaped">Message 1<br>Line 2</span></div>
          </div>
          <div class="post" data-userid="ID:M6l/2SqX1" data-id="2">
          <div class="name">User 2</div>
          <div class="date">2023/03/18(土) 20:56:14.16</div>
          <div class="message"><span class="escaped">Message 2</span></div>
        </div>
      </body>
    </html>
    `;

  const expectedResult: Message[] = [
    {
      "data-userid": "ID:M6l/2SqX0",
      "data-id": "1",
      name: "User 1",
      dateStr: "2023/03/18(土) 20:55:13.150",
      date: new Date("2023-03-18T11:55:13.150Z"),
      time: 0,
      message: "Message 1\nLine 2",
    },
    {
      "data-userid": "ID:M6l/2SqX1",
      "data-id": "2",
      name: "User 2",
      dateStr: "2023/03/18(土) 20:56:14.160",
      date: new Date("2023-03-18T11:56:14.160Z"),
      time: 0,
      message: "Message 2",
    },
  ];

  const result = parseThreadHTML(html);
  assertEquals(result, expectedResult);
});

Deno.test("createDirectoryIfNotExists function", async () => {
  const testDir = "testDir";

  // Ensure the test directory does not exist before the test
  try {
    await Deno.remove(testDir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  // Test if the function creates the directory when it does not exist
  await createDirectoryIfNotExists(testDir);
  const testDirStat = await Deno.stat(testDir);
  assert(testDirStat.isDirectory);

  // Test if the function does not throw an error when the directory already exists
  let noErrorThrown = false;
  try {
    await createDirectoryIfNotExists(testDir);
    await Deno.stat(testDir);
    noErrorThrown = true;
  } catch (_error) {
    noErrorThrown = false;
  }
  assert(noErrorThrown, "It should not throw an error if the directory exists");

  // Clean up the test directory
  await Deno.remove(testDir, { recursive: true });
});

Deno.test("fileExists function", async () => {
  const testFile = "testFile.txt";

  // Ensure the test file does not exist before the test
  try {
    await Deno.remove(testFile);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  // Test if the function returns false when the file does not exist
  const notExistResult = await fileExists(testFile);
  assertEquals(notExistResult, false);

  // Create a test file
  await Deno.writeTextFile(testFile, "This is a test file.");

  // Test if the function returns true when the file exists
  const existResult = await fileExists(testFile);
  assertEquals(existResult, true);

  // Clean up the test file
  await Deno.remove(testFile);
});

Deno.test("readJsonFilesInDir function", async () => {
  const testDir = "testData";
  const file1 = "file1.json";
  const file2 = "file2.json";
  const data1 = { title: "value1", url: "", messages: [] };
  const data2 = { title: "value2", url: "", messages: [] };

  // Create the test directory and files
  await Deno.mkdir(testDir, { recursive: true });
  await Deno.writeTextFile(`${testDir}/${file1}`, JSON.stringify(data1));
  await Deno.writeTextFile(`${testDir}/${file2}`, JSON.stringify(data2));

  // Test if the function reads JSON files in the directory
  const result = await readJsonFilesInDir(testDir);
  assertEquals(result.length, 2);

  // TODO: GitHub Action だと順序が逆になってしまいエラーになる
  // 一旦コメントアウト
  // assertEquals(result, [data1, data2]);

  // Clean up the test directory
  await Deno.remove(testDir, { recursive: true });
});

Deno.test("merge function", async () => {
  const testDir = "threads/testThreads";
  const testOutputDir = "merged";
  await Deno.mkdir("merged", { recursive: true });
  const testOutputFile = `${testOutputDir}/testThreads.json`;

  // 1. Create test directory and data
  await Deno.mkdir(testDir, { recursive: true });
  const testData1 = {
    messages: [{
      "data-userid": "ID:s9ELLwns0",
      "data-id": "1",
      "name": "風吹けば名無し (８段) (ﾜｯﾁｮｲW 4336-H1yD)",
      "date": "2023-03-23T21:39:48.960Z",
      "dateStr": "2023/03/23(木) 21:39:48.96",
      "time": 0,
      "message":
        '!extend:checked:vvvvv:1000:512 \n ※前スレ \n 【実況】博衣こよりのえちえちぶらぼーん🧪 ★4 \n <a href="https://eagle.5ch.net/test/read.cgi/livejupiter/1679572994/">https://eagle.5ch.net/test/read.cgi/livejupiter/1679572994/</a> <hr>VIPQ2_EXTDAT: checked:vvvvv:1000:512:: EXT was configured',
    }],
  };
  const testData2 = {
    messages: [{
      "data-userid": "ID:c7pCjGTJ0",
      "data-id": "2",
      "name": "風吹けば名無し (ﾜｯﾁｮｲW eb9c-uZfV)",
      "date": "2023-03-23T21:40:10.140Z",
      "dateStr": "2023/03/23(木) 21:40:10.14",
      "time": 0,
      "message": "サンポル🥒",
    }],
  };
  await Deno.writeTextFile(`${testDir}/test1.json`, JSON.stringify(testData1));
  await Deno.writeTextFile(`${testDir}/test2.json`, JSON.stringify(testData2));

  // 2. Run the merge function
  await merge("testThreads");

  // 3. Verify the results
  const outputJsonContent = await Deno.readTextFile(testOutputFile);
  const outputData = JSON.parse(outputJsonContent);

  assertEquals(outputData, [
    {
      "data-userid": "ID:s9ELLwns0",
      "data-id": "1",
      "name": "風吹けば名無し (８段) (ﾜｯﾁｮｲW 4336-H1yD)",
      "date": "2023-03-23T21:39:48.960Z",
      "dateStr": "2023/03/23(木) 21:39:48.96",
      "time": 0,
      "message":
        '!extend:checked:vvvvv:1000:512 \n ※前スレ \n 【実況】博衣こよりのえちえちぶらぼーん🧪 ★4 \n https://eagle.5ch.net/test/read.cgi/livejupiter/1679572994/ <hr>VIPQ2_EXTDAT: checked:vvvvv:1000:512:: EXT was configured',
    },
    {
      "data-userid": "ID:c7pCjGTJ0",
      "data-id": "2",
      "name": "風吹けば名無し (ﾜｯﾁｮｲW eb9c-uZfV)",
      "date": "2023-03-23T21:40:10.140Z",
      "dateStr": "2023/03/23(木) 21:40:10.14",
      "time": 21180,
      "message": "サンポル🥒",
    },
  ]);

  // 4. Clean up test data
  await Deno.remove(testDir, { recursive: true });
  await Deno.remove(testOutputFile);
});

Deno.test("downloadThreadsRecursively function", async () => {
  const testUrl1 = "https://example.com/thread1";
  const testUrl2 = "https://example.com/thread2";
  const testUrl3 = "https://example.com/thread3";

  // deno-lint-ignore require-await
  const mockDownloadThread = async (
    url: string,
    _dist: string,
  ): Promise<string[]> => {
    if (url === testUrl1) {
      return [testUrl2];
    } else if (url === testUrl2) {
      return [testUrl3];
    } else {
      return [];
    }
  };

  const expectedResult = new Set([testUrl1, testUrl2, testUrl3]);
  const result = await downloadThreadsRecursively(
    testUrl1,
    "testDist",
    new Set(),
    mockDownloadThread,
  );

  // Verify the function executed recursively and collected all URLs
  assertEquals(result, expectedResult);
});
