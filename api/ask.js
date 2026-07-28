export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, context } = req.body;

  if (!query || !context) {
    return res.status(400).json({ error: "Missing query or context" });
  }

  const systemPrompt = `You answer ONLY using the provided context. If the context does not contain the answer, say "I don't have enough information in the provided documents to answer that." Cite sources inline like [1], [2] matching the numbered context blocks. Do not use outside knowledge. Be concise — 2-3 sentences unless the question genuinely requires more.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: `Context:\n\n${context}\n\nQuestion: ${query}` }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: "Anthropic API error", detail: errText });
    }

    const data = await response.json();
    const textBlock = data.content.find((block) => block.type === "text");

    if (!textBlock || !textBlock.text.trim()) {
      return res.status(502).json({ error: "EMPTY_RESPONSE" });
    }

    return res.status(200).json({ answer: textBlock.text, usage: data.usage });
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}
