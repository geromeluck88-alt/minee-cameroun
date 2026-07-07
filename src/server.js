// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const utilisateursRoutes = require('./routes/utilisateurs');
const projetsRoutes = require('./routes/projets');
const tachesRoutes = require('./routes/taches');
const equipesRoutes = require('./routes/equipes');
const rapportsRoutes = require('./routes/rapports');
const inspectionsRoutes = require('./routes/inspections');
const statsRoutes = require('./routes/stats');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Fichiers uploadés (photos de rapports) accessibles via /uploads/...
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Vérification rapide de l'état du serveur
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/utilisateurs', utilisateursRoutes);
app.use('/api/projets', projetsRoutes);
app.use('/api/taches', tachesRoutes);
app.use('/api/equipes', equipesRoutes);
app.use('/api/rapports', rapportsRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/stats', statsRoutes);

// Gestion des erreurs multer (taille de fichier, format, etc.)
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Erreur serveur' });
  }
  next();
});

// Route inconnue
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend MINEE démarré sur http://localhost:${PORT}`);
  console.log(`   Test santé : http://localhost:${PORT}/api/health`);
});
