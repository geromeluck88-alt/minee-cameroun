# Assistant IA — Guide de mise en route

Cette fonctionnalité ajoute un **chat IA** accessible à tous les utilisateurs connectés
(ADMIN, CHEF_PROJET, CHEF_EQUIPE, INSPECTEUR), qui répond à des questions en langage
naturel sur les projets, tâches, équipes, rapports et inspections — en respectant
strictement les droits d'accès de chaque rôle.

## Comment ça marche (vue d'ensemble)

1. **Indexation** : à chaque création/modification d'un projet, d'une tâche, d'une
   équipe, d'un rapport ou d'une inspection, un résumé textuel est généré puis converti
   en **embedding** (vecteur numérique) via l'API **Voyage AI**, et stocké dans la table
   MySQL `assistant_documents` (base de données vectorielle "maison").
2. **Question** : quand un utilisateur pose une question dans le chat, sa question est
   elle aussi transformée en embedding, puis comparée (similarité cosinus) à tous les
   documents auxquels il a droit — exactement les mêmes règles de visibilité que le
   reste de l'application (`utils/scope.js`).
3. **Réponse** : les extraits les plus pertinents sont envoyés comme contexte à
   **Claude** (API Anthropic), avec pour consigne de répondre uniquement à partir de ce
   contexte — c'est une architecture RAG (Retrieval-Augmented Generation) classique.

Aucun service externe supplémentaire (pas de Docker, pas de Postgres/pgvector, pas de
Chroma) : tout tient dans MySQL, ce qui reste compatible avec un déploiement Vercel
serverless.

## Mise en route

### 1. Installer les nouvelles dépendances

```bash
cd backend
npm install
```

(ajoute `@anthropic-ai/sdk` et `axios`)

### 2. Configurer les clés API

Dans `backend/.env`, renseignez :

```env
ANTHROPIC_API_KEY="sk-ant-..."     # https://console.anthropic.com/settings/keys
VOYAGE_API_KEY="pa-..."            # https://dashboard.voyageai.com/
```

Les valeurs par défaut des modèles (`claude-sonnet-5` et `voyage-3.5-lite`) conviennent
pour démarrer ; ajustez `ANTHROPIC_MODEL` / `VOYAGE_MODEL` si besoin.

### 3. Appliquer la migration de base de données

```bash
npx prisma migrate dev --name add_assistant_documents
```

Cela crée la table `assistant_documents`.

### 4. Indexer les données existantes

```bash
npm run reindex
```

À exécuter une première fois pour indexer tout ce qui existe déjà en base (projets,
tâches, équipes, rapports, inspections). Les créations/modifications suivantes sont
indexées automatiquement — vous n'aurez besoin de relancer cette commande qu'après un
import massif de données ou une restauration de sauvegarde.

Un admin peut aussi déclencher une réindexation complète depuis l'application via
`POST /api/assistant/reindex` (protégé par rôle ADMIN).

### 5. Démarrer normalement

```bash
# backend
npm run dev

# frontend
cd ../frontend
npm run dev
```

Le widget de chat (bulle en bas à droite, icône ✨) est visible sur toutes les pages
après connexion, quel que soit le rôle.

## Fichiers ajoutés / modifiés

**Backend**
- `prisma/schema.prisma` — nouveau modèle `AssistantDocument`
- `src/utils/embeddings.js` — client Voyage AI
- `src/utils/vectorStore.js` — recherche par similarité cosinus
- `src/utils/textBuilders.js` — génération des textes à indexer
- `src/utils/scope.js` — calcul des projets visibles par rôle
- `src/utils/claude.js` — appel à l'API Claude (RAG)
- `src/utils/reindex.js` — réindexation complète (`npm run reindex`)
- `src/utils/indexHook.js` — indexation sûre (n'interrompt jamais une requête)
- `src/routes/assistant.js` — `POST /api/assistant/chat`, `POST /api/assistant/reindex`
- `src/server.js` — montage de la route `/api/assistant`
- `src/routes/{projets,taches,equipes,rapports,inspections}.js` — hooks d'indexation
  automatique après chaque écriture

**Frontend**
- `src/components/AssistantChat.tsx` — widget de chat flottant
- `src/components/Layout.tsx` — intégration du widget pour les 4 rôles

## Limites connues

- La recherche vectorielle compare la question à **tous** les documents accessibles à
  l'utilisateur (brute-force en JavaScript). C'est très rapide jusqu'à plusieurs
  milliers de documents ; au-delà, il faudra migrer vers un moteur vectoriel dédié
  (ex. pgvector) — seul `src/utils/vectorStore.js` serait à adapter.
- L'assistant ne modifie jamais de données : il est en lecture seule (pas d'actions,
  uniquement des réponses).
