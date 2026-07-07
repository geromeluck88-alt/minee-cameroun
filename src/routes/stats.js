// backend/src/routes/stats.js
const express = require('express');
const prisma = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/stats/dashboard
router.get('/dashboard', async (req, res) => {
  const { user } = req;
  const now = new Date();

  if (user.role === 'ADMIN') {
    const [totalProjets, projetsEnCours, totalTaches, tachesEnRetard, totalInspections, totalUsers] = await Promise.all([
      prisma.projet.count(),
      prisma.projet.count({ where: { statut: 'EN_COURS' } }),
      prisma.tache.count(),
      prisma.tache.count({ where: { OR: [{ statut: 'EN_RETARD' }, { dateFinPrevue: { lt: now }, statut: { notIn: ['TERMINE'] } }] } }),
      prisma.inspection.count(),
      prisma.utilisateur.count(),
    ]);
    return res.json({ totalProjets, projetsEnCours, totalTaches, tachesEnRetard, totalInspections, totalUsers });
  }

  if (user.role === 'CHEF_PROJET') {
    const baseWhere = { chefProjetId: user.id };
    const [totalProjets, projetsEnCours, projetsTermines, totalTaches, tachesEnRetard] = await Promise.all([
      prisma.projet.count({ where: baseWhere }),
      prisma.projet.count({ where: { ...baseWhere, statut: 'EN_COURS' } }),
      prisma.projet.count({ where: { ...baseWhere, statut: 'TERMINE' } }),
      prisma.tache.count({ where: { projet: baseWhere } }),
      prisma.tache.count({ where: { projet: baseWhere, statut: 'EN_RETARD' } }),
    ]);
    return res.json({ totalProjets, projetsEnCours, projetsTermines, totalTaches, tachesEnRetard });
  }

  if (user.role === 'CHEF_EQUIPE') {
    const [totalEquipes, totalTaches, tachesEnCours, tachesTerminees, totalRapports] = await Promise.all([
      prisma.equipe.count({ where: { chefEquipeId: user.id } }),
      prisma.tache.count({ where: { assigneAId: user.id } }),
      prisma.tache.count({ where: { assigneAId: user.id, statut: 'EN_COURS' } }),
      prisma.tache.count({ where: { assigneAId: user.id, statut: 'TERMINE' } }),
      prisma.rapport.count({ where: { chefEquipeId: user.id } }),
    ]);
    return res.json({ totalEquipes, totalTaches, tachesEnCours, tachesTerminees, totalRapports });
  }

  if (user.role === 'INSPECTEUR') {
    const baseWhere = { inspecteurId: user.id };
    const [totalInspections, enAttente, enCours, terminees] = await Promise.all([
      prisma.inspection.count({ where: baseWhere }),
      prisma.inspection.count({ where: { ...baseWhere, statut: 'EN_ATTENTE' } }),
      prisma.inspection.count({ where: { ...baseWhere, statut: 'EN_COURS' } }),
      prisma.inspection.count({ where: { ...baseWhere, statut: 'TERMINE' } }),
    ]);
    return res.json({ totalInspections, enAttente, enCours, terminees });
  }

  res.json({});
});

module.exports = router;
