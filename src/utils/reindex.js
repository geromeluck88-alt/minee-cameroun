// backend/src/utils/reindex.js
//
// (Re)construit entièrement la base vectorielle à partir des données
// actuellement en base MySQL. À exécuter :
//   - une première fois après avoir configuré VOYAGE_API_KEY (npm run reindex)
//   - via POST /api/assistant/reindex (réservé ADMIN) après une migration
//     de données ou un import en masse
//
// Les créations/modifications au fil de l'eau sont, elles, indexées
// automatiquement par les routes (voir routes/projets.js, taches.js, etc.)
// qui appellent upsertDocument() après chaque écriture.

const prisma = require('./prisma');
const { upsertDocument } = require('./vectorStore');
const {
  projetToText,
  tacheToText,
  equipeToText,
  rapportToText,
  inspectionToText,
} = require('./textBuilders');

const CHEF_SELECT = { id: true, nom: true, email: true };

/** Petite pause entre deux appels d'indexation, pour éviter de saturer
 * la limite de débit de l'API d'embeddings. */
function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const DELAI_ENTRE_APPELS_MS = 500;

async function reindexAll() {
  let count = 0;

  const projets = await prisma.projet.findMany({ include: { chefProjet: { select: CHEF_SELECT } } });
  for (const p of projets) {
    await upsertDocument({ type: 'projet', refId: p.id, projetId: p.id, content: projetToText(p) });
    count++;
    await attendre(DELAI_ENTRE_APPELS_MS);
  }

  const taches = await prisma.tache.findMany({
    include: { projet: { select: { id: true, nom: true } }, assigneA: { select: { id: true, nom: true } } },
  });
  for (const t of taches) {
    await upsertDocument({ type: 'tache', refId: t.id, projetId: t.projetId, content: tacheToText(t) });
    count++;
    await attendre(DELAI_ENTRE_APPELS_MS);
  }

  const equipes = await prisma.equipe.findMany({
    include: {
      chefEquipe: { select: CHEF_SELECT },
      projet: { select: { id: true, nom: true } },
      membres: { include: { utilisateur: true } },
    },
  });
  for (const e of equipes) {
    await upsertDocument({ type: 'equipe', refId: e.id, projetId: e.projetId ?? null, content: equipeToText(e) });
    count++;
    await attendre(DELAI_ENTRE_APPELS_MS);
  }

  const rapports = await prisma.rapport.findMany({
    include: {
      tache: { include: { projet: { select: { id: true, nom: true } } } },
      chefEquipe: { select: { id: true, nom: true } },
    },
  });
  for (const r of rapports) {
    await upsertDocument({
      type: 'rapport',
      refId: r.id,
      projetId: r.tache?.projet?.id ?? r.tache?.projetId ?? null,
      content: rapportToText(r),
    });
    count++;
    await attendre(DELAI_ENTRE_APPELS_MS);
  }

  const inspections = await prisma.inspection.findMany({
    include: { projet: { select: { id: true, nom: true } }, inspecteur: { select: { id: true, nom: true } } },
  });
  for (const i of inspections) {
    await upsertDocument({ type: 'inspection', refId: i.id, projetId: i.projetId, content: inspectionToText(i) });
    count++;
    await attendre(DELAI_ENTRE_APPELS_MS);
  }

  return count;
}

// Permet `npm run reindex` en ligne de commande
if (require.main === module) {
  require('dotenv').config();
  reindexAll()
    .then((count) => {
      console.log(`✅ Réindexation terminée : ${count} documents indexés.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Erreur de réindexation :', err.message);
      process.exit(1);
    });
}

module.exports = { reindexAll };
