import { Given, Then, When } from '@wdio/cucumber-framework';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeApp, launchApp } from './app';

// The files a scenario opens live in the run's temporary folder, which
// wdio.conf.ts creates. The wdio capability lets the app read them.
const folder = () => process.env.SHORUI_E2E_DIR!;

// Closes whatever app is open, then starts a fresh one with the arguments the
// scenario needs. The service started one before the first scenario, so a
// given always closes before it launches.
async function startApp(args: string[] = []) {
  await closeApp();
  await launchApp(args);
  await $('.cm-content').waitForExist({ timeout: 20_000 });
}

function writeNote(name: string, text: string): string {
  mkdirSync(folder(), { recursive: true });
  const path = join(folder(), name);
  writeFileSync(path, text);
  return path;
}

const editorText = () =>
  browser.execute(() => document.querySelector('.cm-content')?.textContent ?? '');

async function waitForEditor(check: (text: string) => boolean, what: string) {
  await browser.waitUntil(async () => check(await editorText()), {
    timeout: 5_000,
    interval: 50,
    timeoutMsg: `The editor did not show ${what} within 5 s`,
  });
}

Given('a markdown file {string}', async (name: string, text: string) => {
  await startApp([writeNote(name, text)]);
});

Then('the header shows {string}', async (name: string) => {
  const label = await $('[data-testid="file-name"]');
  await label.waitForDisplayed({ timeout: 5_000 });
  await browser.waitUntil(async () => (await label.getText()).trim() === name, {
    timeout: 5_000,
    interval: 50,
    timeoutMsg: `The header did not show "${name}" within 5 s`,
  });
});

Then('the editor shows {string}', async (text: string) => {
  await waitForEditor((shown) => shown.includes(text), `"${text}"`);
});

Then('the editor shows exactly {string}', async (text: string) => {
  await waitForEditor((shown) => shown.trim() === text, `exactly "${text}"`);
});

Then('the editor does not show {string}', async (text: string) => {
  await waitForEditor((shown) => !shown.includes(text), `a document without "${text}"`);
});

When('I click the {word} button', async (name: string) => {
  await $(`button[aria-label="${name}"]`).click();
});

When('I press Alt+M', async () => {
  await browser.keys(['Alt', 'm']);
});

When('I select all', async () => {
  await $('.cm-content').click();
  await browser.keys(['Control', 'a']);
});

When('I press Ctrl+B', async () => {
  await browser.keys(['Control', 'b']);
});

When('I press Ctrl+Z', async () => {
  await browser.keys(['Control', 'z']);
});

When('I click the Copy button on the code block', async () => {
  const button = await $('.copy-btn');
  await button.waitForDisplayed({ timeout: 10_000 });
  await button.click();
});

Then('the Copy button reads {string}', async (text: string) => {
  const button = await $('.copy-btn');
  await browser.waitUntil(async () => (await button.getText()).trim() === text, {
    timeout: 5_000,
    interval: 50,
    timeoutMsg: `The Copy button did not read "${text}" within 5 s`,
  });
});
