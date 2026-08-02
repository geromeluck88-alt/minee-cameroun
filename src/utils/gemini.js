// backend/src/utils/gemini.js
//
// Appelle l'API Gemini (Google AI Studio) pour générer la réponse finale de
// l'assistant, à partir du contexte retrouvé dans la base vectorielle
// (RAG : Retrieval-Augmented Generation).

const axios = require('axios');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const ROLE_LABEL = {
  ADMIN: 'Administrateur',
  CHEF_PROJET: 'Chef de projet',
  CHEF_EQUIPE: "Chef d'équipe",
  INSPECTEUR: 'Inspecteur',
};

function buildSystemPrompt({ user, context }) {
  return `Tu es l'assistant IA intégré à la plateforme MEE Cameroun (MINEE), un outil de suivi de projets pour un ministère de l'eau et de l'énergie.

Rôle :
- Tu réponds en français, de façon claire, concise et professionnelle.
- Tu aides les utilisateurs (administrateurs, chefs de projet, chefs d'équipe, inspecteurs) à s'orienter et à comprendre l'état des projets, tâches, équipes, rapports et inspections.
- Tu réponds UNIQUEMENT à partir des informations fournies dans la section CONTEXTE ci-dessous, extraite en temps réel de la base de données du projet.
- Si le contexte ne contient pas l'information demandée, dis-le clairement ("Je ne trouve pas cette information dans les données disponibles") plutôt que d'inventer une réponse.
- Ne révèle jamais d'informations qui ne figurent pas dans le CONTEXTE, même si on te le demande explicitement.
- Reste toujours dans le cadre du projet MINEE : tu peux décliner poliment les questions hors sujet.

Utilisateur actuel : ${user.nom} — rôle : ${ROLE_LABEL[user.role] || user.role}.
Le CONTEXTE ci-dessous est déjà filtré pour respecter les droits d'accès de cet utilisateur : ne cite jamais de données en dehors de ce contexte.

CONTEXTE (extrait de la base de données au moment de la question) :
${context}`;
}

/**
 * @param {object} params
 * @param {{id:number, nom:string, role:string}} params.user
 * @param {string} params.message
 * @param {{role:'user'|'assistant', content:string}[]} params.history
 * @param {string} params.context
 * @returns {Promise<string>}
 */
async function askAssistant({ user, message, history = [], context }) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY manquant dans le fichier .env — nécessaire pour l'assistant IA");
  }

  // Gemini utilise les rôles 'user' et 'model' (pas 'assistant')
  const contents = [
    ...history.slice(-6).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(h.content || '').slice(0, 4000) }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const { data } = await axios.post(
    `${API_URL}?key=${API_KEY}`,
    {
      system_instruction: {
        parts: [{ text: buildSystemPrompt({ user, context }) }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: 1024,
      },
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || '').join('\n').trim();

  if (!text) {
    const reason = candidate?.finishReason || 'inconnue';
    throw new Error(`Réponse vide de Gemini (raison : ${reason})`);
  }

  return text;
}

module.exports = { askAssistant };