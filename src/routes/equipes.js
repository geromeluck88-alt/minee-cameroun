// backend/src/routes/equipes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { indexSafely, unindexSafely } = require('../utils/indexHook');
const { equipeToText } = require('../utils/textBuilders');

const router = express.Router();
router.use(authMiddleware);

const CHEF_SELECT = { id: true, nom: true, email: true };

/** Recharge une équipe avec ses relations et met à jour son index vectoriel. */
async function reindexEquipe(equipeId) {
  const equipe = await prisma.equipe.findUnique({
    where: { id: equipeId },
    include: {
      chefEquipe: { select: CHEF_SELECT },
      projet: { select: { id: true, nom: true } },
      membres: { include: { utilisateur: true } },
    },
  });
  if (equipe) {
    indexSafely({ type: 'equipe', refId: equipe.id, projetId: equipe.projetId ?? null, content: equipeToText(equipe) });
  }
}

// GET /api/equipes
router.get('/', async (req, res) => {
  const { user } = req;
  let where = {};
  if (user.role === 'CHEF_EQUIPE') where = { chefEquipeId: user.id };

  const equipes = await prisma.equipe.findMany({
    where,
    include: {
      chefEquipe: { select: CHEF_SELECT },
      projet: { select: { id: true, nom: true } },
      _count: { select: { membres: true } },
    },
    orderBy: { id: 'desc' },
  });

  res.json({ equipes });
});

// GET /api/equipes/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const equipe = await prisma.equipe.findUnique({
    where: { id },
    include: {
      chefEquipe: { select: CHEF_SELECT },
      projet: { select: { id: true, nom: true } },
      membres: { include: { utilisateur: true } },
    },
  });
  if (!equipe) return res.status(404).json({ error: 'Équipe introuvable' });
  res.json({ equipe });
});

// POST /api/equipes
router.post(
  '/',
  [body('nom').notEmpty().withMessage("Le nom de l'équipe est requis")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { nom, description, projetId } = req.body;
    const { user } = req;

    const chefEquipeId = user.role === 'CHEF_EQUIPE' ? user.id : (req.body.chefEquipeId ? Number(req.body.chefEquipeId) : user.id);

    const equipe = await prisma.equipe.create({
      data: {
        nom,
        description: description || null,
        projetId: projetId ? Number(projetId) : null,
        chefEquipeId,
      },
      include: {
        chefEquipe: { select: CHEF_SELECT },
        projet: { select: { id: true, nom: true } },
      },
    });

    indexSafely({ type: 'equipe', refId: equipe.id, projetId: equipe.projetId ?? null, content: equipeToText(equipe) });

    res.status(201).json(equipe);
  }
);

// POST /api/equipes/:id/membres — ajouter un membre
router.post('/:id/membres', async (req, res) => {
  const equipeId = Number(req.params.id);
  const { utilisateurId } = req.body;

  if (!utilisateurId) return res.status(400).json({ error: "L'utilisateur est requis" });

  try {
    const membre = await prisma.membreEquipe.create({
      data: { equipeId, utilisateurId: Number(utilisateurId) },
      include: { utilisateur: true },
    });
    reindexEquipe(equipeId);
    res.status(201).json(membre);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ce membre fait déjà partie de cette équipe' });
    }
    res.status(400).json({ error: "Impossible d'ajouter ce membre" });
  }
});

// DELETE /api/equipes/:id/membres/:utilisateurId
router.delete('/:id/membres/:utilisateurId', async (req, res) => {
  const equipeId = Number(req.params.id);
  const utilisateurId = Number(req.params.utilisateurId);

  try {
    await prisma.membreEquipe.deleteMany({ where: { equipeId, utilisateurId } });
    reindexEquipe(equipeId);
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ error: 'Membre introuvable' });
  }
});

// DELETE /api/equipes/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.equipe.delete({ where: { id } });
    unindexSafely('equipe', id);
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ error: 'Équipe introuvable' });
  }
});

module.exports = router;