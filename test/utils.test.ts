import { assert, assertEquals } from "../deps.ts";
import { Message } from "../src/types.ts";
import {
  createDirectoryIfNotExists,
  fileExists,
  parseThreadHTML,
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
      date: "2023/03/18(土) 20:55:13.15",
      message: "Message 1\nLine 2",
    },
    {
      "data-userid": "ID:M6l/2SqX1",
      "data-id": "2",
      name: "User 2",
      date: "2023/03/18(土) 20:56:14.16",
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
