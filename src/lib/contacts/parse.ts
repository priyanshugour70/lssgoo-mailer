/**
 * Contact parsing shared by the import preview (client) and the bulk-import
 * API (server) so both always agree. Pure — no I/O.
 *
 * Accepts any mix of separators (comma, semicolon, space, tab, newline, pipe),
 * `Name <email>` / `"Name" <email>` / `email (Name)` forms, and CSV with a
 * header row (email, first name, last name, company, notes).
 */

export type ParsedContact = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  notes: string | null;
  /** True when the name was guessed from the address rather than provided. */
  nameGuessed: boolean;
};

export type ParseResult = {
  contacts: ParsedContact[];
  invalid: string[];
  duplicates: number;
  mode: "csv" | "text";
};

export const MAX_IMPORT = 5000;

const EMAIL_CORE = String.raw`[A-Za-z0-9._%+'\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}`;
const EMAIL_EXACT = new RegExp(`^${EMAIL_CORE}$`);
const EMAIL_FIND = new RegExp(EMAIL_CORE, "g");
// Loose "looks like an attempted email" token used to report invalid entries.
const ATTEMPT = /[^\s,;|<>()"]*@[^\s,;|<>()"]*/g;

/** Mailboxes that belong to a team or function, not a person. */
const ROLE_MAILBOXES = new Set([
  "info", "hello", "hi", "contact", "contacts", "sales", "support", "help",
  "admin", "office", "team", "hr", "jobs", "careers", "press", "media",
  "marketing", "billing", "accounts", "finance", "legal", "mail", "email",
  "enquiries", "inquiries", "service", "orders", "noreply", "no-reply",
  "donotreply", "webmaster", "postmaster", "feedback", "partners", "ceo",
]);

export function isValidEmail(value: string) {
  return value.length <= 254 && EMAIL_EXACT.test(value);
}

function titleCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** "john.doe+news@x.com" → { firstName: "John", lastName: "Doe" } */
export function nameFromEmail(email: string) {
  const local = email.split("@")[0]?.split("+")[0] ?? "";
  if (ROLE_MAILBOXES.has(local.toLowerCase())) return null;
  const parts = local
    .split(/[._\-]+/)
    .map((part) => part.replace(/\d+/g, ""))
    .filter((part) => part.length > 0);
  // A lone token ("jsmith", "bob") can't be split reliably, so don't guess.
  if (parts.length < 2) return null;
  // Single-letter parts are initials ("j.smith"): keep as initial.
  const [first, ...rest] = parts;
  return {
    firstName: titleCase(first),
    lastName: rest.map(titleCase).join(" "),
  };
}

function splitName(full: string) {
  const cleaned = full.replace(/["']/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.includes("@")) return null;
  // "Doe, John" is common in address books.
  if (cleaned.includes(",")) {
    const [last, first] = cleaned.split(",").map((part) => part.trim());
    if (first && last) return { firstName: first, lastName: last };
  }
  const [first, ...rest] = cleaned.split(" ");
  return { firstName: first, lastName: rest.join(" ") || null };
}

type Draft = Omit<ParsedContact, "nameGuessed"> & { nameGuessed?: boolean };

function finalize(
  drafts: Draft[],
  invalid: string[],
  mode: ParseResult["mode"],
  options: { guessNames: boolean; company?: string | null },
): ParseResult {
  const byEmail = new Map<string, ParsedContact>();
  let duplicates = 0;
  for (const draft of drafts) {
    const email = draft.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      invalid.push(draft.email);
      continue;
    }
    let { firstName, lastName } = draft;
    let nameGuessed = false;
    if (!firstName && !lastName && options.guessNames) {
      const guess = nameFromEmail(email);
      if (guess) {
        firstName = guess.firstName;
        lastName = guess.lastName;
        nameGuessed = true;
      }
    }
    const next: ParsedContact = {
      email,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
      company: draft.company?.trim() || options.company?.trim() || null,
      notes: draft.notes?.trim() || null,
      nameGuessed,
    };
    const previous = byEmail.get(email);
    if (previous) {
      duplicates += 1;
      // Merge: later rows can fill blanks, and real names beat guessed ones.
      if (!previous.firstName || (previous.nameGuessed && !next.nameGuessed)) {
        previous.firstName = next.firstName ?? previous.firstName;
        previous.lastName = next.lastName ?? previous.lastName;
        previous.nameGuessed = next.nameGuessed && previous.nameGuessed;
      }
      previous.company ??= next.company;
      previous.notes ??= next.notes;
      continue;
    }
    byEmail.set(email, next);
  }
  return { contacts: [...byEmail.values()], invalid, duplicates, mode };
}

/* ───────── CSV ───────── */

function detectDelimiter(line: string) {
  const counts = { ",": 0, ";": 0, "\t": 0 } as Record<string, number>;
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char in counts) counts[char] += 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
}

