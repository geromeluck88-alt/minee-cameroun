// backend/src/utils/embeddings.js
//
// Génère les embeddings (vecteurs numériques) utilisés par la base
// vectorielle de l'assistant IA, via l'API Jina AI (gratuite, sans
// carte bancaire nécessaire — voir https://jina.ai/embeddings).
//
// Deux "task" sont utilisés (équivalent du input_type de Voyage) :
//  - "retrieval.passage" : pour indexer le contenu (projets, tâches...)
//  - "retrieval.query"   : pour la question posée par l'utilisateur

const axios = require('axios');

const JINA_URL = 'https://api.jina.ai/v1/embeddings';
const MODEL = process.env.JINA_MODEL || 'jina-embeddings-v3';

/** Pause simple, utilisée entre les tentatives. */
function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcule l'embedding d'un texte, avec re-tentatives automatiques en cas
 * de limite de débit (429) — jusqu'à 4 tentatives, avec un délai croissant
 * (2s, 4s, 8s, 16s) avant d'abandonner.
 * @param {string} text
 * @param {'document'|'query'} inputType
 * @returns {Promise<number[]>}
 */
async function embedText(text, inputType = 'document') {
  if (!process.env.JINA_API_KEY) {
    throw new Error(
      "JINA_API_KEY manquant dans le fichier .env — nécessaire pour l'assistant IA"
    );
  }

  const task = inputType === 'query' ? 'retrieval.query' : 'retrieval.passage';
  const MAX_TENTATIVES = 4;

  for (let tentative = 1; tentative <= MAX_TENTATIVES; tentative++) {
    try {
      const { data } = await axios.post(
        JINA_URL,
        {
          input: [text],
          model: MODEL,
          task,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.JINA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      return data.data[0].embedding;
    } catch (err) {
      const status = err.response?.status;
      const estDernierEssai = tentative === MAX_TENTATIVES;

      if (status === 429 && !estDernierEssai) {
        const delai = 2000 * Math.pow(2, tentative - 1); // 2s, 4s, 8s...
        console.warn(
          `⚠️  Limite de débit Jina AI (429) — nouvelle tentative dans ${delai / 1000}s (essai ${tentative}/${MAX_TENTATIVES})`
        );
        await attendre(delai);
        continue;
      }

      if (status === 429) {
        throw new Error(
          "Limite de débit Jina AI atteinte de façon persistante (429) — attendez une minute puis relancez."
        );
      }

      throw err;
    }
  }
}

module.exports = { embedText };
