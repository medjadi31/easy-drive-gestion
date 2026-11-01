# EASY DRIVE MANAGER — V12.2

Application de gestion de flotte Easy Drive (interface française, DA, thème noir et or).

## Modifications V12.2
- Correction de l'ouverture du formulaire de modification depuis Planning : recherche de réservation compatible avec les identifiants texte/nombre.
- Le formulaire de réservation préremplit les données existantes et sélectionne le statut actuel (Confirmée, En attente, Annulée).
- Enregistrement du statut et des modifications dans la base partagée Supabase.
- Ajout des actions Modifier et Supprimer pour chaque dépense.
- Résumé financier du mois en cours sur le tableau de bord.
- Nouveau Bilan financier avec dates personnalisées, revenus des réservations confirmées, réservations en attente, dépenses, maintenance, total des sorties et solde net, avec tableaux détaillés.

## Déploiement
Remplacer les fichiers de l'application dans le dépôt GitHub Pages par le contenu de ce dossier. Conserver les fichiers de logo et d'icône.

## Important — calcul du bilan
Les revenus sont calculés à partir du montant total des réservations confirmées dont la date de remise est dans la période choisie. Les réservations en attente et annulées ne sont pas incluses dans les recettes. Les coûts du module Maintenance sont ajoutés aux dépenses courantes pour calculer les sorties totales. Pour éviter un double comptage, ne pas saisir une même facture de maintenance à la fois dans Dépenses et dans Maintenance.

Les données sont sauvegardées dans localStorage et synchronisées via Supabase lorsque l'utilisateur est connecté.
