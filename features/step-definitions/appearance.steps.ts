import { Given, Then, When } from '@wdio/cucumber-framework';
import { startApp, writeNote } from './app';

const PANEL = '[data-testid="settings-panel"]';
const THEMES = '[role="group"][aria-labelledby="theme-label"]';
const ACCENTS = '[role="group"][aria-labelledby="accent-label"]';

async function openSettings() {
  await $('button[aria-label="Settings"]').click();
  await $(PANEL).waitForDisplayed({ timeout: 5_000 });
}

async function waitFor(check: () => Promise<boolean>, what: string) {
  await browser.waitUntil(check, {
    timeout: 5_000,
    interval: 50,
    timeoutMsg: `The app did not show ${what} within 5 s`,
  });
}

// Resolves a CSS colour expression, such as var(--accent-text), to the rgb()
// string the webview computes for it.
async function resolveColour(expression: string): Promise<string> {
  return browser.execute((value) => {
    const probe = document.createElement('span');
    probe.style.color = value;
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }, expression);
}

// The same, for a background, so a color-mix() expression resolves the way the
// selection's rule does.
async function resolveBackground(expression: string): Promise<string> {
  return browser.execute((value) => {
    const probe = document.createElement('span');
    probe.style.background = value;
    document.body.append(probe);
    const colour = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return colour;
  }, expression);
}

async function styleOf(selector: string, property: string): Promise<string> {
  return browser.execute(
    (sel, prop) => {
      const element = document.querySelector(sel);
      if (!element) throw new Error(`No element for ${sel}`);
      return getComputedStyle(element).getPropertyValue(prop).trim();
    },
    selector,
    property,
  );
}

// A choice is complete once the backend store holds it. A person cannot save
// and restart within the milliseconds a save takes, but a test can.
async function waitUntilSaved(key: 'theme' | 'accent', value: string) {
  await browser.waitUntil(
    async () => {
      const [saved] = (await browser.tauri.execute(
        async ({ core }, k) => {
          const rid = await core.invoke('plugin:store|load', {
            path: 'settings.e2e.json',
            options: { autoSave: false },
          });
          return core.invoke('plugin:store|get', { rid, key: k });
        },
        key,
      )) as [unknown, boolean];
      return saved === value;
    },
    { timeout: 5_000, timeoutMsg: `The ${key} "${value}" was not saved` },
  );
}

// The editor's text, scroll offset and cursor position, so a visit to Settings
// can be checked against what the editor held before it.
type EditorState = {
  text: string;
  scrollTop: number;
  cursorTop: number | null;
  cursorLeft: number | null;
};

let remembered: EditorState | undefined;

function editorState(): Promise<EditorState> {
  return browser.execute(() => {
    const scroller = document.querySelector('.cm-scroller') as HTMLElement;
    const cursor = document.querySelector('.cm-cursor') as HTMLElement | null;
    const scrollerBox = scroller.getBoundingClientRect();
    const cursorBox = cursor?.getBoundingClientRect();
    return {
      text: document.querySelector('.cm-content')?.textContent ?? '',
      scrollTop: scroller.scrollTop,
      cursorTop: cursorBox ? cursorBox.top - scrollerBox.top + scroller.scrollTop : null,
      cursorLeft: cursorBox ? cursorBox.left - scrollerBox.left : null,
    };
  });
}

// The innermost element that holds exactly this text, which is where rich
// mode's syntax highlighting puts a link.
async function elementHolding(text: string): Promise<string | null> {
  return browser.execute((wanted) => {
    const matches = [...document.querySelectorAll('.cm-line *')].filter(
      (element) => element.textContent?.trim() === wanted,
    );
    const element = matches.at(-1);
    if (!element) return null;
    element.setAttribute('data-testid', 'found-text');
    return 'passed';
  }, text);
}

