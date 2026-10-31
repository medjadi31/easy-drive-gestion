# EASY DRIVE MANAGER
Application web de gestion de flotte et de location pour Easy Drive.

## Installation / publication
Décompresser le dossier et publier les fichiers `index.html`, `style.css` et `app.js` à la racine du dépôt GitHub Pages.

## Fonctions
- Gestion des véhicules, clients, réservations, dépenses et maintenance.
- Calcul de location par périodes de 24 heures : toute fraction de période entamée est facturée comme une journée (minimum 1 jour).
- Saisie de l'heure de remise et de retour du véhicule.
- Contrôle des chevauchements à la minute près : une nouvelle location peut commencer à l'heure exacte du retour précédent.
- Planning annuel : liste chronologique de toutes les réservations sur les 12 prochains mois par défaut, avec filtre libre par dates, nom du client et heures.
- Recherche des véhicules disponibles sur une période choisie.

## Données
Les données sont enregistrées dans le `localStorage` du navigateur de l'appareil. Cette version ne synchronise pas encore les données entre plusieurs téléphones ou utilisateurs et ne constitue pas une sauvegarde cloud.


Fonctions de gestion des réservations : modifier les informations, changer de véhicule avec contrôle de disponibilité, supprimer après confirmation. Depuis Disponibilités, le bouton « Réserver » ouvre directement une nouvelle réservation avec le véhicule et la période préremplis.

- Disponibilités sous forme de planning horizontal : voitures en lignes, dates en colonnes, réservations avec nom du client et heures, bouton Réserver pour les voitures libres sur toute la période.


Version V6 : Planning affiche automatiquement une vue Gantt de 15 jours avec navigation précédente/suivante. Disponibilités conserve une recherche par période et une liste de véhicules disponibles avec réservation directe.

Version V8 : les réservations du planning sont affichées sous forme de cartes compactes avec client, dates et heures. Appuyer sur une carte ouvre le dossier de réservation pour modification.

Version V9 : intégration du logo officiel Easy Drive dans l'en-tête latéral, l'en-tête principal sur mobile et comme favicon du site.

Version V10 : logo horizontal officiel dans l'interface et logo circulaire en icône du site.
