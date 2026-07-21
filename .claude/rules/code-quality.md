# Code Quality — auto-tab-sort

> Adapté d'une méthodologie portée pour une stack Next.js/TypeScript — ce repo
> est du JavaScript vanilla (ES modules), sans build, sans TypeScript, sans
> ESLint configuré. Seuls les principes stack-agnostiques ont été conservés.

## Fix all errors surfaced during a check run, not just the ones you caused

En lançant `npm test`, corriger toutes les erreurs/échecs rencontrés — y
compris ceux préexistants que le changement en cours n'a pas causés. Si un
échec préexistant n'est pas trivial à corriger dans le scope actuel, le
signaler explicitement et demander avant de le laisser de côté.

## Une frontière de langue unique entre code/logs et texte utilisateur

Ce repo a déjà cette convention en pratique — la formaliser pour ne pas la
perdre au fil des sessions :

- Les identifiants (fonctions, variables) et les `console.warn`/`console.log`
  restent en anglais.
- Les commentaires explicatifs de logique métier peuvent rester en français
  (convention déjà suivie dans `background.js`).
- Le texte visible par l'utilisateur (nom de l'extension, description,
  tooltip) passe exclusivement par `_locales/{en,fr}/messages.json` — jamais
  une chaîne française codée en dur dans `background.js`, jamais une chaîne
  anglaise qui casserait la locale `fr`.

## Nommage (JS vanilla, pas de composants/hooks)

| Type | Convention |
|---|---|
| Fonctions/variables | `camelCase` |
| Constantes | `SCREAMING_SNAKE_CASE` |

## Invariants : outillage vs prose (garde-fou de proportionnalité)

Le principe "tout invariant important mérite d'être automatisé" reste vrai en
théorie, mais ce repo n'a **aucun linter configuré** aujourd'hui. Ne pas
introduire ESLint/une CI supplémentaire uniquement pour ce principe — cela
sur-outillerait un repo à un seul fichier source. Revisiter ce choix
seulement si une régression concrète et répétée le justifie (ex. la même
erreur de frontière de langue réapparaît plusieurs fois).