Given('no settings are saved', async () => {
  await browser.tauri.execute(async ({ core }) => {
    const rid = await core.invoke('plugin:store|load', {
      path: 'settings.e2e.json',
      options: { autoSave: false },
    });
    await core.invoke('plugin:store|clear', { rid });
    await core.invoke('plugin:store|save', { rid });
  });
});

Given('the app has just started', async () => {
  await startApp();
});

Given('a markdown file {string} with 200 lines', async (name: string) => {
  const text = Array.from({ length: 200 }, (_, index) => `line ${index + 1}`).join('\n');
  await startApp([writeNote(name, text)]);
});

Given('a markdown file {string} with a link, a blockquote and a heading', async (name: string) => {
  const text = '# Heading\n\n[accent link](https://example.com)\n\n> quoted line\n';
  await startApp([writeNote(name, text)]);
});

Given(
  'a markdown file {string} with a heading, a fenced code block and inline code',
  async (name: string) => {
    const text = '# Heading\n\nBody with `inline_snippet` in it\n\n```\nconst answer = 42;\n```\n';
    await startApp([writeNote(name, text)]);
  },
);

Given('the editor is scrolled to line 150', async () => {
  const scrollTop = await browser.execute(() => {
    const scroller = document.querySelector('.cm-scroller') as HTMLElement;
    const line = document.querySelector('.cm-line') as HTMLElement;
    const lineHeight = line.getBoundingClientRect().height || 24;
    scroller.scrollTop = lineHeight * 149;
    return scroller.scrollTop;
  });
  if (scrollTop <= 0) throw new Error('The editor did not scroll to line 150');
});

Given('the cursor is on line 150', async () => {
  const line = await $(
    '//div[contains(concat(" ", normalize-space(@class), " "), " cm-line ") and normalize-space(.)="line 150"]',
  );
  await line.waitForExist({ timeout: 5_000 });
  await line.click();
  await waitFor(
    () => browser.execute(() => document.querySelector('.cm-cursor') !== null),
    'a caret on line 150',
  );
});

Given('I remember the editor state', async () => {
  remembered = await editorState();
  if (!remembered.cursorTop) throw new Error('The editor has no caret to remember');
});

When('I type {string} at the cursor', async (text: string) => {
  // The driver's own sendKeys reaches CodeMirror's contenteditable only
  // through the element, the way the header scenarios type into it.
  await $('.cm-content').addValue(text);
  await waitFor(
    () => browser.execute((typed) => (document.querySelector('.cm-content')?.textContent ?? '').includes(typed), text),
    `the typed "${text}"`,
  );
});

When('I open Settings', async () => {
  await openSettings();
});

When('I close Settings', async () => {
  await browser.keys('Escape');
});

When('I press Escape', async () => {
  await browser.keys('Escape');
});

When('I press Alt+T', async () => {
  await browser.keys(['Alt', 't']);
});

When('I choose the {string} theme', async (name: string) => {
  if (!(await $(PANEL).isExisting())) await openSettings();
  for (const button of await $$(`${THEMES} button`)) {
    if ((await button.getText()).trim() === name) {
      await button.click();
      await waitUntilSaved('theme', name.toLowerCase());
      return;
    }
  }
  throw new Error(`No theme button named "${name}"`);
});

When('I choose the {string} accent', async (name: string) => {
  if (!(await $(PANEL).isExisting())) await openSettings();
  await $(`${ACCENTS} button[aria-label="${name}"]`).click();
  await waitUntilSaved('accent', name.toLowerCase());
});

When('I choose {string} in Settings', async (name: string) => {
  if (!(await $(PANEL).isExisting())) await openSettings();
  await $(`${ACCENTS} button[aria-label="${name}"]`).click();
  await waitUntilSaved('accent', name.toLowerCase());
});

When('the app restarts', async () => {
  await startApp();
});

Then('the app uses the {string} theme', async (name: string) => {
  await waitFor(
    () => browser.execute((wanted) => document.documentElement.dataset.theme === wanted, name.toLowerCase()),
    `the ${name} theme`,
  );
});

