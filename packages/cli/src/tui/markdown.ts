import { Marked } from "marked";
import { markedTerminal } from "marked-terminal";
// isAppleTerminal check inlined at call time for testability

const marked = new Marked();
marked.use(
  markedTerminal({
    // Terminal width minus paddingX(2*2) + prefix(2) + margin(2) = 8, plus extra 2 for safety
    width: Math.min(process.stdout.columns ?? 80, 100) - 10,
    reflowText: true,
    showSectionPrefix: false,
    tab: 2,
    // cli-table3 defaults table headers to red; disable to inherit parent color
    tableOptions: { style: { head: [] } },
  }) as never,
);

const BOLD_ON = "\x1b[1m";
const BOLD_OFF = "\x1b[22m";

// Sentinel used to protect **text** from being consumed by marked/marked-terminal.
// U+E000 is a Private Use Area codepoint that survives terminal reflow as plain text.
const BOLD_SENTINEL_START = "\u{E000}";
const BOLD_SENTINEL_END = "\u{E001}";

/** Strip ALL ANSI escape sequences from a string. */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

/**
 * Protect `**text**` patterns by replacing them with sentinel-wrapped text
 * before marked parses them. The sentinel characters survive marked and
 * terminal reflow as plain Unicode, then postProcess converts them to ANSI bold.
 */
function protectBold(text: string): string {
  return text.replace(
    /\*\*(.+?)\*\*/g,
    `${BOLD_SENTINEL_START}$1${BOLD_SENTINEL_END}`,
  );
}

const SENTINEL_REGEX = new RegExp(
  `${BOLD_SENTINEL_START}(.+?)${BOLD_SENTINEL_END}`,
  "g",
);

/**
 * Full post-processing for terminals with ANSI support (iTerm2, etc.):
 * 1. Strip \x1b[0m (full reset) that overrides Ink's <Text color>
 * 2. Replace `* ` bullets with `· `
 * 3. Convert bold sentinels to ANSI bold codes
 */
function postProcess(text: string): string {
  return text
    .replace(/\x1b\[0m/g, "")
    .replace(/^(\s*)\* /gm, "$1· ")
    .replace(SENTINEL_REGEX, `${BOLD_ON}$1${BOLD_OFF}`)
    .replace(/\*\*(.+?)\*\*/g, `${BOLD_ON}$1${BOLD_OFF}`);
}

/**
 * Terminal.app post-processing: use marked-terminal for layout (tables,
 * lists, indentation) but strip ALL ANSI codes. Box-drawing characters
 * (┌─┐│└┘) are plain Unicode and survive the strip.
 */
function postProcessPlain(text: string): string {
  return stripAnsi(text)
    .replace(/^(\s*)\* /gm, "$1· ")
    .replace(SENTINEL_REGEX, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1");
}

export function renderMarkdown(text: string): string {
  try {
    const preprocessed = protectBold(text);
    const rendered = marked.parse(preprocessed);
    if (typeof rendered !== "string") {
      return text;
    }
    const trimmed = rendered.replace(/\n+$/, "");
    // Check TERM_PROGRAM at call time (not import time) so tests can override it
    const appleTerminal = process.env.TERM_PROGRAM === "Apple_Terminal";
    return appleTerminal ? postProcessPlain(trimmed) : postProcess(trimmed);
  } catch {
    return text;
  }
}
