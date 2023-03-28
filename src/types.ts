export interface Thread {
  title: string;
  url: string;
  messages?: Message[];
}

export interface Message {
  "data-userid": string;
  "data-id": string;
  name: string | null;
  dateStr: string | null;
  date: Date | string | null;
  time?: number;
  message: string;
}
