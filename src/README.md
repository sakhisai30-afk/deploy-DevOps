# Minimal RAG Application

## Project Overview

A Retrieval-Augmented Generation (RAG) application that answers questions only using uploaded documents.

---

## Features

- Add documents
- Split documents into chunks
- TF-IDF embeddings
- Cosine similarity retrieval
- Claude API integration
- Grounded answers only
- Source citations
- Rejects unrelated questions
- Logging

---

## Tech Stack

Frontend
- React
- Vite
- JavaScript
- Tailwind CSS

Backend
- Vercel Serverless Function
- Anthropic Claude API

Deployment
- Vercel

---

## Project Structure

src/
api/
public/

---

## Architecture

User
↓

React UI
↓

TF-IDF Retriever

↓

Top Relevant Chunks

↓

Claude API

↓

Grounded Answer

↓

UI Response

---

## Installation

git clone <repository>

npm install

npm run dev

---

## Environment Variables

VITE_API_BASE_URL=

ANTHROPIC_API_KEY=

---

## Deployment

Push code to GitHub.

Deploy using Vercel.

---

## Demo

1. Upload document

2. Ask question

3. Receive grounded answer

4. Sources displayed

5. Unrelated questions return

"I don't have enough information."

---

## Future Improvements

- PDF support

- Vector database

- Semantic embeddings

- Authentication

- Chat history

---

## Author

Amruta Patil