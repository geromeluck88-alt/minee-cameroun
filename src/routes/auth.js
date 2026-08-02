// backend/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { signToken } = require('../utils/jwt');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const SELECT_PUBLIC = {
  id: true, nom: true, email: true, role: true,
  telephone: true, photo: true, actif: true, dateCreation: true,
};

// POST /api/auth/connexion
router.post(
  '/connexion',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('motDePasse').notEmpty().withMessage('Mot de passe requis'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, motDePasse } = req.body;

    const user = await prisma.utilisateur.findUnique({ where: { email } });
    if (!user || !user.actif) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const valid = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = signToken({ id: user.id, role: user.role });
    const { motDePasse: _omit, ...publicUser } = user;

    res.json({ token, user: publicUser });
  }
);

// POST /api/auth/inscription
router.post(
  '/inscription',
  [
    body('nom').notEmpty().withMessage('Le nom est requis'),
    body('email').isEmail().withMessage('Email invalide'),
    body('motDePasse').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('role').isIn(['ADMIN', 'CHEF_PROJET', 'CHEF_EQUIPE', 'INSPECTEUR']).withMessage('Rôle invalide'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { nom, email, motDePasse, telephone, role } = req.body;

    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
    }

    const hashed = await bcrypt.hash(motDePasse, 10);

    const user = await prisma.utilisateur.create({
      data: { nom, email, motDePasse: hashed, telephone: telephone || null, role },
      select: SELECT_PUBLIC,
    });

    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({ token, user });
  }
);

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
