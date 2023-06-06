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

export interface Chat {
  "@thread": number;
  "@no": number;
  "@vpos": number;
  "@date": number;
  "@date_usec": number;
  "@anonimity": number;
  "@user_id": string;
  "@mail": number;
  "#text": string;
}

export interface VideoData {
  title: string;
  id: string;
  actualStartTime: string;
  actualEndTime: string;
}
