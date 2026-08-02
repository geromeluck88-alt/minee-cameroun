// backend/src/utils/scope.js
//
// Détermine la liste des projets qu'un utilisateur est autorisé à voir,
// en reprenant exactement la même logique de filtrage par rôle que les
// routes existantes (voir routes/projets.js). Utilisé par l'assistant IA
// pour ne jamais faire fuiter, dans ses réponses, des informations d'un
// projet auquel l'utilisateur n'a pas accès.

const prisma = require('./prisma');

/**
 * @param {{id:number, role:string}} user
 * @returns {Promise<number[]|null>} liste d'ids de projets visibles,
 *   ou null si l'utilisateur n'a aucune restriction (ADMIN, INSPECTEUR).
 */
async function getVisibleProjetIds(user) {
  if (user.role === 'ADMIN' || user.role === 'INSPECTEUR') {
    return null; // aucune restriction, comme dans GET /api/projets
  }

  let where = {};
  if (user.role === 'CHEF_PROJET') {
    where = { chefProjetId: user.id };
  } else if (user.role === 'CHEF_EQUIPE') {
    where = { equipes: { some: { chefEquipeId: user.id } } };
  }

  const projets = await prisma.projet.findMany({ where, select: { id: true } });
  return projets.map((p) => p.id);
}

module.exports = { getVisibleProjetIds };
