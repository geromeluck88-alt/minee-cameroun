// backend/src/routes/seedTemp.js
const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

const router = express.Router();

router.post('/', async (req, res) => {
  if (req.query.secret !== 'mee-seed-2026-temp') {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  try {
    const motDePasse = await bcrypt.hash('password123', 10);

    const admin = await prisma.utilisateur.upsert({
      where: { email: 'admin@mee.cm' },
      update: {},
      create: { nom: 'Admin Principal', email: 'admin@mee.cm', motDePasse, role: 'ADMIN', telephone: '+237600000001' },
    });

    const chefProjet = await prisma.utilisateur.upsert({
      where: { email: 'chef.projet@mee.cm' },
      update: {},
      create: { nom: 'Jean Mbarga', email: 'chef.projet@mee.cm', motDePasse, role: 'CHEF_PROJET', telephone: '+237600000002' },
    });

    const chefEquipe = await prisma.utilisateur.upsert({
      where: { email: 'chef.equipe@mee.cm' },
      update: {},
      create: { nom: 'Aminatou Bello', email: 'chef.equipe@mee.cm', motDePasse, role: 'CHEF_EQUIPE', telephone: '+237600000003' },
    });

    const inspecteur = await prisma.utilisateur.upsert({
      where: { email: 'inspecteur@mee.cm' },
      update: {},
      create: { nom: "Paul Eto'o Essomba", email: 'inspecteur@mee.cm', motDePasse, role: 'INSPECTEUR', telephone: '+237600000004' },
    });

    const projet = await prisma.projet.create({
      data: {
        nom: 'Extension réseau électrique — Région du Centre',
        description: 'Extension du réseau de distribution électrique vers les zones rurales de la région du Centre.',
        dateDebut: new Date('2026-01-15'),
        dateFin: new Date('2026-12-31'),
        statut: 'EN_COURS',
        priorite: 'HAUTE',
        budget: 250000000,
        chefProjetId: chefProjet.id,
      },
    });

    const equipe = await prisma.equipe.create({
      data: {
        nom: 'Équipe Terrain Centre A',
        description: "Équipe en charge des travaux d'installation sur le terrain.",
        chefEquipeId: chefEquipe.id,
        projetId: projet.id,
      },
    });

    await prisma.membreEquipe.create({
      data: { equipeId: equipe.id, utilisateurId: chefEquipe.id },
    });

    const tache = await prisma.tache.create({
      data: {
        titre: 'Installation des poteaux électriques — Tranche 1',
        description: 'Pose de 50 poteaux entre les villages A et B.',
        dateDebut: new Date('2026-02-01'),
        dateFinPrevue: new Date('2026-03-15'),
        statut: 'EN_COURS',
        priorite: 'HAUTE',
        avancement: 40,
        projetId: projet.id,
        assigneAId: chefEquipe.id,
      },
    });

    await prisma.rapport.create({
      data: {
        tacheId: tache.id,
        chefEquipeId: chefEquipe.id,
        titre: 'Avancement semaine 1',
        description: '20 poteaux installés sur les 50 prévus.',
        statutTache: 'EN_COURS',
        avancement: 40,
        observations: 'Retard léger dû à la pluie.',
      },
    });

    await prisma.inspection.create({
      data: {
        projetId: projet.id,
        inspecteurId: inspecteur.id,
        dateInspection: new Date('2026-03-01'),
        observations: 'Travaux conformes aux normes de sécurité.',
        recommandations: 'Renforcer la signalisation du chantier.',
        statut: 'TERMINE',
        conforme: true,
      },
    });

    res.json({ success: true, message: 'Données de test insérées avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;