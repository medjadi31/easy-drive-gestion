# EASY DRIVE MANAGER – V12 Cloud

Version connectée à Supabase avec authentification par e-mail/mot de passe, stockage partagé dans `public.app_state` et synchronisation temps réel.

## Déploiement
1. Remplacer les fichiers du dépôt GitHub Pages par le contenu de ce dossier.
2. Conserver les trois images du logo à la racine du site.
3. Les utilisateurs se connectent avec les comptes créés dans Supabase Authentication > Users.

## Sécurité
- Le navigateur utilise uniquement la clé Supabase Publishable.
- Ne jamais intégrer une clé `sb_secret_...` ou `service_role` dans le site.
- La table `public.app_state` doit avoir RLS activé et les politiques pour `authenticated` créées par le script SQL d'installation.
- Chaque compte authentifié dispose des mêmes droits de lecture et modification des données de flotte.

## Données
Au premier login, si le cloud est encore vide, les données locales présentes sur cet appareil sont transférées vers Supabase. Si le cloud contient déjà des données, celles du cloud deviennent la source partagée. Garder une copie de sauvegarde locale avant le premier déploiement.
