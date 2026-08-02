// backend/src/routes/taches.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { indexSafely, unindexSafely } = require('../utils/indexHook');
const { tacheToText } = require('../utils/textBuilders');

const router = express.Router();
router.use(authMiddleware);

// GET /api/taches?statut=EN_COURS
router.get('/', async (req, res) => {
  const { user } = req;
  const { statut } = req.query;

  let where = statut ? { statut } : {};

  if (user.role === 'CHEF_EQUIPE') {
    where = { ...where, assigneAId: user.id };
  } else if (user.role === 'CHEF_PROJET') {
    where = { ...where, projet: { chefProjetId: user.id } };
  }
  // ADMIN et INSPECTEUR voient tout

  const taches = await prisma.tache.findMany({
    where,
    include: {
      projet: { select: { id: true, nom: true } },
      assigneA: { select: { id: true, nom: true } },
    },
    orderBy: { id: 'desc' },
  });

  res.json({ taches });
});

// POST /api/taches
router.post(
  '/',
  [
    body('titre').notEmpty().withMessage('Le titre est requis'),
    body('projetId').notEmpty().withMessage('Le projet est requis'),
    body('dateDebut').notEmpty().withMessage('La date de début est requise'),
    body('dateFinPrevue').notEmpty().withMessage('La date de fin prévue est requise'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { titre, description, dateDebut, dateFinPrevue, statut, priorite, projetId, assigneAId } = req.body;

    const tache = await prisma.tache.create({
      data: {
        titre,
        description: description || null,
        dateDebut: new Date(dateDebut),
        dateFinPrevue: new Date(dateFinPrevue),
        statut: statut || 'A_FAIRE',
        priorite: priorite || 'NORMALE',
        projetId: Number(projetId),
        assigneAId: assigneAId ? Number(assigneAId) : null,
      },
      include: {
        projet: { select: { id: true, nom: true } },
        assigneA: { select: { id: true, nom: true } },
      },
    });

    indexSafely({ type: 'tache', refId: tache.id, projetId: tache.projetId, content: tacheToText(tache) });

    res.status(201).json(tache);
  }
);

// PUT /api/taches/:id (mise à jour statut/avancement notamment)
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { titre, description, dateDebut, dateFinPrevue, statut, priorite, avancement, assigneAId } = req.body;

  const data = {};
  if (titre !== undefined) data.titre = titre;
  if (description !== undefined) data.description = description;
  if (dateDebut !== undefined) data.dateDebut = new Date(dateDebut);
  if (dateFinPrevue !== undefined) data.dateFinPrevue = new Date(dateFinPrevue);
  if (statut !== undefined) data.statut = statut;
  if (priorite !== undefined) data.priorite = priorite;
  if (avancement !== undefined) data.avancement = Number(avancement);
  if (assigneAId !== undefined) data.assigneAId = assigneAId ? Number(assigneAId) : null;

  try {
    const tache = await prisma.tache.update({
      where: { id },
      data,
      include: {
        projet: { select: { id: true, nom: true } },
        assigneA: { select: { id: true, nom: true } },
      },
    });
    indexSafely({ type: 'tache', refId: tache.id, projetId: tache.projetId, content: tacheToText(tache) });
    res.json(tache);
  } catch (err) {
    res.status(404).json({ error: 'Tâche introuvable' });
  }
});

// DELETE /api/taches/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.tache.delete({ where: { id } });
    unindexSafely('tache', id);
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ error: 'Tâche introuvable' });
  }
});

module.exports = router;