Then('the window background is {string}', async (hex: string) => {
  const background = await styleOf('body', 'background-color');
  const expected = await resolveBackground(hex);
  if (background !== expected) {
    throw new Error(`The window background is ${background}, not ${expected}`);
  }
});

Then('the accent colour is {string}', async (hex: string) => {
  const accent = await browser.execute(() =>
    document.documentElement.style.getPropertyValue('--accent-bg').trim(),
  );
  if (accent !== hex) throw new Error(`The accent colour is ${accent}, not ${hex}`);
});

Then('the theme selector offers {string} with {string} chosen', async (list: string, chosen: string) => {
  const buttons = await browser.execute(
    (selector) =>
      [...document.querySelectorAll(`${selector} button`)].map((button) => [
        button.textContent?.trim(),
        button.getAttribute('aria-pressed'),
      ]),
    THEMES,
  );
  const names = buttons.map(([name]) => name);
  if (names.join(', ') !== list) {
    throw new Error(`The theme selector offers ${names.join(', ')}, not ${list}`);
  }
  const pressed = buttons.filter(([, state]) => state === 'true').map(([name]) => name);
  if (pressed.join(', ') !== chosen) {
    throw new Error(`The theme selector has ${pressed.join(', ')} chosen, not ${chosen}`);
  }
});

Then('the accent swatches are {string} with {string} chosen', async (list: string, chosen: string) => {
  const swatches = await browser.execute(
    (selector) =>
      [...document.querySelectorAll(`${selector} button`)].map((button) => [
        button.getAttribute('aria-label'),
        button.getAttribute('aria-pressed'),
      ]),
    ACCENTS,
  );
  const names = swatches.map(([name]) => name);
  if (names.join(', ') !== list) {
    throw new Error(`The accent swatches are ${names.join(', ')}, not ${list}`);
  }
  const pressed = swatches.filter(([, state]) => state === 'true').map(([name]) => name);
  if (pressed.join(', ') !== chosen) {
    throw new Error(`The accent swatches have ${pressed.join(', ')} chosen, not ${chosen}`);
  }
});

Then('the editor is inert', async () => {
  const inert = await browser.execute(
    () => document.querySelector('[data-testid="editor-area"]')?.hasAttribute('inert') ?? false,
  );
  if (!inert) throw new Error('The editor is not inert while Settings is open');
});

Then('the Settings panel is gone', async () => {
  await browser.waitUntil(async () => !(await $(PANEL).isExisting()), {
    timeout: 5_000,
    interval: 50,
    timeoutMsg: 'The Settings panel was still showing after 5 s',
  });
});

Then('the editor state matches', async () => {
  if (!remembered) throw new Error('No editor state was remembered');
  const now = await editorState();
  if (now.cursorTop === null || now.cursorLeft === null) {
    throw new Error('The editor has no caret after Settings closed');
  }
  if (now.text !== remembered.text) {
    throw new Error(`The editor text changed: ${JSON.stringify(now.text)} instead of ${JSON.stringify(remembered.text)}`);
  }
  if (now.scrollTop !== remembered.scrollTop) {
    throw new Error(`The editor scrolled to ${now.scrollTop}, not ${remembered.scrollTop}`);
  }
  if (now.cursorTop !== remembered.cursorTop || now.cursorLeft !== remembered.cursorLeft) {
    throw new Error(
      `The caret moved to ${now.cursorTop},${now.cursorLeft} from ${remembered.cursorTop},${remembered.cursorLeft}`,
    );
  }
});

Then('the editor no longer contains {string}', async (text: string) => {
  await waitFor(
    () => browser.execute((gone) => !(document.querySelector('.cm-content')?.textContent ?? '').includes(gone), text),
    `a document without "${text}"`,
  );
});

