import '@wdio/tauri-service';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { APP_BINARY, RELAUNCHED_PIDS } from './features/step-definitions/app';

// A run keeps the files its scenarios open under this folder, so a run never
// touches the real ones. onPrepare creates it in the launcher process, and the
// workers and the apps they start inherit SHORUI_E2E_DIR.
let e2eDir: string | undefined;

// Stops the apps that scenarios relaunched.
function stopRelaunchedApps() {
  if (!existsSync(RELAUNCHED_PIDS)) return;
  for (const pid of readFileSync(RELAUNCHED_PIDS, 'utf8').split('\n').filter(Boolean)) {
    try {
      process.kill(Number(pid));
    } catch {
      // Already gone.
    }
  }
  rmSync(RELAUNCHED_PIDS);
}

// The service reads `tauri:options` at runtime. It is absent from the base
// config capability type, so the cast crosses that gap.
const capabilities = [
  {
    browserName: 'tauri',
    'tauri:options': {
      application: APP_BINARY,
    },
  },
] as unknown as WebdriverIO.Capabilities[];

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./features/**/*.feature'],
  maxInstances: 1,
  capabilities,
  services: ['@wdio/tauri-service'],
  framework: 'cucumber',
  cucumberOpts: {
    require: ['./features/step-definitions/*.ts'],
    // A step may wait up to 60 s for a relaunched app, so the timeout covers
    // that and the session that follows it.
    timeout: 90_000,
  },
  reporters: ['spec'],
  logLevel: 'warn',
  onPrepare() {
    stopRelaunchedApps();
    e2eDir = mkdtempSync(join(tmpdir(), 'shorui-e2e-'));
    process.env.SHORUI_E2E_DIR = e2eDir;
  },
  // The apps stop first, so none of them writes into the folder while it goes.
  onComplete() {
    stopRelaunchedApps();
    if (e2eDir) rmSync(e2eDir, { recursive: true, force: true });
  },
};
