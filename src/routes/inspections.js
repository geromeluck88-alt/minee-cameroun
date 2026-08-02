// backend/src/routes/inspections.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { indexSafely } = require('../utils/indexHook');
const { inspectionToText } = require('../utils/textBuilders');

const router = express.Router();
router.use(authMiddleware);

// GET /api/inspections
router.get('/', async (req, res) => {
  const { user } = req;
  let where = {};
  if (user.role === 'INSPECTEUR') where = { inspecteurId: user.id };
  else if (user.role === 'CHEF_PROJET') where = { projet: { chefProjetId: user.id } };

  const inspections = await prisma.inspection.findMany({
    where,
    include: {
      projet: { select: { id: true, nom: true } },
      inspecteur: { select: { id: true, nom: true } },
    },
    orderBy: { dateInspection: 'desc' },
  });

  res.json(inspections);
});

// POST /api/inspections
router.post(
  '/',
  [
    body('projetId').notEmpty().withMessage('Le projet est requis'),
    body('dateInspection').notEmpty().withMessage("La date d'inspection est requise"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { projetId, dateInspection, observations, recommandations, statut, conforme } = req.body;

    const inspection = await prisma.inspection.create({
      data: {
        projetId: Number(projetId),
        inspecteurId: req.user.id,
        dateInspection: new Date(dateInspection),
        observations: observations || null,
        recommandations: recommandations || null,
        statut: statut || 'EN_ATTENTE',
        conforme: typeof conforme === 'boolean' ? conforme : null,
      },
      include: {
        projet: { select: { id: true, nom: true } },
        inspecteur: { select: { id: true, nom: true } },
      },
    });

    indexSafely({
      type: 'inspection',
      refId: inspection.id,
      projetId: inspection.projetId,
      content: inspectionToText(inspection),
    });

    res.status(201).json(inspection);
  }
);

// PUT /api/inspections/:id
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { dateInspection, observations, recommandations, statut, conforme } = req.body;

  const data = {};
  if (dateInspection !== undefined) data.dateInspection = new Date(dateInspection);
  if (observations !== undefined) data.observations = observations;
  if (recommandations !== undefined) data.recommandations = recommandations;
  if (statut !== undefined) data.statut = statut;
  if (conforme !== undefined) data.conforme = conforme;

  try {
    const inspection = await prisma.inspection.update({
      where: { id },
      data,
      include: {
        projet: { select: { id: true, nom: true } },
        inspecteur: { select: { id: true, nom: true } },
      },
    });
    indexSafely({
      type: 'inspection',
      refId: inspection.id,
      projetId: inspection.projetId,
      content: inspectionToText(inspection),
    });
    res.json(inspection);
  } catch (err) {
    res.status(404).json({ error: 'Inspection introuvable' });
  }
});

module.exports = router;
