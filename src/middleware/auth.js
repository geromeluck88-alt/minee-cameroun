// backend/src/middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

/** Vérifie le token JWT et attache l'utilisateur à req.user */
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const payload = verifyToken(token);

    const user = await prisma.utilisateur.findUnique({
      where: { id: payload.id },
      select: {
        id: true, nom: true, email: true, role: true,
        telephone: true, photo: true, actif: true, dateCreation: true,
      },
    });

    if (!user || !user.actif) {
      return res.status(401).json({ error: 'Token invalide ou compte désactivé' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

/** Restreint l'accès à certains rôles : requireRole('ADMIN', 'CHEF_PROJET') */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé pour votre rôle' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
