import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    api?: {
      selectFolder: () => Promise<{ folderPath: string } | null>;
      getSavedFolder: () => Promise<string | null>;
      listDailyTasks: () => Promise<{ fileName: string; fullPath: string }[]>;
      listTemplates: () => Promise<{ fileName: string; fullPath: string }[]>;
      readJsonFile: (fullPath: string) => Promise<any | null>;
      writeJsonFile: (fullPath: string, data: unknown) => Promise<boolean>;
    };
  }
}
