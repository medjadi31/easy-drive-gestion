# EASY DRIVE MANAGER
Application web de gestion de flotte et de location pour Easy Drive.

## Installation / publication
Décompresser le dossier et publier les fichiers `index.html`, `style.css` et `app.js` à la racine du dépôt GitHub Pages.

## Fonctions
- Gestion des véhicules, clients, réservations, dépenses et maintenance.
- Calcul de location par périodes de 24 heures : toute fraction de période entamée est facturée comme une journée (minimum 1 jour).
- Saisie de l'heure de remise et de retour du véhicule.
- Contrôle des chevauchements à la minute près : une nouvelle location peut commencer à l'heure exacte du retour précédent.
- Planning avec nom du client et horaires de réservation dans les jours concernés.
- Recherche des véhicules disponibles sur une période choisie.

## Données
Les données sont enregistrées dans le `localStorage` du navigateur de l'appareil. Cette version ne synchronise pas encore les données entre plusieurs téléphones ou utilisateurs et ne constitue pas une sauvegarde cloud.
