// backend/src/utils/indexHook.js
//
// Petits wrappers appelés depuis les routes après chaque création/
// modification/suppression, pour garder la base vectorielle de
// l'assistant IA synchronisée avec les données en temps réel.
//
// Toute erreur (ex. VOYAGE_API_KEY absent, quota dépassé, réseau) est
// avalée et journalée : l'indexation ne doit JAMAIS faire échouer une
// action normale de l'utilisateur (créer un projet, une tâche...).

const { upsertDocument, deleteDocument } = require('./vectorStore');

async function indexSafely(doc) {
  try {
    await upsertDocument(doc);
  } catch (err) {
    console.warn(`⚠️  Indexation assistant IA échouée (${doc.type} #${doc.refId}) :`, err.message);
  }
}

async function unindexSafely(type, refId) {
  try {
    await deleteDocument(type, refId);
  } catch (err) {
    console.warn(`⚠️  Désindexation assistant IA échouée (${type} #${refId}) :`, err.message);
  }
}

module.exports = { indexSafely, unindexSafely };
