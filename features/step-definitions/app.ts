import { spawn } from 'node:child_process';
import { appendFileSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The Tauri service launches the app once per run, and reloadSession() can't
// relaunch it, because the WebDriver server lives inside the app. A scenario
// that starts the app with a file as its argument launches it again here.
// wdio.conf.ts stops these processes when the run ends.
export const APP_BINARY = './src-tauri/target/debug/shorui';
export const EMBEDDED_PORT = 4445;
export const RELAUNCHED_PIDS = join(tmpdir(), 'shorui-e2e-relaunched.pids');
export const RELAUNCHED_LOG = join(tmpdir(), 'shorui-e2e-relaunched.log');

// How often the waits below re-check their condition.
const POLL_INTERVAL_MS = 100;

async function serverUp(): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${EMBEDDED_PORT}/status`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(condition: () => Promise<boolean>, what: string, timeout = 15_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out after ${timeout} ms waiting for ${what}`);
}

export async function appIsClosed(): Promise<boolean> {
  return !(await serverUp());
}

async function waitForAppToClose(timeout = 5_000) {
  await waitFor(appIsClosed, 'the app to close', timeout);
}

// Starts the app with the arguments a scenario needs and reconnects the
// WebDriver session to it.
export async function launchApp(args: string[] = []) {
  const child = spawn(APP_BINARY, args, {
    env: {
      ...process.env,
      TAURI_WEBDRIVER_PORT: String(EMBEDDED_PORT),
      WDIO_EMBEDDED_SERVER: 'true',
    },
    stdio: ['ignore', openSync(RELAUNCHED_LOG, 'a'), openSync(RELAUNCHED_LOG, 'a')],
    detached: true,
  });
  child.unref();
  appendFileSync(RELAUNCHED_PIDS, `${child.pid}\n`);
  // The service gives a fresh app 60 s on its embedded server, and the first
  // launch of a run is the slowest, so this waits as long.
  await waitFor(serverUp, 'the relaunched app', 60_000);
  await browser.reloadSession();
  await $('main').waitForExist({ timeout: 20_000 });
}

// Closes the app that is open, so the next launch starts from nothing. The
// exit runs from a timer, because the WebDriver call would otherwise wait for
// an app that is going away and time out with it.
export async function closeApp() {
  if (await appIsClosed()) return;
  try {
    await browser.execute(() => {
      setTimeout(() => {
        void (window as unknown as { __TAURI__: { app: { exit: (code: number) => Promise<void> } } })
          .__TAURI__.app.exit(0);
      }, 50);
    });
  } catch {
    // The session went away first, which is fine once the app has closed.
  }
  await waitForAppToClose(15_000);
}
