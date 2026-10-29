import { GuestbookClient, GuestbookError } from "../../examples/guestbook-client.mjs";

// Public web-app deployment URL, not a credential. Sheet ID and pepper stay on GAS.
export const guestbookWebAppUrl = "https://script.google.com/macros/s/AKfycbwvhjmzllb34Rlf2tomQwCsO5aDsSssgx0mU1P9cydaTPCfSxEhv8ez23sQUrxrCp17/exec";

export function createGuestbookClient() {
  return new GuestbookClient(guestbookWebAppUrl);
}

export { GuestbookError };
