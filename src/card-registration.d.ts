// Declaration file for card-registration.ts

// Add window.customCards definition
interface CustomCardInfo {
  type: string;
  name: string;
  description: string;
  preview: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    customCards: CustomCardInfo[];
  }
}