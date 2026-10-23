import { Given, Then, When } from '@wdio/cucumber-framework';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { folder, startApp, writeNote } from './app';

async function waitFor(check: () => Promise<boolean>, what: string) {
  await browser.waitUntil(check, {
    timeout: 5_000,
    interval: 50,
    timeoutMsg: `The header did not show ${what} within 5 s`,
  });
}

Given('no file is open', async () => {
  await startApp();
});

Given('a markdown file {string} with CRLF line endings', async (name: string, text: string) => {
  // A Gherkin docstring has no trailing line break, so add one to make a file
  // that really ends the CRLF way.
  const crlf = `${text.split('\n').join('\r\n')}\r\n`;
  await startApp([writeNote(name, crlf)]);
});

Given('a markdown file with a 120-character name', async () => {
  const name = `${'x'.repeat(116)}.md`;
  await startApp([writeNote(name, 'body')]);
});

When('I type {string}', async (text: string) => {
  await $('.cm-content').addValue(text);
});

When('I put the cursor at the end', async () => {
  // CodeMirror's keymap handles a synthetic keydown. A WebDriver click below
  // the last line leaves the cursor where it was, so this is the reliable way
  // to move it to the end of the document.
  await browser.execute(() => {
    const content = document.querySelector('.cm-content');
    content?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
});

When('I press Ctrl+S', async () => {
  await browser.keys(['Control', 's']);
});

Then('the header shows a dot with {string}', async (label: string) => {
  const dot = await $('[data-testid="dirty-dot"]');
  await dot.waitForDisplayed({ timeout: 5_000 });
  await waitFor(async () => (await dot.getAttribute('aria-label')) === label, `a dot labelled "${label}"`);
});

Then('the header shows no unsaved dot', async () => {
  await browser.waitUntil(
    async () => !(await $('[data-testid="dirty-dot"]').isExisting()),
    {
      timeout: 5_000,
      interval: 50,
      timeoutMsg: 'The header still showed an unsaved dot after 5 s',
    },
  );
});

Then('the toast reads {string}', async (text: string) => {
  const toast = await $('[data-testid="toast"]');
  await toast.waitForDisplayed({ timeout: 5_000 });
  await waitFor(async () => (await toast.getText()).trim() === text, `a toast reading "${text}"`);
});

Then(
  'the file {string} on disk holds, with CRLF line endings:',
  async (name: string, text: string) => {
    const expected = text.replace(/\n/g, '\r\n');
    const path = join(folder(), name);
    const end = Date.now() + 5_000;
    let actual = readFileSync(path, 'utf8');
    while (actual !== expected && Date.now() < end) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      actual = readFileSync(path, 'utf8');
    }
    if (actual !== expected) {
      throw new Error(`"${name}" holds ${JSON.stringify(actual)}, not ${JSON.stringify(expected)}`);
    }
  },
);

Given('the window is 640 by 480', async () => {
  await browser.setWindowSize(640, 480);
});

Then('the header controls sit in one row in order', async () => {
  // No local functions in here: WebKit cannot resolve the name helper the
  // step's TypeScript build adds to them.
  const layout = await browser.execute(() => {
    const selectors = {
      header: 'header',
      logo: 'header img',
      newFile: 'button[aria-label="New"]',
      open: 'button[aria-label="Open"]',
      save: 'button[aria-label="Save"]',
      name: '[data-testid="file-name"]',
      rich: 'button[aria-label="Rich"]',
      code: 'button[aria-label="Code"]',
      settings: 'button[aria-label="Settings"]',
    };
    const boxes: Record<string, { left: number; top: number; bottom: number } | null> = {};
    for (const key of Object.keys(selectors)) {
      const element = document.querySelector(selectors[key as keyof typeof selectors]);
      const rect = element?.getBoundingClientRect();
      boxes[key] = rect ? { left: rect.left, top: rect.top, bottom: rect.bottom } : null;
    }
    return boxes;
  });

  if (!layout.header) throw new Error('The header is missing');
  const header = layout.header;
  const controls = [
    layout.logo,
    layout.newFile,
    layout.open,
    layout.save,
    layout.name,
    layout.rich,
    layout.code,
    layout.settings,
  ];
  if (controls.some((control) => control === null)) {
    throw new Error('A header control is missing');
  }

  // One row: every control sits inside the header's box, and the header is
  // no taller than a single row of its tallest control.
  for (const control of controls) {
    if (!control) continue;
    if (control.top < header.top || control.bottom > header.bottom) {
      throw new Error('A header control is outside the header row');
    }
  }
  const height = header.bottom - header.top;
  if (height > 64) throw new Error(`The header is ${height} px tall, which is more than one row`);

  // In order: left to right as the design puts them.
  const lefts = controls.map((control) => control!.left);
  for (let index = 1; index < lefts.length; index++) {
    if (lefts[index] <= lefts[index - 1]) {
      throw new Error(`The header controls are out of order: ${JSON.stringify(lefts)}`);
    }
  }
});

Then('the file name is truncated', async () => {
  await waitFor(async () => {
    const size = await browser.execute(() => {
      const element = document.querySelector('[data-testid="file-name"]')!;
      return { scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
    });
    return size.scrollWidth > size.clientWidth;
  }, 'a truncated file name');
});

Then('the page does not scroll sideways', async () => {
  const size = await browser.execute(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (size.scrollWidth !== size.clientWidth) {
    throw new Error(
      `The page scrolls sideways: ${size.scrollWidth} px of content in ${size.clientWidth} px`,
    );
  }
});

Then('the file name is centred in the window', async () => {
  // The name's centre must sit within 2 px of the window's centre, whichever
  // button shares the right-hand group with Rich and Code.
  await browser.waitUntil(
    async () => {
      const offset = await browser.execute(() => {
        const rect = document.querySelector('[data-testid="file-name"]')!.getBoundingClientRect();
        return Math.abs((rect.left + rect.right) / 2 - document.documentElement.clientWidth / 2);
      });
      return offset <= 2;
    },
    {
      timeout: 5_000,
      interval: 50,
      timeoutMsg: 'The file name was not within 2 px of the window centre after 5 s',
    },
  );
});
