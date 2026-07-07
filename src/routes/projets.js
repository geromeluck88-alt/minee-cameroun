// backend/src/routes/projets.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const CHEF_SELECT = { id: true, nom: true, email: true };

// GET /api/projets — liste filtrée selon le rôle
router.get('/', async (req, res) => {
  const { user } = req;

  let where = {};
  if (user.role === 'CHEF_PROJET') {
    where = { chefProjetId: user.id };
  } else if (user.role === 'CHEF_EQUIPE') {
    where = { equipes: { some: { chefEquipeId: user.id } } };
  } else if (user.role === 'INSPECTEUR') {
    where = {}; // un inspecteur peut voir tous les projets à inspecter
  }
  // ADMIN : pas de filtre

  const projets = await prisma.projet.findMany({
    where,
    include: {
      chefProjet: { select: CHEF_SELECT },
      _count: { select: { taches: true, equipes: true, inspections: true } },
    },
    orderBy: { id: 'desc' },
  });

  res.json({ projets });
});

// GET /api/projets/:id — détail avec relations
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const projet = await prisma.projet.findUnique({
    where: { id },
    include: {
      chefProjet: { select: CHEF_SELECT },
      taches: { include: { assigneA: { select: { id: true, nom: true } } } },
      equipes: { include: { membres: { include: { utilisateur: true } } } },
      inspections: { include: { inspecteur: { select: { id: true, nom: true } } } },
    },
  });

  if (!projet) return res.status(404).json({ error: 'Projet introuvable' });
  res.json({ projet });
});

// POST /api/projets (admin, chef de projet)
router.post(
  '/',
  requireRole('ADMIN', 'CHEF_PROJET'),
  [
    body('nom').notEmpty().withMessage('Le nom du projet est requis'),
    body('dateDebut').notEmpty().withMessage('La date de début est requise'),
    body('dateFin').notEmpty().withMessage('La date de fin est requise'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { nom, description, dateDebut, dateFin, statut, priorite, budget, chefProjetId } = req.body;
    const { user } = req;

    const finalChefId = user.role === 'ADMIN' && chefProjetId ? Number(chefProjetId) : user.id;

    const projet = await prisma.projet.create({
      data: {
        nom,
        description: description || null,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        statut: statut || 'EN_ATTENTE',
        priorite: priorite || 'NORMALE',
        budget: budget ? Number(budget) : null,
        chefProjetId: finalChefId,
      },
      include: { chefProjet: { select: CHEF_SELECT } },
    });

    res.status(201).json(projet);
  }
);

// PUT /api/projets/:id
router.put('/:id', requireRole('ADMIN', 'CHEF_PROJET'), async (req, res) => {
  const id = Number(req.params.id);
  const { nom, description, dateDebut, dateFin, statut, priorite, budget } = req.body;

  const data = {};
  if (nom !== undefined) data.nom = nom;
  if (description !== undefined) data.description = description;
  if (dateDebut !== undefined) data.dateDebut = new Date(dateDebut);
  if (dateFin !== undefined) data.dateFin = new Date(dateFin);
  if (statut !== undefined) data.statut = statut;
  if (priorite !== undefined) data.priorite = priorite;
  if (budget !== undefined) data.budget = budget ? Number(budget) : null;

  try {
    const projet = await prisma.projet.update({ where: { id }, data });
    res.json(projet);
  } catch (err) {
    res.status(404).json({ error: 'Projet introuvable' });
  }
});

// DELETE /api/projets/:id
router.delete('/:id', requireRole('ADMIN', 'CHEF_PROJET'), async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.projet.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ error: 'Projet introuvable' });
  }
});

module.exports = router;