Then('the link uses the accent text colour', async () => {
  await elementHolding('accent link');
  const colour = await styleOf('[data-testid="found-text"]', 'color');
  const accent = await resolveColour('var(--accent-text)');
  if (colour !== accent) throw new Error(`The link is ${colour}, not the accent text colour ${accent}`);
});

Then('the caret uses the accent text colour', async () => {
  // Focusing without clicking keeps the caret where it was, so the lines the
  // checks above measured stay rendered as they were.
  await browser.execute(() => {
    (document.querySelector('.cm-content') as HTMLElement).focus();
  });
  await $('.cm-cursor').waitForExist({ timeout: 5_000 });
  const colour = await styleOf('.cm-cursor', 'border-left-color');
  const accent = await resolveColour('var(--accent-text)');
  if (colour !== accent) throw new Error(`The caret is ${colour}, not the accent text colour ${accent}`);
});

Then('the blockquote bar is {string}', async (hex: string) => {
  const colour = await styleOf('.cm-quote', 'border-left-color');
  const accent = await resolveColour(hex);
  if (colour !== accent) throw new Error(`The blockquote bar is ${colour}, not ${accent}`);
});

Then('the selection uses the accent', async () => {
  await $('.cm-content').click();
  await browser.keys(['Control', 'a']);
  await waitFor(
    () => browser.execute(() => document.querySelector('.cm-selectionBackground') !== null),
    'a selection',
  );
  const colour = await styleOf('.cm-selectionBackground', 'background-color');
  const accent = await resolveBackground('color-mix(in oklab, var(--accent-bg) 30%, transparent)');
  if (colour !== accent) throw new Error(`The selection is ${colour}, not the accent at low opacity ${accent}`);
});

Then('the active mode button is {string}', async (hex: string) => {
  const colour = await styleOf('button[aria-label="Rich"][aria-pressed="true"]', 'background-color');
  const accent = await resolveBackground(hex);
  if (colour !== accent) throw new Error(`The active mode button is ${colour}, not ${accent}`);
});

Then('the heading uses the foreground colour', async () => {
  const colour = await styleOf('.cm-h1', 'color');
  const foreground = await resolveColour('var(--foreground)');
  if (colour !== foreground) throw new Error(`The heading is ${colour}, not the foreground ${foreground}`);
});

Then("the rich editor's font is {string}", async (family: string) => {
  const actual = await styleOf('.cm-rich .cm-scroller', 'font-family');
  if (!firstFamily(actual).startsWith(family)) {
    throw new Error(`The rich editor's font is ${actual}, not ${family}`);
  }
});

Then("the code editor's font is {string}", async (family: string) => {
  const actual = await styleOf('.cm-editor:not(.cm-rich) .cm-scroller', 'font-family');
  if (!firstFamily(actual).startsWith(family)) {
    throw new Error(`The code editor's font is ${actual}, not ${family}`);
  }
});

// The font the webview draws a piece of text in: the computed font of the
// element that directly holds the text, which is the one the glyphs come from.
async function fontOfText(text: string): Promise<string> {
  return browser.execute((wanted) => {
    const walker = document.createTreeWalker(
      document.querySelector('.cm-content') as HTMLElement,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.textContent?.includes(wanted) && node.parentElement) {
        return getComputedStyle(node.parentElement).fontFamily;
      }
    }
    throw new Error(`No text "${wanted}" in the editor`);
  }, text);
}

Then('the fenced code line {string} is in {string}', async (text: string, family: string) => {
  const actual = await fontOfText(text);
  if (!firstFamily(actual).startsWith(family)) {
    throw new Error(`The fenced code line "${text}" is in ${actual}, not ${family}`);
  }
});

Then('the inline code {string} is in {string}', async (text: string, family: string) => {
  const actual = await fontOfText(text);
  if (!firstFamily(actual).startsWith(family)) {
    throw new Error(`The inline code "${text}" is in ${actual}, not ${family}`);
  }
});

function firstFamily(list: string): string {
  return list.replace(/["']/g, '').split(',')[0].trim();
}
