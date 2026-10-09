#!/usr/bin/env python3
"""Render a Markdown file to a password-encrypted PDF.

The password is never taken as a command-line argument: anything passed on the
command line is visible to other users via `ps` and lands in your shell history.
It is read from an interactive prompt, from an environment variable, or from
stdin instead.

Usage:
    md_to_encrypted_pdf.py logins.md
    md_to_encrypted_pdf.py logins.md -o handover.pdf --title "Team Accounts"
    MD_PDF_PASSWORD=... md_to_encrypted_pdf.py logins.md --password-env
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys
from pathlib import Path

import markdown
from fpdf import FPDF
from fpdf.enums import AccessPermission, EncryptionMethod
from fpdf.fonts import TextStyle

# DejaVu ships with most Linux distributions and covers the punctuation
# Markdown tends to produce (em dashes, curly quotes, bullets) that the PDF
# core fonts cannot encode.
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")

FONT_FACES = {
    "DejaVu": {
        "": "DejaVuSans.ttf",
        "B": "DejaVuSans-Bold.ttf",
        "I": "DejaVuSans-Oblique.ttf",
        "BI": "DejaVuSans-BoldOblique.ttf",
    },
    "DejaVuMono": {
        "": "DejaVuSansMono.ttf",
        "B": "DejaVuSansMono-Bold.ttf",
        "I": "DejaVuSansMono-Oblique.ttf",
        "BI": "DejaVuSansMono-BoldOblique.ttf",
    },
}

MARKDOWN_EXTENSIONS = ["extra", "sane_lists", "admonition"]


class Document(FPDF):
    """A PDF with a running footer, so a printed copy stays in order."""

    def __init__(self, title: str, footer_note: str | None) -> None:
        super().__init__(format="A4", unit="mm")
        self.doc_title = title
        self.footer_note = footer_note
        self.set_margins(20, 18, 20)
        self.set_auto_page_break(auto=True, margin=20)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("DejaVu", size=8)
        self.set_text_color(120, 120, 120)
        left = self.footer_note or ""
        self.cell(0, 8, left, align="L")
        self.set_x(self.l_margin)
        self.cell(0, 8, f"Page {self.page_no()} of {{nb}}", align="R")
        self.set_text_color(0, 0, 0)


def register_fonts(pdf: FPDF) -> None:
    """Register the Unicode faces, falling back when a style is not installed."""
    missing_dir = not FONT_DIR.is_dir()
    if missing_dir:
        raise SystemExit(
            f"Font directory {FONT_DIR} not found. Install the DejaVu fonts "
            "(Debian/Ubuntu: apt install fonts-dejavu-core fonts-dejavu-extra), "
            "or edit FONT_DIR to point at a Unicode TTF you have."
        )

    for family, styles in FONT_FACES.items():
        regular = FONT_DIR / styles[""]
        if not regular.is_file():
            raise SystemExit(f"Required font file not found: {regular}")
        for style, filename in styles.items():
            path = FONT_DIR / filename
            # fonts-dejavu-extra is often absent, which costs us the oblique
            # faces. Substituting the upright file keeps italic text readable
            # rather than aborting the render.
            pdf.add_font(family, style, str(path if path.is_file() else regular))


def read_password(args: argparse.Namespace) -> str:
    if args.password_env:
        password = os.environ.get(args.password_env)
        if not password:
            raise SystemExit(f"Environment variable {args.password_env} is empty or unset.")
        return password

    if args.password_stdin:
        password = sys.stdin.readline().rstrip("\n")
        if not password:
            raise SystemExit("No password received on stdin.")
        return password

    if not sys.stdin.isatty():
        raise SystemExit(
            "No terminal available to prompt for a password. "
            "Use --password-env VAR or --password-stdin."
        )

    password = getpass.getpass("Password to open the PDF: ")
    if not password:
        raise SystemExit("Password must not be empty.")
    if password != getpass.getpass("Confirm password: "):
        raise SystemExit("Passwords did not match.")
    return password


def build_pdf(
    html: str,
    title: str,
    footer_note: str | None,
    subject: str | None,
) -> Document:
    pdf = Document(title=title, footer_note=footer_note)
    register_fonts(pdf)

    pdf.set_title(title)
    if subject:
        pdf.set_subject(subject)
    # The producer/creator strings are readable without the password, so keep
    # them free of anything sensitive.
    pdf.set_creator("md_to_encrypted_pdf.py")

    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_font("DejaVu", size=11)
    pdf.write_html(
        html,
        # write_html's default bullet colour is a loud red (190, 0, 0) and its
        # default bullet is a large disc sitting on the baseline, which looks
        # cramped. A neutral grey plus a little space below each item renders
        # a normal-looking list.
        li_prefix_color=(90, 90, 90),
        tag_styles={
            "a": TextStyle(color=(0, 102, 204), underline=True),
            "li": TextStyle(b_margin=1.2),
            # write_html defaults to the core fonts for <code>/<pre>, which
            # cannot encode the punctuation Markdown produces.
            "code": TextStyle(font_family="DejaVuMono"),
            "pre": TextStyle(font_family="DejaVuMono"),
        },
    )
    return pdf


def encrypt(pdf: Document, user_password: str, owner_password: str | None, allow_print: bool) -> None:
    permissions = AccessPermission.all() if allow_print else (
        AccessPermission.all() & ~AccessPermission.PRINT_LOW_RES & ~AccessPermission.PRINT_HIGH_RES
    )
    pdf.set_encryption(
        # Without a distinct owner password the user password also grants full
        # owner rights, and the permission flags below become advisory only.
        owner_password=owner_password or user_password,
        user_password=user_password,
        permissions=permissions,
        encryption_method=EncryptionMethod.AES_256,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Render a Markdown file to a password-encrypted PDF.",
        epilog="The password is never read from a command-line argument.",
    )
    parser.add_argument("input", type=Path, help="Markdown file to render.")
    parser.add_argument(
        "-o", "--output", type=Path,
        help="Output PDF path (default: alongside the input, with a .pdf suffix).",
    )
    parser.add_argument("--title", help="PDF title (default: the input file's stem).")
    parser.add_argument("--subject", help="Optional PDF subject metadata.")
    parser.add_argument("--footer", help="Text shown in the footer of every page.")
    parser.add_argument(
        "--owner-password", action="store_true",
        help="Also prompt for a separate owner password, so permissions are enforced.",
    )
    parser.add_argument(
        "--no-print", action="store_true",
        help="Disallow printing. Advisory only — readers may ignore it.",
    )
    parser.add_argument(
        "--password-env", metavar="VAR",
        help="Read the password from this environment variable instead of prompting.",
    )
    parser.add_argument(
        "--password-stdin", action="store_true",
        help="Read the password from the first line of stdin instead of prompting.",
    )
    parser.add_argument(
        "-f", "--force", action="store_true",
        help="Overwrite the output file if it already exists.",
    )
    args = parser.parse_args()

    if not args.input.is_file():
        raise SystemExit(f"Input file not found: {args.input}")

    output = args.output or args.input.with_suffix(".pdf")
    if output.exists() and not args.force:
        raise SystemExit(f"{output} already exists. Pass --force to overwrite it.")

    title = args.title or args.input.stem

    user_password = read_password(args)
    owner_password = None
    if args.owner_password:
        if args.password_env or args.password_stdin:
            raise SystemExit(
                "--owner-password needs an interactive prompt; it cannot be combined "
                "with --password-env or --password-stdin."
            )
        owner_password = getpass.getpass("Owner password (for permissions): ")
        if not owner_password:
            raise SystemExit("Owner password must not be empty.")

    text = args.input.read_text(encoding="utf-8")
    html = markdown.markdown(text, extensions=MARKDOWN_EXTENSIONS)

    pdf = build_pdf(html, title=title, footer_note=args.footer, subject=args.subject)
    encrypt(pdf, user_password, owner_password, allow_print=not args.no_print)

    pdf.output(str(output))
    # A credentials PDF should not be world-readable on a shared machine.
    output.chmod(0o600)

    print(f"Wrote {output} ({output.stat().st_size:,} bytes), AES-256 encrypted.")


if __name__ == "__main__":
    main()
