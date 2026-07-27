

import React, { useState, useMemo } from "react";
import {
  chunkDocument,
  buildTfIdfIndex,
  retrieveTopK,
  hasRelevantMatch,
} from "./ragCore.js";

// ---------- LOGGING ----------

function log(level, event, fields = {}) {
  const entry = { level, event, timestamp: new Date().toISOString(), ...fields };
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  console[method](JSON.stringify(entry));
}

const logger = {
  debug: (event, fields) => log("debug", event, fields),
  info: (event, fields) => log("info", event, fields),
  warn: (event, fields) => log("warn", event, fields),
  error: (event, fields) => log("error", event, fields),
};

function newRequestId() {
  return Math.random().toString(36).slice(2, 10);
}

// ---------- ANSWER: call the model with retrieved context only ----------

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function answerFromContext(query, retrievedChunks, requestId) {
  const context = retrievedChunks
    .map((c, i) => `[${i + 1}] (${c.docName}) ${c.content}`)
    .join("\n\n");

  const systemPrompt = `You answer ONLY using the provided context. If the context does not contain the answer, say "I don't have enough information in the provided documents to answer that." Cite sources inline like [1], [2] matching the numbered context blocks. Do not use outside knowledge.`;

  const startedAt = Date.now();
  logger.info("generation_start", { requestId, contextChunks: retrievedChunks.length });

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: `Context:\n\n${context}\n\nQuestion: ${query}` }],
      }),
    });
  } catch (networkErr) {
    logger.error("generation_network_error", { requestId, message: networkErr.message });
    throw networkErr;
  }

  if (!response.ok) {
    logger.error("generation_bad_status", { requestId, status: response.status });
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((block) => block.type === "text");

  if (!textBlock || !textBlock.text.trim()) {
    logger.error("generation_empty_response", { requestId, durationMs: Date.now() - startedAt });
    throw new Error("EMPTY_RESPONSE");
  }

  logger.info("generation_complete", {
    requestId,
    durationMs: Date.now() - startedAt,
    answerChars: textBlock.text.length,
  });

  return textBlock.text;
}

// ---------- Sample docs ----------

const SAMPLE_DOCS = [
  {
    name: "shipping-policy.txt",
    text: `Standard shipping takes 5-7 business days and costs $4.99. Orders over $50 ship free.

Express shipping takes 1-2 business days and costs $14.99. It is available for most US addresses except PO boxes.

International shipping is available to Canada and the UK only, and takes 10-14 business days.`,
  },
  {
    name: "returns-policy.txt",
    text: `Items can be returned within 30 days of delivery for a full refund, provided they are unused and in original packaging.

Sale items are final sale and cannot be returned unless defective.

To start a return, use the "Returns" link in your order history. A prepaid shipping label will be emailed to you.`,
  },
];

// ---------- UI ----------

