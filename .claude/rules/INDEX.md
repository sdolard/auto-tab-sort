# Index des rules

Index humain — pas un mécanisme de chargement natif. Origine :
[sdolard/awesome-claude-config](https://github.com/sdolard/awesome-claude-config),
triée et adaptée au stack de ce repo (extension Chrome, JS vanilla, vitest,
pas de framework front).

| Fichier | Sujet |
|---|---|
| `development.md` | Discipline diagnostic/optimisation, interdiction des tests written-to-pass |
| `test-strategy.md` | Quand écrire le test (avant/après) selon la nature du code |
| `test-generation.md` | Génération de tests contract-first (pas depuis l'implémentation) |
| `session-focus.md` | Garde-fou anti-dérive de scope, triage cosmetic vs structural |
| `analysis-and-audit.md` | Méthodologie d'audit/revue transverse |
| `code-quality.md` | Nommage, frontière de langue code/logs vs i18n, proportionnalité de l'outillage |
| `git-workflow.md` | Conventional Commits légers, commits atomiques, pas d'autonomie push/PR |
| `mutation-testing.md` | Discipline mutation-testing sans outil dédié (4 questions contract-first) |
| `architecture-review.md` | Quand demander un second avis (`agents/second-opinion.md`) |

Non retenus de la source (hors sujet pour ce stack) : `llm-configuration.md`,
`measurement-cost.md`, `promoted-diagrams.md`, `prompt-engineering.md` —
aucun appel LLM ni pipeline CI complexe dans ce repo.
