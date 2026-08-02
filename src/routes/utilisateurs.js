// backend/src/routes/utilisateurs.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const SELECT_PUBLIC = {
  id: true, nom: true, email: true, role: true,
  telephone: true, photo: true, actif: true, dateCreation: true,
};

// GET /api/utilisateurs?role=CHEF_PROJET
router.get('/', async (req, res) => {
  const { role } = req.query;
  const users = await prisma.utilisateur.findMany({
    where: role ? { role } : {},
    select: SELECT_PUBLIC,
    orderBy: { dateCreation: 'desc' },
  });
  res.json({ utilisateurs: users });
});

// POST /api/utilisateurs (admin uniquement)
router.post(
  '/',
  requireRole('ADMIN'),
  [
    body('nom').notEmpty().withMessage('Le nom est requis'),
    body('email').isEmail().withMessage('Email invalide'),
    body('motDePasse').isLength({ min: 6 }).withMessage('Mot de passe trop court'),
    body('role').isIn(['ADMIN', 'CHEF_PROJET', 'CHEF_EQUIPE', 'INSPECTEUR']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { nom, email, motDePasse, telephone, role } = req.body;

    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' });

    const hashed = await bcrypt.hash(motDePasse, 10);
    const user = await prisma.utilisateur.create({
      data: { nom, email, motDePasse: hashed, telephone: telephone || null, role },
      select: SELECT_PUBLIC,
    });
    res.status(201).json(user);
  }
);

// PUT /api/utilisateurs/:id (activer/désactiver, modifier)
router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  const { actif, nom, telephone, role } = req.body;

  const data = {};
  if (typeof actif === 'boolean') data.actif = actif;
  if (nom) data.nom = nom;
  if (telephone !== undefined) data.telephone = telephone;
  if (role) data.role = role;

  try {
    const user = await prisma.utilisateur.update({
      where: { id },
      data,
      select: SELECT_PUBLIC,
    });
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: 'Utilisateur introuvable' });
  }
});

// DELETE /api/utilisateurs/:id
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.utilisateur.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ error: 'Utilisateur introuvable' });
  }
});

module.exports = router;