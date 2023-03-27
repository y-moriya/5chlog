import { assertEquals } from "../deps.ts";
import { downloadThread } from "../src/downloadThread.ts";
import { createDirectoryIfNotExists, fileExists } from "../src/utils.ts";

Deno.test("downloadThread function", async () => {
  const testUrl = "https://example.com/test/thread/123456";
  const testDist = "./test_output";
  createDirectoryIfNotExists(testDist);

  // Remove existing test output file if it exists
  const testOutputPath = `${testDist}/123456.json`;
  if (await fileExists(testOutputPath)) {
    await Deno.remove(testOutputPath);
  }

  // Run downloadThread function
  const prevThreadUrls = await downloadThread(testUrl, testDist);

  // Test that the output file was created
  const outputFileExists = await fileExists(testOutputPath);
  assertEquals(outputFileExists, true, "Output file was not created");

  // Test that the returned previous thread URLs array is correct
  // Replace the following array with the expected previous thread URLs for the test thread
  const expectedPrevThreadUrls: string[] = [];
  assertEquals(
    prevThreadUrls,
    expectedPrevThreadUrls,
    "Returned previous thread URLs array is incorrect",
  );

  // Clean up test output file
  await Deno.remove(testOutputPath);
});