function parseCsvRows(raw: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (quoted) {
      if (char === '"' && raw[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && raw[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, keyof Omit<ParsedContact, "nameGuessed"> | "name"> = {
  email: "email", "e-mail": "email", "email address": "email", "e-mail address": "email", mail: "email",
  "first name": "firstName", firstname: "firstName", first: "firstName", "given name": "firstName",
  "last name": "lastName", lastname: "lastName", last: "lastName", surname: "lastName", "family name": "lastName",
  name: "name", "full name": "name", fullname: "name",
  company: "company", organization: "company", organisation: "company", "company name": "company", employer: "company",
  notes: "notes", note: "notes", comments: "notes",
};

function tryCsv(raw: string, options: { guessNames: boolean; company?: string | null }) {
  const firstLine = raw.split(/\r?\n/).find((line) => line.trim());
  if (!firstLine) return null;
  const [delimiter, count] = detectDelimiter(firstLine);
  if (!count) return null;
  const rows = parseCsvRows(raw, delimiter);
  const header = rows[0]?.map((cell) => HEADER_ALIASES[cell.trim().toLowerCase()]);
  if (!header || !header.includes("email")) return null;

  const drafts: Draft[] = [];
  for (const row of rows.slice(1)) {
    const draft: Draft = { email: "", firstName: null, lastName: null, company: null, notes: null };
    header.forEach((field, index) => {
      const value = row[index]?.trim();
      if (!field || !value) return;
      if (field === "name") {
        const name = splitName(value);
        if (name) Object.assign(draft, name);
      } else draft[field] = value;
    });
    if (draft.email) drafts.push(draft);
  }
  return finalize(drafts, [], "csv", options);
}

/* ───────── Free text ───────── */

function parseText(raw: string, options: { guessNames: boolean; company?: string | null }) {
  const drafts: Draft[] = [];
  const invalid: string[] = [];

  // 1a) `"Doe, John" <email>`: quoted names may contain commas.
  let remaining = raw.replace(
    /"([^"<>]*)"\s*<\s*([^<>\s]+)\s*>/g,
    (_match, name: string, email: string) => {
      const parsed = splitName(name);
      drafts.push({ email, firstName: parsed?.firstName ?? null, lastName: parsed?.lastName ?? null, company: null, notes: null });
      return " ";
    },
  );

  // 1b) `Name <email>`: the name is whatever precedes the bracket back to the
  //     previous separator.
  remaining = remaining.replace(
    /(?:^|[,;\n\t|])\s*"?([^<>,;\n\t|"@]*?)"?\s*<\s*([^<>\s]+)\s*>/g,
    (_match, name: string, email: string) => {
      const parsed = splitName(name);
      drafts.push({ email, firstName: parsed?.firstName ?? null, lastName: parsed?.lastName ?? null, company: null, notes: null });
      return " ";
    },
  );

  // 2) "email (Name)"
  remaining = remaining.replace(
    new RegExp(`(${EMAIL_CORE})\\s*\\(([^()@]+)\\)`, "g"),
    (_match, email: string, name: string) => {
      const parsed = splitName(name);
      drafts.push({ email, firstName: parsed?.firstName ?? null, lastName: parsed?.lastName ?? null, company: null, notes: null });
      return " ";
    },
  );

  // 3) Everything else: pull out anything that looks like an email, whatever
  //    separates it. Stray `@` tokens that fail validation are reported.
  const found = remaining.match(EMAIL_FIND) ?? [];
  for (const email of found) drafts.push({ email, firstName: null, lastName: null, company: null, notes: null });
  const stripped = remaining.replace(EMAIL_FIND, " ");
  for (const attempt of stripped.match(ATTEMPT) ?? []) {
    if (attempt.replace(/[@.]/g, "").length > 0) invalid.push(attempt);
  }

  return finalize(drafts, invalid, "text", options);
}

export function parseContacts(
  raw: string,
  options: { guessNames?: boolean; company?: string | null } = {},
): ParseResult {
  const resolved = { guessNames: options.guessNames ?? true, company: options.company ?? null };
  const text = raw.replace(/^﻿/, "").slice(0, 2_000_000);
  const csv = tryCsv(text, resolved);
  if (csv) return csv;
  return parseText(text, resolved);
}
