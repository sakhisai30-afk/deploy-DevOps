import { describe, it, expect } from "vitest";
import { chunkDocument, buildTfIdfIndex, retrieveTopK, hasRelevantMatch } from "./ragCore.js";

const RETURNS_DOC = `Items can be returned within 30 days of delivery for a full refund, provided they are unused and in original packaging.

Sale items are final sale and cannot be returned unless defective.

To start a return, use the "Returns" link in your order history. A prepaid shipping label will be emailed to you.`;

describe("retrieval", () => {
  const chunks = chunkDocument(RETURNS_DOC, "returns-policy.txt");
  const index = buildTfIdfIndex(chunks);

  it("retrieves the correct chunk for a relevant question", () => {
    const results = retrieveTopK("Can I return a sale item?", chunks, index, 3);
    expect(results[0].content).toContain("Sale items are final sale");
  });

  // Regression test for Bug 1: irrelevant queries must not be treated as relevant
  it("does not treat a totally unrelated query as relevant (Bug 1 regression)", () => {
    const results = retrieveTopK("Tell me about banana farming techniques", chunks, index, 3);
    expect(hasRelevantMatch(results)).toBe(false);
  });

  it("still treats a real, on-topic question as relevant", () => {
    const results = retrieveTopK("How many days do I have to return something?", chunks, index, 3);
    expect(hasRelevantMatch(results)).toBe(true);
  });
});

describe("chunking", () => {
  // Regression test for Bug 2: duplicate doc names must not collide
  it("would collide on chunk ids if two docs share a name (documents the known risk)", () => {
    const chunksA = chunkDocument("Para one.\n\nPara two.", "faq.txt");
    const chunksB = chunkDocument("Different para one.\n\nDifferent para two.", "faq.txt");
    const allIds = [...chunksA, ...chunksB].map((c) => c.id);
    const uniqueIds = new Set(allIds);
    // This assertion documents that chunkDocument alone does NOT prevent
    // collisions — the actual fix lives in the UI layer (reject duplicate
    // names before calling chunkDocument). This test guards the assumption.
    expect(uniqueIds.size).toBeLessThan(allIds.length);
  });
});
