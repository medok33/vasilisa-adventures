type BrowserHistory = Pick<History, "pushState" | "replaceState">;

export function safeReplaceState(history: BrowserHistory, state: unknown, url?: string) {
  try {
    history.replaceState(state, "", url);
    return true;
  } catch {
    return false;
  }
}

export function safePushState(history: BrowserHistory, state: unknown, url: string) {
  try {
    history.pushState(state, "", url);
    return true;
  } catch {
    return false;
  }
}
