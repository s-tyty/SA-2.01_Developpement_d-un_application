# SAE-2.01 - Développement d'une application

## Composition de l'équipe 

### GROUPE : 108

| NOM Prénom |
|-------|
| SITTININAE Aditya |
| MOISANT Lény |
| TCHOUANGOU Louis |
| MUHAMMAD MAJHARUL ISLAM Shafi |


## Description du projet

Application web de jeu de Memory développée en JavaScript, HTML et CSS.  
Le joueur doit retrouver toutes les paires de cartes avant que le chronomètre n'atteigne zéro.  
Chaque partie est enregistrée sur un serveur distant via une API REST.


## Fonctionnalités implémentées

### Formulaire de démarrage
- Saisie du pseudo joueur (obligatoire, 30 caractères max)
- Choix du niveau de difficulté : Facile / Normal / Moyen / Difficile
- Choix de la collection d'images : Animaux / Fruits / Voitures
- Validation côté client avant soumission
### Plateau de jeu
- Affichage de 8, 10, 12 ou 16 cartes selon le niveau de difficulté
- Cartes mélangées aléatoirement à chaque partie 
- Retournement des cartes au clic
- Détection automatique des paires : les cartes identiques restent visibles
- Les cartes non-appariées se recachent après 1 seconde
- Compteur de paires trouvées mis à jour en temps réel
- Chronomètre dégressif (2 min / 2:30 min / 3 min / 4 min selon le niveau)
- Bouton d'abandon avec confirmation
### Fin de partie
- Fin automatique si toutes les paires sont trouvées ou si le temps s'écoule
- Fin manuelle via le bouton d'abandon
- Message de résultat (victoire, temps écoulé, abandon)
- Retour automatique au formulaire de démarrage
### Communication serveur
- Création de partie : envoi du pseudo et du niveau → récupération de l'identifiant de partie
- Fin de partie : envoi du nombre de paires restantes à trouver
---
## Architecture du projet

```
memory/
├── index.html                  # Structure HTML de l'application
├── css/
│   └── style.css               # Styles de l'application
├── js/
│   ├── app.js                  # Point d'entrée — gestion du formulaire
│   ├── Game.js                 # Logique complète du jeu
│   ├── DOMManager.js           # Manipulation du DOM (affichage)
│   ├── ApiService.js           # Appels API (création et fin de partie)
│   ├── ImageCollection.js      # Collections d'images disponibles
│   ├── config.js               # Configuration (URL du serveur)
│   └── types.js                # Documentation des types (JSDoc)
└── assets/
    └── images/
        ├── animals/            # 8 images d'animaux
        ├── fruits/             # 8 images de fruits
        ├── cars/               # 8 images de voitures
        └── mask1.jpg           # Dos des cartes
```

### Description des modules

**`app.js`** — Point d'entrée de l'application. Écoute la soumission du formulaire, appelle l'API de création de partie puis démarre le jeu.

**`Game.js`** — Contient toute la logique métier : configuration des niveaux, préparation et mélange des cartes, gestion des clics, vérification des paires, chronomètre, fin de partie.

**`DOMManager.js`** — Responsable de l'affichage : création des cartes dans le DOM, mise à jour du chronomètre et du compteur, affichage et masquage des zones, construction de l'en-tête de jeu.

**`ApiService.js`** — Centralise les deux appels au serveur distant : création de partie (`POST /api/game`) et envoi du résultat (`POST /api/game/:id`).

**`ImageCollection.js`** — Déclare les trois collections d'images (animaux, fruits, voitures) avec leurs chemins.

**`config.js`** — Exporte l'URL de l'API (`https://memory.iuthub.fr/api/game`).

**`types.js`** — Définit les types JSDoc utilisés dans le projet (`Image`, `Collection`, `ImagesCollection`).
 
---

## API serveur

| Action | Méthode | Endpoint | Corps |
|---|---|---|---|
| Créer une partie | `POST` | `/api/game` | `{ name, difficulty }` |
| Terminer une partie | `POST` | `/api/game/:id` | `{ nombreCoupsRestant }` |

Le champ `difficulty` est envoyé sous forme numérique : `2` (facile), `3` (moyen), `4` (difficile).
 
---

## Niveaux de difficulté

| Niveau | Cartes | Paires | Temps |
|---|---|---|---|
| 😊 Facile | 8 | 4 | 2 minutes |
| 🙂 Normal | 10 | 5 | 2 minutes 30 |
| 🤔 Moyen | 12 | 6 | 3 minutes |
| 😈 Difficile | 16 | 8 | 4 minutes |
 
---

## Collections d'images

| Collection | Contenu | Nombre d'images |
|---|---|---|
| 🐾 Animals | Animaux divers | 8 |
| 🍎 Fruits | Fruits variés | 8 |
| 🏎️ Cars | Voitures | 8 |
 
---


## Fonctionnalités prévues 


### 1. Modal de fin de partie
Au lieu d'une simple `alert()`, un modal HTML s'affiche à la fin de chaque partie avec :
- Une icône selon le résultat (🎉 victoire, ⏰ temps écoulé, 🏳️ abandon)
- Le score final, le nombre de paires trouvées et le temps restant
- Un bouton **Rejouer** pour relancer une partie immédiatement avec les mêmes paramètres
- Un bouton **Menu** pour revenir au formulaire de démarrage
### 2. Animations des cartes 
- Effet de retournement 3D CSS (`rotateY`) au clic sur chaque carte
- Animation d'apparition en cascade lors du chargement du plateau
- Animation de rebond sur les deux cartes lorsqu'une paire est trouvée
- Bordure verte sur les cartes appariées
### 3. Système de score
Un score est calculé à chaque fin de partie selon la formule :
- (paires trouvées × 100 + temps restant × 2) × multiplicateur de difficulté

| Niveau | Multiplicateur |
|---|---|
| 😊 Facile | ×1 |
| 🙂 Normal | ×1,25 |
| 🤔 Moyen | ×1,5 |
| 😈 Difficile | ×2 |

Le score est affiché dans le modal de fin et sauvegardé dans l'historique.

### 4. Historique des parties (localStorage)
- Les 5 dernières parties jouées sont sauvegardées dans le `localStorage` du navigateur
- Chaque entrée contient : pseudo, niveau, score, paires trouvées et temps restant
- L'historique s'affiche automatiquement sous le formulaire de démarrage à chaque visite
### 5. Barre de progression du chronomètre
- Une barre visuelle s'affiche sous l'en-tête de jeu et se vide au fil du temps
- Elle change de couleur automatiquement : **verte** (> 50 %), **orange** (25–50 %), **rouge** (< 25 %) avec clignotement
- Le texte du chronomètre clignote également en rouge sous les 30 secondes
### 6. Responsive mobile
- La grille de jeu passe automatiquement en 2 colonnes sur les écrans de moins de 600 px
- L'en-tête de jeu et le modal s'adaptent pour rester lisibles sur téléphone
### 7. Mode Sombre
- Création d'un bouton qui permet de basculer les couleurs du jeu en sombre ou clair selon l'envie de l'utilisateur
### 8. Mode Développeur
- Activation via le raccourci clavier secret `Ctrl + Shift + X` lorsque la partie est lancée
- Retourne et révèle instantanément toutes les cartes du plateau pendant 2 secondes
- Sécurisé contre le spam : le plateau est verrouillé pendant la révélation pour éviter les clics abusifs
- Conserve l'état des cartes que le joueur avait déjà retournées manuellement avant d'activer la triche


