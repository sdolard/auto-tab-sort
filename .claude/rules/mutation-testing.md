# Mutation Testing — auto-tab-sort (version allégée)

> Aucun outil de mutation testing (Stryker, etc.) n'est installé — un seul
> fichier source (`background.js`) ne justifie pas cet investissement
> d'outillage. Gardé : la discipline de revue, sans le tool.

## Mutation score > coverage, comme état d'esprit (sans tooling)

Le % de couverture répond à « qu'est-ce qui s'est exécuté ? », pas à « un bug
serait-il détecté ? ». Garder cette distinction en tête lors de toute revue
de `background.test.js`, sans nécessiter un outil de mesure dédié.

## Contract-first : 4 questions pour toute modification de test

| # | Question | Si la réponse est… |
|---|---|---|
| 1 | Quel bug précis ce test attraperait-il ? | « aucun » → **le supprimer** |
| 2 | Survivrait-il à une réécriture complète de l'implémentation (même contrat, code différent) ? | non → **il est couplé aux détails d'implémentation, le réécrire** |
| 3 | Les cas limites sont-ils couverts (null, vide, bornes, mauvais type) ? | non → **les compléter** |
| 4 | Un mutant trivial (`>` → `>=`, `&&` → `||`) serait-il détecté ? | non → **l'assertion est trop faible** |

Revisiter l'adoption d'un vrai outil de mutation testing si `background.js`
grossit significativement au point de justifier l'investissement.
