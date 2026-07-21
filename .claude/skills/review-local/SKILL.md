---
name: review-local
description: >
  Local pre-commit review of uncommitted or branch-local changes to
  auto-tab-sort: evidence-grounded findings anchored to verbatim quotes,
  single-pass checklist (no multi-agent fan-out — the codebase is a single
  ~225-line file). Keywords: review my changes, code review, pre-commit
  review, before commit, before push.
---

> Version simplifiée d'un skill de revue multi-agents (fan-out par
> perspective + jury adversarial) — disproportionnée pour un repo d'un seul
> fichier maintenu solo. Gardé : l'ancrage par preuve verbatim et le
> checklist de fond ; retiré : le fan-out multi-perspective et le jury.

## Quand l'utiliser

Avant un commit/push, sur les changements non commités ou sur la branche
courante vs `main`.

## Méthode

1. **Scope** : `git status --porcelain`, puis `git diff` (working tree) ou
   `git diff main...HEAD` (branche).
2. **Lecture** : lire chaque hunk modifié dans `background.js` (et
   `background.test.js` si les tests changent).
3. **Ancrage par preuve** : chaque finding cite le code verbatim
   (`fichier:ligne`) — jamais une paraphrase. Si la preuve ne peut pas être
   localisée verbatim, ne pas la reporter.
4. **Checklist** :
   - Cas limites : `null`/`undefined`/tableau vide, `tab.url` absent
     (`pendingUrl` non défini), domaine invalide.
   - Races : callbacks `chrome.tabs.on*` concurrents avec `scheduleSort`,
     état partagé (`isSorting`, `sortAgain`) correctement gardé.
   - Erreurs : chaque `catch` logue avec un message utile
     (`console.warn('auto-tab-sort: ...')`), pas de `catch` vide.
   - Pas de sur-abstraction (YAGNI) introduite pour un seul appelant.
5. **Rapport** : findings classés `[structural]` (à corriger maintenant ou
   ticket avec accord explicite) vs `[cosmetic]` (une ligne, pas de ticket) —
   cf. `rules/session-focus.md`.

## Ce que ce skill ne fait pas

Pas de jury adversarial, pas de fan-out multi-agents — si ce repo grossit
significativement (plusieurs modules, surface auth/sécurité réelle),
reconsidérer la version complète multi-perspective de ce skill (cf.
dépôt source `awesome-claude-config/skills/review-local`).
