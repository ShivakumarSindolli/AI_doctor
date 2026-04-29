import os
import logging
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from groq import Groq
from backend.config import GROQ_API_KEY, LLM_MODEL, CHROMA_DIR, KNOWLEDGE_DIR, RAG_TOP_K

logger = logging.getLogger(__name__)

# ── Chroma setup ───────────────────────────────────────────────────────────────
_embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
_chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
_collection = _chroma_client.get_or_create_collection(
    name="medical_knowledge",
    embedding_function=_embedding_fn,
)


def index_knowledge_base():
    """
    Index all .txt files from the knowledge base directory into ChromaDB.
    Call once on startup (idempotent — skips already-indexed docs).
    """
    if not os.path.exists(KNOWLEDGE_DIR):
        logger.warning(f"[RAG] Knowledge base directory not found: {KNOWLEDGE_DIR}")
        return

    existing_ids = set(_collection.get()["ids"])
    docs, ids, metas = [], [], []

    for fname in os.listdir(KNOWLEDGE_DIR):
        if not fname.endswith(".txt"):
            continue
        fpath = os.path.join(KNOWLEDGE_DIR, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            raw = f.read()

        # Chunk into ~500-char pieces
        chunks = [raw[i:i+500] for i in range(0, len(raw), 500)]
        for idx, chunk in enumerate(chunks):
            doc_id = f"{fname}_{idx}"
            if doc_id in existing_ids:
                continue
            docs.append(chunk)
            ids.append(doc_id)
            metas.append({"source": fname, "chunk": idx})

    if docs:
        _collection.add(documents=docs, ids=ids, metadatas=metas)
        logger.info(f"[RAG] Indexed {len(docs)} new chunks from knowledge base.")
    else:
        logger.info("[RAG] Knowledge base already up to date.")


def retrieve_context(query: str) -> str:
    """
    Retrieve the top-K most relevant chunks from the knowledge base.
    Returns a single concatenated context string.
    """
    count = _collection.count()
    if count == 0:
        return ""

    results = _collection.query(
        query_texts=[query],
        n_results=min(RAG_TOP_K, count),
    )
    chunks = results.get("documents", [[]])[0]
    sources = [m.get("source", "") for m in results.get("metadatas", [[]])[0]]

    context_parts = []
    for chunk, src in zip(chunks, sources):
        context_parts.append(f"[Source: {src}]\n{chunk}")

    return "\n\n---\n\n".join(context_parts)


def rag_query(question: str, patient_context: str = "", history: list[dict] = None) -> str:
    """
    Full RAG pipeline:
      1. Retrieve relevant medical knowledge
      2. Build a prompt with retrieved context + patient context + history
      3. Call Groq LLM for the final response
    """
    knowledge = retrieve_context(question)
    client    = Groq(api_key=GROQ_API_KEY)

    system_prompt = f"""You are a highly knowledgeable AI medical assistant.
You have access to verified medical knowledge retrieved below.
Use this knowledge to support your answers. Always be factual.
If confidence is low, clearly recommend the patient see a real doctor.
Never recommend specific drug dosages. Never diagnose definitively — use "likely" or "possible".
Do not use markdown. Respond in clear, plain English as a caring doctor would.

--- RETRIEVED MEDICAL KNOWLEDGE ---
{knowledge if knowledge else "No specific knowledge retrieved for this query."}
---

--- PATIENT CONTEXT ---
{patient_context if patient_context else "No patient profile available."}
---"""

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": question})

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        max_tokens=500,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()
