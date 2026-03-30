# Problème : Calendrier des échéances vide après import Excel

## Contexte
J'ai une application React/Vite avec une page d'import Excel et un dashboard avec un calendrier hebdomadaire des échéances. Après avoir importé un fichier Excel contenant des dates d'échéance, le calendrier reste vide.

## Structure de l'application
- **PageImports.jsx** : Gère l'import Excel avec mapping automatique des colonnes
- **App.jsx** : Contient le dashboard avec le calendrier hebdomadaire
- **config.js** : Contient les données mockées et la configuration

## Problème spécifique
Le calendrier "📅 Calendrier des échéances — Semaine courante" n'affiche aucune donnée, même après import réussi d'un fichier Excel contenant des dates d'échéance.

## Ce qui a été essayé
1. **Vérification du parsing de dates** : Fonction `parseDateToTime` améliorée pour supporter plus de formats
2. **Vérification du filtrage** : Ajout d'un indicateur visuel quand le calendrier est filtré par projet
3. **Debug activé** : Logs ajoutés pour tracer le flux des données

## Données attendues
- Le calendrier devrait afficher les pièces ayant des dates d'échéance dans la semaine courante (lundi au vendredi)
- Format de dates supporté : `yyyy-MM-dd`, `dd/MM/yyyy`, `dd/MM/yyyy HH:mm:ss`, etc.
- Filtrage par projet dans le graphique ne devrait pas affecter le calendrier

## Tâche
Analyser le code et identifier pourquoi le calendrier reste vide malgré des données importées avec des dates d'échéance valides. Corriger le problème pour que le calendrier affiche correctement les échéances de la semaine courante.

## Fichiers clés à examiner
- `src/App.jsx` : Fonction `parseDateToTime`, logique du calendrier, gestion des données importées
- `src/PageImports.jsx` : Mapping des colonnes Excel, validation des données
- `src/config.js` : Format des données mockées

## Logs de debug disponibles
Des console.log ont été ajoutés pour tracer :
- Les données importées et leur format
- Le calcul de la semaine courante
- Le filtrage des données dans le calendrier</content>
<parameter name="filePath">c:\Users\Othma\OPERIXX\OPERIXV2\CALENDAR_ISSUE_PROMPT.md