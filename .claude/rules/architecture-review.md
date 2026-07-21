# Second Opinion (revue croisée avant décision finale)

> Adapté — la mention "same-vendor different tier" a été gardée comme
> option, pas comme prérequis : ce repo est un projet solo, l'important est
> qu'un second regard existe, pas la marque du modèle.

## Déclencheur

- Un plan touchant plusieurs zones du code, ou changeant un contrat public
  (permissions `manifest.json`, forme de l'état stocké en
  `storage.session`), avant de le considérer final.
- Après 2-3 tentatives de débogage infructueuses, avant de dire « je ne
  trouve pas ».
- Une décision algorithmique ad hoc prise en cours d'implémentation (ex. le
  hash de couleur par domaine dans `colorForDomain`, la logique de
  réconciliation des groupes existants dans `sortWindow`) qui ne passe
  jamais par un plan formel.

## Mécanisme

- Lancer un sous-agent dédié, **lecture seule** (pas d'Edit/Write), avec le
  plan/la décision et la question à évaluer — voir `agents/second-opinion.md`.
- Annoncer explicitement dans la réponse qu'un second avis est demandé.
- En cas de désaccord, présenter les deux perspectives — ne jamais trancher
  silencieusement en faveur de l'une.

## Ce que ça ne remplace pas

Un second avis du même modèle/vendeur reste un complément, pas un substitut à
une revue par un outil/modèle réellement indépendant sur des sujets sensibles
(permissions Chrome, opération irréversible) — mais c'est rare dans un repo
de cette taille.
