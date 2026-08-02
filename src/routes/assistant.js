// backend/src/routes/assistant.js
const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { search } = require('../utils/vectorStore');
const { askAssistant } = require('../utils/gemini');
const { getVisibleProjetIds } = require('../utils/scope');
const { reindexAll } = require('../utils/reindex');

const router = express.Router();
router.use(authMiddleware);

// POST /api/assistant/chat — pose une question à l'assistant IA
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Un message est requis' });
    }
    if (String(message).length > 2000) {
      return res.status(400).json({ error: 'Message trop long (2000 caractères max)' });
    }

    const visibleProjetIds = await getVisibleProjetIds(req.user);
    const results = await search(message, { visibleProjetIds, topK: 6 });

    const context = results.length
      ? results
          .map((r, i) => `[Source ${i + 1} — ${r.type} #${r.refId}]\n${r.content}`)
          .join('\n\n')
      : "Aucune donnée pertinente n'a été trouvée dans la base du projet pour cette question.";

    const reply = await askAssistant({
      user: req.user,
      message: String(message).trim(),
      history: Array.isArray(history) ? history : [],
      context,
    });

    res.json({
      reply,
      sources: results.map((r) => ({ type: r.type, refId: r.refId, score: Number(r.score.toFixed(3)) })),
    });
  } catch (err) {
    console.error('Erreur assistant IA:', err.message);
    res.status(500).json({ error: "L'assistant est momentanément indisponible. Réessayez dans un instant." });
  }
});

// POST /api/assistant/reindex — reconstruit toute la base vectorielle (ADMIN)
router.post('/reindex', requireRole('ADMIN'), async (req, res) => {
  try {
    const documentsIndexes = await reindexAll();
    res.json({ message: 'Réindexation terminée', documentsIndexes });
  } catch (err) {
    console.error('Erreur réindexation:', err.message);
    res.status(500).json({ error: err.message || 'Erreur lors de la réindexation' });
  }
});

module.exports = router;
