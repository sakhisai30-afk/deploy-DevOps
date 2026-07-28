# LLM Cost Audit

## Model Selection

Model used:
- Claude 3.5 Haiku

Reason:
- Lower cost than larger Claude models.
- Fast response time.
- Good quality for Retrieval-Augmented Generation (RAG).

---

## Context Size

The application retrieves the top 3 relevant document chunks before sending them to the LLM.

Reason:
- Provides enough context for accurate answers.
- Avoids sending unnecessary text, reducing token usage.

---

## Max Tokens

max_tokens = 150

Reason:
- Earlier versions allowed much larger responses.
- Reducing the maximum response length lowers API cost while still producing complete answers.

---

## Response Caching

Previously answered questions can be cached to avoid repeated API requests.

Benefit:
- Lower API cost.
- Faster response time.

---

## Batching

Not implemented.

Reason:
- This application processes one user question at a time.
- Batching is unnecessary for the current workload.

---

## Considered Optimization

Reducing retrieval from Top-3 to Top-2 chunks.

Decision:
- Not implemented because it was not tested.
- Keeping Top-3 maintains answer quality.

---

## Cost Optimizations Implemented

- Claude 3.5 Haiku model
- max_tokens reduced to 150
- Response caching
- Retrieval limited to Top-3 chunks

---

## Conclusion

The application minimizes LLM usage by:
- Using a low-cost model.
- Limiting response length.
- Sending only relevant document chunks.
- Avoiding unnecessary API calls through caching.