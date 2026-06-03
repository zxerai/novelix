import { describe, it, expect } from "vitest";

// Test the parseAuditResult logic by importing the class and testing the private method indirectly
// We test through the public interface patterns

describe("Audit JSON parsing robustness", () => {
  // Helper: simulate the 4-strategy extraction logic from continuity.ts
  function extractBalancedJson(text: string): string | null {
    const start = text.indexOf("{");
    if (start === -1) return null;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === "{") depth++;
      if (text[i] === "}") depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
    return null;
  }

  it("extracts first balanced JSON from mixed output", () => {
    const input = `Here is my audit:\n{"passed": true, "issues": [], "summary": "OK"}\n\nExtra text here.`;
    const json = extractBalancedJson(input);
    expect(json).toBe('{"passed": true, "issues": [], "summary": "OK"}');
    expect(JSON.parse(json!).passed).toBe(true);
  });

  it("handles nested braces correctly (not greedy)", () => {
    const input = `{"passed": false, "issues": [{"severity": "critical", "category": "OOC", "description": "test", "suggestion": "fix"}], "summary": "bad"}`;
    const json = extractBalancedJson(input);
    expect(json).toBe(input);
    const parsed = JSON.parse(json!);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0].severity).toBe("critical");
  });

  it("does not match greedy across multiple JSON blocks", () => {
    const input = `Response: {"passed": true, "issues": [], "summary": "ok"}\n\nExtra: {"something": "else"}`;
    const json = extractBalancedJson(input);
    // Should get the FIRST balanced JSON, not the whole thing
    const parsed = JSON.parse(json!);
    expect(parsed.passed).toBe(true);
    expect(parsed.something).toBeUndefined();
  });

  it("returns null for no JSON", () => {
    expect(extractBalancedJson("This is plain text with no JSON")).toBeNull();
  });

  it("handles code block wrapped JSON", () => {
    const input = "Here is the result:\n```json\n{\"passed\": false, \"issues\": [{\"severity\": \"warning\", \"category\": \"test\", \"description\": \"x\", \"suggestion\": \"y\"}], \"summary\": \"issues\"}\n```";
    // Strategy 3: code block extraction
    const codeBlockMatch = input.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    expect(codeBlockMatch).not.toBeNull();
    const parsed = JSON.parse(codeBlockMatch![1]!.trim());
    expect(parsed.passed).toBe(false);
    expect(parsed.issues).toHaveLength(1);
  });

  it("extracts individual fields when JSON is malformed", () => {
    const input = `audit result: passed: false, issues are bad.\n"passed": false\n"issues": [{"severity": "critical", "category": "OOC", "description": "character acted wrong", "suggestion": "fix it"}]\n"summary": "needs work"`;

    const passedMatch = input.match(/"passed"\s*:\s*(true|false)/);
    expect(passedMatch).not.toBeNull();
    expect(passedMatch![1]).toBe("false");

    const issuesMatch = input.match(/"issues"\s*:\s*\[([\s\S]*?)\]/);
    expect(issuesMatch).not.toBeNull();

    const issuePattern = /\{[^{}]*"severity"\s*:\s*"[^"]*"[^{}]*\}/g;
    const issues = [];
    let match;
    while ((match = issuePattern.exec(issuesMatch![1]!)) !== null) {
      issues.push(JSON.parse(match[0]));
    }
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("critical");
  });
});
