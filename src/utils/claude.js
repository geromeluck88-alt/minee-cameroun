// backend/src/utils/claude.js
//
// Appelle l'API Claude (Anthropic) pour générer la réponse finale de
// l'assistant, à partir du contexte retrouvé dans la base vectorielle
// (RAG : Retrieval-Augmented Generation).

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

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
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY manquant dans le fichier .env — nécessaire pour l'assistant IA");
  }

  const messages = [
    ...history.slice(-6).map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: String(h.content || '').slice(0, 4000),
    })),
    { role: 'user', content: message },
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt({ user, context }),
    messages,
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

module.exports = { askAssistant };
