// Pure logic, no React, no fetch side effects — this separation is what
// makes it possible to unit test in CI without a browser or network.

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export function chunkDocument(text, docName) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((content, i) => ({ id: `${docName}-${i}`, docName, content }));
}

export function buildTfIdfIndex(chunks) {
  const chunkTokens = chunks.map((c) => tokenize(c.content));
  const df = {};
  chunkTokens.forEach((tokens) => {
    new Set(tokens).forEach((term) => { df[term] = (df[term] || 0) + 1; });
  });
  const N = chunks.length;
  const idf = {};
  Object.keys(df).forEach((term) => { idf[term] = Math.log((N + 1) / (df[term] + 1)) + 1; });
  const vectors = chunkTokens.map((tokens) => {
    const tf = {};
    tokens.forEach((t) => (tf[t] = (tf[t] || 0) + 1));
    const vec = {};
    Object.keys(tf).forEach((term) => { vec[term] = (tf[term] / tokens.length) * (idf[term] || 0); });
    return vec;
  });
  return { idf, vectors };
}

export function vectorizeQuery(query, idf) {
  const tokens = tokenize(query);
  const tf = {};
  tokens.forEach((t) => (tf[t] = (tf[t] || 0) + 1));
  const vec = {};
  Object.keys(tf).forEach((term) => { if (idf[term]) vec[term] = (tf[term] / tokens.length) * idf[term]; });
  return vec;
}

export function cosineSimilarity(vecA, vecB) {
  const keysA = Object.keys(vecA);
  let dot = 0;
  keysA.forEach((k) => { if (vecB[k]) dot += vecA[k] * vecB[k]; });
  const magA = Math.sqrt(Object.values(vecA).reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(Object.values(vecB).reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

export const MIN_RELEVANCE_SCORE = 0.05;

export function hasRelevantMatch(results) {
  return results.length > 0 && results[0].score >= MIN_RELEVANCE_SCORE;
}

export function retrieveTopK(query, chunks, index, k = 3) {
  const queryVec = vectorizeQuery(query, index.idf);
  const scored = chunks.map((chunk, i) => ({
    ...chunk,
    score: cosineSimilarity(queryVec, index.vectors[i]),
  }));
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}
