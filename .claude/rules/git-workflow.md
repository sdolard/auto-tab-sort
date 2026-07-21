# Git Workflow — auto-tab-sort

> Adapté d'une méthodologie portée sur un monorepo avec commitlint/
> release-please — ce repo n'utilise ni l'un ni l'autre : les releases se
> font par tag manuel `vX.Y.Z`, vérifié en CI (`.github/workflows/release.yml`
> compare le tag à `version` dans `manifest.json`) puis publié via
> `softprops/action-gh-release` avec `generate_release_notes: true`. Seul le
> squelette générique du principe source a été conservé.

## Conventional Commits (léger, sans tooling)

```
<type>(<scope>): <description>
```

Types courts et standards (`feat`, `fix`, `docs`, `style`, `refactor`,
`test`, `chore`). Pas de liste de scopes imposée ni de linter — ce repo est
trop petit pour justifier un `commitlint`. Le bénéfice principal ici : de
meilleurs messages de commit alimentent les release notes auto-générées.

## Commits atomiques

Un commit = un changement logique. Séparer les fixes des features. Chaque
commit devrait pouvoir passer `npm test` indépendamment.

## Pas d'autonomie push/PR accordée

Aucun mécanisme de revue locale gatée n'est en place dans ce repo — ne pas
s'auto-accorder d'autonomie de push/PR sans confirmation explicite de
l'utilisateur à chaque fois, tant qu'un tel gate n'existe pas.
