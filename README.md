# Qui connaît mieux l'autre ? 💕

Jeu à deux joueurs, chacun depuis son propre appareil, avec un système de code de partie.

## Principe du jeu
1. Une personne crée une partie et obtient un code à 5 caractères.
2. L'autre personne rejoint avec ce code (ou le lien partagé).
3. À chaque question : chacun répond pour **soi-même**, puis devine ce que **l'autre** va répondre.
4. Un point est marqué à chaque fois qu'une prédiction est correcte.
5. Au bout de 12 questions, le score final départage qui connaît le mieux l'autre.

## Déploiement sur Vercel

### 1. Pousser le code sur GitHub
Crée un dépôt et pousse ce dossier dedans (ou importe directement le dossier zip dans Vercel).

### 2. Importer le projet sur Vercel
Sur [vercel.com](https://vercel.com) → **Add New → Project** → sélectionne le dépôt.
Le framework "Next.js" est détecté automatiquement, aucune configuration nécessaire.

### 3. Ajouter une base Redis (Upstash) — obligatoire
Le jeu doit partager l'état de la partie entre les deux joueurs (statut, réponses, scores).
Cela passe par une base **Upstash Redis**, gratuite, connectée depuis Vercel :

1. Dans ton projet Vercel → onglet **Storage**.
2. **Create Database** → choisis **Upstash** (ou "Marketplace Database Providers" → Upstash → Redis) selon ce qui s'affiche.
3. Choisis le plan gratuit, connecte la base à ton projet.
4. Vercel ajoute automatiquement les variables d'environnement `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` (ou `KV_REST_API_URL` / `KV_REST_API_TOKEN` selon l'intégration) — le code les lit déjà, rien à faire de plus.
5. Redéploie le projet (Vercel le fait généralement automatiquement après l'ajout de la base).

### 4. C'est en ligne
Ton URL Vercel (ex. `https://ton-projet.vercel.app`) est prête. Une personne crée une partie, obtient un code, l'envoie à l'autre (SMS, WhatsApp...), et vous jouez chacun sur votre écran.

## Développement local
```bash
npm install
# crée un fichier .env.local avec:
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...
npm run dev
```

## Personnaliser les questions
Modifie le tableau `QUESTIONS` dans `lib/questions.js`. Chaque question a un texte et 4 options à choix multiple. 12 questions sont tirées au hasard à chaque nouvelle partie.
