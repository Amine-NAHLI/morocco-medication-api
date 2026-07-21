# Morocco Medication API

API REST Node.js/PostgreSQL pour consulter et administrer un référentiel de médicaments marocains, prix, substances actives, fabricants, organismes, régimes, remboursements et sources officielles.

## Architecture

`Express routes -> controllers -> services/repositories -> Prisma -> PostgreSQL`.
Les consultations sont publiques. Les écritures, imports et synchronisations exigent un JWT d'administrateur.

## Installation locale

1. Installez Node.js 20+ et PostgreSQL.
2. Copiez `.env.example` vers `.env`, puis fournissez une URL PostgreSQL locale et deux secrets JWT différents d'au moins 32 caractères.
3. Exécutez `npm install`, `npx prisma generate`, puis appliquez les migrations sur votre base locale avec `npx prisma migrate deploy`.
4. Lancez `npm run dev` et ouvrez `http://localhost:3000/api/docs`.

Ne lancez jamais `prisma migrate reset` sur une base partagée ou distante. Aucun seeder ni utilisateur par défaut n'est fourni.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `PORT` | Port HTTP, défaut 3000 |
| `NODE_ENV` | `development`, `test` ou `production` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Secrets distincts des JWT |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Durées (`15m`, `7d`, etc.) |
| `CORS_ORIGINS` | Origines séparées par virgule |
| `MAX_UPLOAD_SIZE_BYTES` | Taille maximale XLSX, défaut 5 MiB |
| `SYNC_SCHEDULER_ENABLED` | Active le scheduler local CNOPS |
| `SYNC_SCHEDULER_INTERVAL_MS` | Fréquence CNOPS locale |

## API et authentification

Les endpoints sont préfixés par `/api/v1`. Inscription publique : `POST /auth/register`; elle crée toujours un rôle `USER`. Connexion : `POST /auth/login`. Les tokens d'accès vont dans `Authorization: Bearer <token>`; les refresh tokens sont hachés en base et tournent à chaque renouvellement. Seul un `ADMIN` peut promouvoir un utilisateur via `PATCH /auth/users/{id}/role`.

```bash
curl -X POST http://localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.test","password":"un-mot-de-passe-fort"}'
curl 'http://localhost:3000/api/v1/medications?search=paracetamol&ingredient=paracetamol&limit=20'
```

Catalogue : `medications`, `manufacturers`, `categories`, `active-ingredients`, `organizations`, `regimes`, `reimbursements`, `medication-prices`, `sources`, `official-documents` et `sync-jobs`. Les listes acceptent `page`, `limit`, `search`, `sortBy` et `order`; les médicaments ajoutent fabricant, catégorie, DCI, statut, générique, organisme et remboursable.

## Import et synchronisation

`POST /api/v1/import/excel` accepte uniquement un XLSX administrateur, vérifie l'archive ZIP et produit un `SyncJob` avec compteurs. La synchronisation CNOPS est déclenchée par `POST /api/v1/sync/cnops`; elle utilise le catalogue CKAN de data.gov.ma, contrôle l'URL, les redirections, le DNS, les délais, la taille et le hash du fichier. CNSS et ANAM restent explicitement non automatisables : aucun export structuré exploitable n'est présent dans ce dépôt.

Le scheduler est local, désactivé par défaut, non actif dans les tests et évite les doublons de synchronisation.

## Tests et qualité

`npm test` exécute uniquement les tests unitaires et HTTP : il ne démarre jamais PostgreSQL. `npm run test:coverage` produit `coverage/coverage-summary.json`.

Les tests PostgreSQL réels sont isolés dans `tests/db` et n'utilisent jamais `DATABASE_URL`. `npm run test:db` exige explicitement `TEST_DATABASE_URL` et échoue volontairement si elle est absente, distante, Neon, Supabase ou non locale. Cette protection interdit toute exécution accidentelle contre une base de développement ou de production.

Commande locale recommandée :

```bash
npm run test:all:local
```

`npm run test:db:local` démarre `docker-compose.test.yml`, attend le healthcheck PostgreSQL 16, injecte uniquement `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/morocco_medication_test`, applique les migrations, exécute les tests DB, puis arrête et supprime toujours le conteneur. Les données sont stockées en `tmpfs`, sans volume persistant. Copiez `.env.test.example` vers `.env.test` seulement pour une exécution manuelle ; `.env.test` est ignoré par Git.

- `npm run test:db:up` : démarre PostgreSQL local et attend son healthcheck.
- `npm run test:db` : exécute les tests DB contre une `TEST_DATABASE_URL` fournie explicitement.
- `npm run test:db:down` : arrête et supprime la base de test locale.
- `npm run test:db:local` : orchestre la base locale temporaire et les tests DB.
- `npm run test:all` : exécute les tests standards puis des tests DB configurés manuellement.
- `npm run test:all:local` : exécute les tests standards puis la base PostgreSQL locale temporaire.

Aucune de ces commandes n'utilise l'URL Neon de `.env`. Le lanceur local ne transmet que son URL PostgreSQL locale de test. Ne lancez jamais `prisma migrate reset` sur une base partagée ou distante.

`npm test -- --runInBand` exécute les tests unitaires et HTTP. `npm run test:coverage` produit `coverage/coverage-summary.json`. Les tests PostgreSQL réels sont isolés dans `tests/db` : définissez `TEST_DATABASE_URL` vers une base **locale** nommée `morocco_medication_test` (ou suffixée), puis lancez `npm run test:db`. Ce script refuse Neon, Supabase et toute hôte distante, remplace `DATABASE_URL` seulement dans son propre processus et applique `prisma migrate deploy` sur cette base de test. `npm run test:all` enchaîne les suites rapides puis la suite PostgreSQL. Ne lancez jamais ces tests contre une base de développement ou de production.

## Sécurité

Helmet, CORS configurable, rate limiting auth, bcrypt, RBAC, payloads limités, validation des entrées, erreurs Prisma mappées et upload XLSX contrôlé sont actifs. Ne journalisez jamais tokens ou mots de passe.

## Structure

`src/routes` expose HTTP, `src/controllers` orchestre les réponses, `src/services` porte le métier, `src/repositories` encapsule Prisma, `prisma` contient le schéma et les migrations, `tests` contient les suites Jest.
