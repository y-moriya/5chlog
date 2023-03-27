import { DOMParser, Element } from "./deps.ts";
import { Message } from "./types.ts";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseThreadHTML(html: string): Message[] {
  const doc = new DOMParser().parseFromString(html, "text/html")!;
  const posts = doc.querySelectorAll(".post");
  const messages: Message[] = [];

  for (const post of posts) {
    const p = post as Element;
    const name = p.querySelector(".name")!;
    const date = p.querySelector(".date")!;
    const message = p.querySelector(".message")!;
    const escapedSpan = message.querySelector(".escaped")!;

    // Replace <br> tags with \n
    const messageText = escapedSpan.innerHTML.replace(/<br>/g, "\n").trim();

    const mes: Message = {
      "data-userid": p.getAttribute("data-userid")!,
      "data-id": p.getAttribute("data-id")!,
      "name": name.textContent?.trim(),
      "date": date.textContent?.trim(),
      "message": messageText,
    };

    messages.push(mes);
  }

  return messages;
}

export async function createDirectoryIfNotExists(dirPath: string) {
  try {
    await Deno.stat(dirPath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      await Deno.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}
