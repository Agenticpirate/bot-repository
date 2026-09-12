---
name: analyse-financiere
description: >
  Skill expert en analyse financière. À utiliser pour : calcul de ratios financiers
  (liquidité courante/rapide, autonomie financière, endettement, ROE, ROA, ROCE,
  marge nette, marge EBITDA, rotation des stocks, délai clients/fournisseurs).
  Interprétation selon normes Banque de France. Se déclenche sur : "ratios financiers",
  "liquidité", "solvabilité", "rentabilité", "ROE", "ROA", "ROCE", "endettement",
  "bilan financier", "analyse du bilan", "diagnostic financier".
  NE PAS utiliser pour : valorisation d'entreprise (méthodes DCF), notation de crédit officielle.
---

# Skill — Analyse Financière

> **Important :** Les ratios sont calculés à partir des données fournies.
> L'interprétation s'appuie sur les normes Banque de France — à adapter selon le secteur.

## Catégories de ratios

| Catégorie | Ratios | Ce qu'ils mesurent |
|-----------|--------|-------------------|
| Liquidité | Courante, rapide, immédiate | Capacité à payer les dettes CT |
| Solvabilité | Autonomie financière, endettement, capacité remboursement | Solidité financière LT |
| Rentabilité | ROE, ROA, ROCE, marge nette, marge EBITDA | Efficacité économique |
| Activité | Rotation stocks, délai clients, délai fournisseurs | Efficacité opérationnelle |

## Workflow

```python
from shared.fr_finance.analyse_financiere import tableau_ratios

bilan = {
    "actif_circulant": 500_000, "stocks": 150_000, "disponibilites": 80_000,
    "dettes_court_terme": 300_000, "capitaux_propres": 800_000,
    "total_actif": 1_500_000, "total_passif": 1_500_000,
    "dettes_financieres": 400_000, "creances_clients": 200_000,
}
cr = {
    "chiffre_affaires": 2_000_000, "resultat_net": 120_000,
    "ebit": 180_000, "ebitda": 250_000,
}
ratios = tableau_ratios(bilan, cr)
```

## Format de réponse chat

```
### Méthode
[Source des données + période]

### Tableau des ratios
| Ratio | Valeur | Norme | Interprétation |

### Interprétation globale
[Points forts, points faibles, axes d'amélioration]
```

## Ressources
- `references/ratios_normes.md`
- `scripts/analyser_bilan.py`
