// backend/src/routes/rapports.js
const express = require('express');
const prisma = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(authMiddleware);

// GET /api/rapports
router.get('/', async (req, res) => {
  const { user } = req;
  let where = {};
  if (user.role === 'CHEF_EQUIPE') where = { chefEquipeId: user.id };
  else if (user.role === 'CHEF_PROJET') where = { tache: { projet: { chefProjetId: user.id } } };

  const rapports = await prisma.rapport.findMany({
    where,
    include: {
      tache: { select: { id: true, titre: true } },
      chefEquipe: { select: { id: true, nom: true } },
    },
    orderBy: { dateCreation: 'desc' },
  });

  res.json({ rapports });
});

// POST /api/rapports (multipart/form-data, jusqu'à 5 photos)
router.post('/', upload.array('photos', 5), async (req, res) => {
  try {
    const { tacheId, titre, description, statutTache, avancement, observations } = req.body;

    if (!tacheId || !titre || !description) {
      return res.status(400).json({ error: 'tacheId, titre et description sont requis' });
    }

    const photosPaths = (req.files || []).map((f) => `/uploads/${f.filename}`);

    const rapport = await prisma.rapport.create({
      data: {
        tacheId: Number(tacheId),
        chefEquipeId: req.user.id,
        titre,
        description,
        statutTache: statutTache || 'EN_COURS',
        avancement: Number(avancement) || 0,
        observations: observations || null,
        photos: photosPaths.length ? JSON.stringify(photosPaths) : null,
      },
    });

    // Met à jour la tâche associée avec le nouveau statut/avancement
    await prisma.tache.update({
      where: { id: Number(tacheId) },
      data: {
        statut: statutTache || undefined,
        avancement: avancement ? Number(avancement) : undefined,
      },
    });

    res.status(201).json(rapport);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Erreur lors de la création du rapport' });
  }
});

module.exports = router;