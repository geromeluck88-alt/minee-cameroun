// backend/src/utils/vectorStore.js
//
// Base de données vectorielle "maison", stockée dans la table MySQL
// `assistant_documents` (modèle Prisma AssistantDocument).
//
// Pourquoi ne pas utiliser Pinecone/Chroma/pgvector ?
// Le volume de données d'un outil de suivi de projets ministériel
// (quelques centaines à quelques milliers de projets/tâches/rapports)
// tient très confortablement en mémoire. Faire la similarité cosinus
// en JavaScript, sur les embeddings stockés en JSON dans MySQL, évite
// d'ajouter un service externe (important pour un déploiement simple,
// y compris sur Vercel en serverless) tout en donnant les mêmes
// capacités de recherche sémantique. Si le volume de données venait à
// grossir fortement, ces fonctions sont le seul endroit à adapter
// (ex. migrer vers pgvector) — le reste de l'app n'a pas à changer.

const prisma = require('./prisma');
const { embedText } = require('./embeddings');

/** Similarité cosinus entre deux vecteurs de même dimension. */
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Crée ou met à jour le "chunk" vectoriel d'une entité (projet, tâche...).
 * @param {{type: string, refId: number, projetId?: number|null, content: string}} doc
 */
async function upsertDocument({ type, refId, projetId = null, content }) {
  const embedding = await embedText(content, 'document');
  await prisma.assistantDocument.upsert({
    where: { type_refId: { type, refId } },
    update: { content, embedding, projetId },
    create: { type, refId, projetId, content, embedding },
  });
}

/** Supprime le chunk vectoriel associé à une entité supprimée. */
async function deleteDocument(type, refId) {
  await prisma.assistantDocument.deleteMany({ where: { type, refId } });
}

/**
 * Recherche sémantique dans la base vectorielle.
 * @param {string} query - question de l'utilisateur
 * @param {object} opts
 * @param {number[]|null} opts.visibleProjetIds - ids de projets visibles par
 *   l'utilisateur (null = pas de restriction, ex. ADMIN/INSPECTEUR)
 * @param {number} opts.topK - nombre de résultats à retourner
 */
async function search(query, { visibleProjetIds = null, topK = 6 } = {}) {
  const queryEmbedding = await embedText(query, 'query');

  const where = visibleProjetIds
    ? { OR: [{ projetId: null }, { projetId: { in: visibleProjetIds } }] }
    : {};

  const documents = await prisma.assistantDocument.findMany({ where });

  const scored = documents
    .map((doc) => ({
      type: doc.type,
      refId: doc.refId,
      content: doc.content,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).filter((r) => r.score > 0.1);
}

module.exports = { upsertDocument, deleteDocument, search, cosineSimilarity };
