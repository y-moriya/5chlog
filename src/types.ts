export interface Thread {
  title: string;
  url: string;
  messages?: Message[];
}

export interface Message {
  "data-userid": string;
  "data-id": string;
  name: string | null;
  date: string | null;
  message: string;
}