function MinimalRAG() {
  const [docs, setDocs] = useState(SAMPLE_DOCS);
  const [newDocText, setNewDocText] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [docError, setDocError] = useState("");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState(null);

  const chunks = useMemo(() => docs.flatMap((d) => chunkDocument(d.text, d.name)), [docs]);
  const index = useMemo(() => buildTfIdfIndex(chunks), [chunks]);

  const handleAddDoc = () => {
    if (!newDocText.trim() || !newDocName.trim()) return;
    const nameExists = docs.some((d) => d.name === newDocName.trim());
    if (nameExists) {
      setDocError(`A document named "${newDocName.trim()}" already exists.`);
      return;
    }
    setDocError("");
    setDocs((prev) => [...prev, { name: newDocName.trim(), text: newDocText }]);
    setNewDocName("");
    setNewDocText("");
  };

  const handleRemoveDoc = (name) => {
    setDocs((prev) => prev.filter((d) => d.name !== name));
  };

  const handleAsk = async () => {
    setErrorMessage("");
    setResult(null);

    if (query.trim() === "") {
      setErrorMessage("Enter a question first.");
      return;
    }
    if (chunks.length === 0) {
      setErrorMessage("Add at least one document before asking.");
      return;
    }

    const requestId = newRequestId();
    logger.info("ask_start", { requestId, query, docCount: docs.length });

    setIsLoading(true);
    try {
      const retrieved = retrieveTopK(query, chunks, index, 3);

      if (!hasRelevantMatch(retrieved)) {
        logger.warn("no_relevant_match", { requestId, query, topScore: retrieved[0]?.score ?? 0 });
        setResult({
          retrieved: [],
          answer: "I don't have enough information in the provided documents to answer that.",
        });
        return;
      }

      const answer = await answerFromContext(query, retrieved, requestId);
      setResult({ retrieved, answer });
      logger.info("ask_success", { requestId });
    } catch (err) {
      logger.error("ask_failed", { requestId, message: err.message });
      setErrorMessage("Something went wrong generating the answer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-mono">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <header className="mb-8 border-b border-stone-300 pb-4">
         <h1 className="text-xl font-bold tracking-tight">⚠️ THIS IS A BROKEN TEST UPDATE ⚠️</h1>

          <p className="text-sm text-stone-500 mt-1">
            embed (tf-idf) → retrieve (cosine similarity) → answer (grounded in context only)
          </p>
        </header>

        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-stone-500 mb-2">
            Documents ({docs.length}, {chunks.length} chunks)
          </h2>
          <ul className="space-y-1 mb-3">
            {docs.map((d) => (
              <li key={d.name} className="flex items-center justify-between bg-white border border-stone-200 rounded px-3 py-2 text-sm">
                <span>{d.name}</span>
                <button onClick={() => handleRemoveDoc(d.name)} className="text-stone-400 hover:text-red-600 text-xs">
                  remove
                </button>
              </li>
            ))}
          </ul>

          <div className="bg-white border border-stone-200 rounded p-3 space-y-2">
            <input
              type="text"
              placeholder="doc name, e.g. faq.txt"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              className="w-full border border-stone-300 rounded px-2 py-1 text-sm"
            />
            <textarea
              placeholder="Paste document text here. Separate paragraphs with a blank line."
              value={newDocText}
              onChange={(e) => setNewDocText(e.target.value)}
              rows={3}
              className="w-full border border-stone-300 rounded px-2 py-1 text-sm"
            />
            <button onClick={handleAddDoc} className="text-sm bg-stone-900 text-white px-3 py-1.5 rounded hover:bg-stone-700">
              Add document
            </button>
            {docError && <p className="text-red-600 text-xs" role="alert">{docError}</p>}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-stone-500 mb-2">Ask</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. How long does express shipping take?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              className="flex-1 border border-stone-300 rounded px-3 py-2 text-sm"
            />
            <button onClick={handleAsk} disabled={isLoading} className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700 disabled:opacity-50">
              {isLoading ? "Retrieving..." : "Ask"}
            </button>
          </div>
          {errorMessage && <p className="text-red-600 text-sm mt-2" role="alert">{errorMessage}</p>}
        </section>

        {result && (
          <section className="space-y-4">
            {result.retrieved.length > 0 && (
              <div>
                <h2 className="text-xs uppercase tracking-wide text-stone-500 mb-2">Retrieved context</h2>
                <div className="space-y-2">
                  {result.retrieved.map((c, i) => (
                    <div key={c.id} className="bg-white border border-stone-200 rounded p-3 text-sm">
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>[{i + 1}] {c.docName}</span>
                        <span>similarity: {c.score.toFixed(3)}</span>
                      </div>
                      <p className="text-stone-700">{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h2 className="text-xs uppercase tracking-wide text-stone-500 mb-2">Answer</h2>
              <div className="bg-white border border-orange-200 rounded p-4 text-sm whitespace-pre-wrap">
                {result.answer}
              </div>
            </div>
          </section>
        )}

        {!result && !isLoading && !errorMessage && (
          <p className="text-sm text-stone-400">
            No answer yet — ask a question above to retrieve context and generate one.
          </p>
        )}
      </div>
    </div>
  );
}

export default MinimalRAG;
