# md-encrypted-pdf

Turn a Markdown file into a password-protected PDF.

Handy for handing over account details, private notes, or anything else you
need to give someone without leaving it sitting in plain text in an email or a
chat message. You write normal Markdown, and you get back a PDF that asks for a
password before it will open.

Encryption is AES-256.

---

## Step-by-step guide

### Step 1 — Install it

You need Python 3 and [`uv`](https://docs.astral.sh/uv/).

```bash
git clone https://github.com/Drage-Maas-Holdings/md-encrypted-pdf.git
cd md-encrypted-pdf
uv venv .venv
VIRTUAL_ENV=.venv uv pip install -r requirements.txt
```

You only ever do this once.

<details>
<summary>Not using <code>uv</code>?</summary>

Plain `venv` works too, as long as your Python has it (on Debian and Ubuntu
you may need `sudo apt install python3-venv` first):

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```
</details>

### Step 2 — Write your file

Open a text editor, and save a file ending in `.md`. Put it somewhere private —
your home folder is fine. **Don't put it inside this project folder.**

Here is a starting point. Copy it and change the details:

```markdown
# My Accounts

**Confidential.** Save these in a password manager, then delete this file.

## Some Website
- URL: https://example.com/login
- Username: me@example.com
- Password: whatever-the-password-is

## Another Service
- URL: https://example.org
- Username: me@example.org
- Password: another-password
```

Anything Markdown can do works here — headings, **bold**, lists, tables, links,
and `code`. See [`sample.md`](sample.md) for a fuller example.

### Step 3 — Make the PDF

In a terminal:

```bash
cd /path/to/md-encrypted-pdf
.venv/bin/python md_to_encrypted_pdf.py ~/my-accounts.md
```

Change `~/my-accounts.md` to wherever you saved your file.

### Step 4 — Choose a password

You'll be asked for it twice:

```
Password to open the PDF:
Confirm password:
```

**Your typing will not appear on screen.** No dots, no stars, nothing at all.
That is deliberate, not a frozen terminal. Type it and press Enter.

Pick something long. See [Choosing a password](#choosing-a-password) below.

### Step 5 — You're done

```
Wrote /home/you/my-accounts.pdf (44,123 bytes), AES-256 encrypted.
```

The PDF lands next to your Markdown file. Open it and it will ask for the
password first.

### Step 6 — Clean up

Your `.md` file is still plain text that anyone can read. Once the PDF is made,
delete it:

```bash
rm ~/my-accounts.md
```

---

## Sending the PDF to someone

**Send the password separately, through a different channel than the PDF.**

If you email the PDF and then email the password, you have gained nothing — both
are sitting in the same inbox. Email the PDF and phone them the password, or
send it by text message. The two halves must travel apart.

---

## Choosing a password

The encryption is only ever as strong as the password. Anyone holding your PDF
can attack it offline, for as long as they like, without you knowing.

- Use a long passphrase — four or five random words beats a short scramble of
  symbols.
- Don't reuse a password you use anywhere else.
- Don't use anything guessable from knowing you: names, dates, company names.

---

## Options

```
md_to_encrypted_pdf.py INPUT.md [options]

-o, --output PATH     Where to write the PDF (default: next to the input)
    --title TEXT      Title in the PDF properties (default: the filename)
    --subject TEXT    Subject in the PDF properties
    --footer TEXT     Text at the bottom of every page
    --owner-password  Also ask for a separate owner password
    --no-print        Ask readers not to allow printing
-f, --force           Overwrite the PDF if it already exists
    --password-env V  Read the password from environment variable V
    --password-stdin  Read the password from stdin
-h, --help            Full help
```

Example with everything:

```bash
.venv/bin/python md_to_encrypted_pdf.py ~/my-accounts.md \
  -o ~/handover.pdf \
  --title "Account Handover" \
  --footer "Confidential — do not share" \
  --force
```

### Automating it

The password is never accepted as a normal command-line argument, because
command-line arguments are visible to every other user on the machine and get
saved into your shell history. For scripts, use one of these instead:

```bash
# From an environment variable
MD_PDF_PASSWORD='...' .venv/bin/python md_to_encrypted_pdf.py notes.md \
  --password-env MD_PDF_PASSWORD

# From stdin, e.g. piped out of a password manager
pass show some/entry | .venv/bin/python md_to_encrypted_pdf.py notes.md \
  --password-stdin
```

Environment variables are readable from `/proc` by other users on the same
machine, so prefer stdin where you can.

---

## When something goes wrong

| Message | What it means |
| --- | --- |
| `Passwords did not match.` | The two prompts differed. Nothing was written — run it again. |
| `... already exists. Pass --force` | There's a PDF there already. Add `--force` to replace it. |
| `No terminal available to prompt` | You're not in an interactive terminal. Open a real one, or use `--password-env`. |
| `Input file not found` | Check the path to your `.md` file. |
| `Font directory ... not found` | Install the DejaVu fonts (see below). |
| `cryptography module not available` | Re-run the install step. This package is required. |

---

## Notes and limitations

- **Fonts.** Text is rendered with DejaVu, because the PDF built-in fonts can't
  handle characters like em dashes, curly quotes, and bullets that Markdown
  produces. On Debian and Ubuntu: `sudo apt install fonts-dejavu-core
  fonts-dejavu-extra`. Without the `extra` package, italics render upright
  rather than failing. On other systems, point `FONT_DIR` at any Unicode TTF.
- **`--no-print` is a request, not a lock.** PDF permission flags are honoured
  by well-behaved readers and ignored by everything else. Don't rely on it.
- **Owner passwords.** Without `--owner-password`, the password that opens the
  file also carries full owner rights, which makes the permission flags
  advisory only.
- **The PDF is a copy, not a vault.** It doesn't expire and can't be recalled.
  For credentials you actually use day to day, a proper password manager with
  shared vaults is the right tool — this is for one-time handovers.
- **Images and raw HTML** in your Markdown aren't supported. Text formatting,
  lists, tables, and links are.

## Requirements

- Python 3.9+
- `fpdf2`, `markdown`, `cryptography` (see `requirements.txt`)
- DejaVu fonts
