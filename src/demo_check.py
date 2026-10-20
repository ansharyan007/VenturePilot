#!/usr/bin/env python3
"""Recompute NovaEdge indicators from ``src/data/demoStartup.ts``.

This standard-library script parses the static demo fixture rather than copying
its numeric inputs. Its formulae mirror ``src/utils/calculations.ts`` and
``src/utils/journey.ts``. Run: ``python3 src/demo_check.py``.
"""
from __future__ import annotations

import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "src/data/demoStartup.ts"


def section(source: str, name: str, next_name: str) -> str:
    match = re.search(rf"\n  {re.escape(name)}:\s*(.*?)(?=\n  {re.escape(next_name)}:)", source, re.S)
    if not match:
        raise ValueError(f"Could not parse {name!r} from {DEMO}")
    return match.group(1)


def number(source: str, name: str) -> int:
    match = re.search(rf"\b{re.escape(name)}:\s*(\d+)", source)
    if not match:
        raise ValueError(f"Could not read {name!r}")
    return int(match.group(1))


def display(value: float | int, percent: bool) -> str:
    return (f"{value:.2f}%" if isinstance(value, float) else f"{value}%") if percent else f"{value:,.0f}"


source = DEMO.read_text(encoding="utf-8")
for path, marker in ((ROOT / "src/utils/calculations.ts", "calculateFinance"),
                     (ROOT / "src/utils/journey.ts", "buildStartupJourney")):
    if marker not in path.read_text(encoding="utf-8"):
        raise RuntimeError(f"Expected {marker} in {path}")

# Read the mapped static literals in the demo fixture; no demo number is copied here.
bom_source = section(source, "bom", "manufacturing")
bom_rows = re.findall(r"\['[^']+',\s*(\d+),\s*(\d+),", bom_source)
if not bom_rows:
    raise ValueError("No BOM rows found")
bom = sum(max(0, int(qty)) * max(0, int(cost)) for qty, cost in bom_rows)

financial_source = section(source, "financials", "team")
financial = {key: number(financial_source, key) for key in (
    "sellingPrice", "manufacturingCost", "packaging", "logistics", "employeeExpenses",
    "rent", "marketing", "technology", "compliance", "otherExpenses", "monthlySales",
)}
manufacturing_source = section(source, "manufacturing", "supplyChain")
manufacturing = {key: number(manufacturing_source, key) for key in (
    "productionLines", "unitsPerHour", "hoursPerDay", "daysPerMonth", "utilization",
)}


def calculate_finance(packaging: int) -> dict[str, float | int]:
    """Exact app formula, with the selected packaging input."""
    unit_cost = bom + financial["manufacturingCost"] + packaging + financial["logistics"]
    contribution = financial["sellingPrice"] - unit_cost
    expenses = sum(financial[key] for key in (
        "employeeExpenses", "rent", "marketing", "technology", "compliance", "otherExpenses",
    ))
    revenue = financial["sellingPrice"] * financial["monthlySales"]
    return {
        "unit_cost": unit_cost, "contribution": contribution,
        "margin": contribution / financial["sellingPrice"] * 100 if financial["sellingPrice"] else 0,
        "revenue": revenue, "operating_profit": revenue - unit_cost * financial["monthlySales"] - expenses,
        "break_even": math.ceil(expenses / contribution) if contribution > 0 and expenses > 0 else 0,
        "expenses": expenses,
    }


theoretical = (manufacturing["productionLines"] * manufacturing["unitsPerHour"] *
               manufacturing["hoursPerDay"] * manufacturing["daysPerMonth"])
realistic = theoretical * min(100, max(0, manufacturing["utilization"])) / 100

# Reproduce the saved-workspace checks in buildStartupJourney(), deriving each
# condition from the fixture's fields and literals (not a pasted stage score).
compliance = section(source, "compliance", "financials")
team = section(source, "team", "risks")
risks = section(source, "risks", "roadmap")
distribution = section(source, "distribution", "compliance")
roadmap = section(source, "roadmap", "scaling")
scaling = section(source, "scaling", "conversations")
risk_scores = [(int(p), int(i)) for p, i in re.findall(r"\['[^']+',\s*'[^']+',\s*(\d+),\s*(\d+),", risks)]
checks = [
    ["problem:" in source, "targetCustomer:" in source and "customerPersona:" in source, "geographicMarket:" in source, "valueProposition:" in source],
    ["mvp:" in source, "technicalRequirements:" in source, len(re.findall(r"\['[^']+',\s*'[^']+'\]", section(source, "product", "bom"))) >= 3, "differentiators:" in source],
    [bool(bom_rows) and bom > 0, "High" in bom_source and "supplierType" in bom_source, "supplyChain:" in source, "dependencies:" in section(source, "supplyChain", "distribution") and "risks:" in section(source, "supplyChain", "distribution")],
    ["strategy: 'Not decided'" not in manufacturing_source, all(manufacturing[k] > 0 for k in ("productionLines", "unitsPerHour", "hoursPerDay", "daysPerMonth")), "qualityControl:" in manufacturing_source, "risks:" in manufacturing_source and number(manufacturing_source, "capitalRequirements") > 0],
    [bool(re.findall(r"\['[^']+',\s*'(?:High|Medium|Low)'", compliance)), "applicability:" in compliance, "owner:" in compliance, "evidenceNote:" in compliance or "sourceUrl:" in compliance, "status: 'Complete'" in compliance or "status: 'Not applicable'" in compliance],
    [financial["sellingPrice"] > 0, calculate_finance(financial["packaging"])["unit_cost"] > 0, calculate_finance(financial["packaging"])["contribution"] > 0, financial["monthlySales"] > 0 and calculate_finance(financial["packaging"])["expenses"] > 0, "initialCapital:" in financial_source],
    [bool(re.findall(r"\['[^']+',\s*\d+", team)), "hiringStatus" in team, "owner:" in risks and "mitigation:" in risks, not any(p * i >= 15 for p, i in risk_scores)],
    ["model:" in distribution and "stages:" in distribution, "dependencies:" in distribution and "risks:" in distribution, "launchTimeline:" in source, "timing" in roadmap and "description" in roadmap, "status: 'In progress'" in roadmap or "status: 'Complete'" in roadmap],
    ["scaling:" in source, "targetUnits" in scaling and "targetBudget" in scaling, "milestones:" in scaling, "gateStatus:" in scaling and "evidence:" in scaling],
]
readiness = sum(100 * sum(stage) / len(stage) for stage in checks) / len(checks)

# Paper values are comparison targets only, never recomputation inputs.
reported = {"bom": 31500, "unit_cost": 34550, "contribution": 10450, "margin": 23.22,
            "revenue": 6750000, "operating_profit": 217500, "break_even": 130,
            "capacity": 1659, "readiness": 78}
as_is = calculate_finance(financial["packaging"])
fixed = calculate_finance(0)  # Packaging is already a BOM line; remove its second charge.
rows = [
    ("BOM cost per unit (INR)", reported["bom"], bom, bom, False),
    ("Unit cost U (INR)", reported["unit_cost"], as_is["unit_cost"], fixed["unit_cost"], False),
    ("Contribution π (INR)", reported["contribution"], as_is["contribution"], fixed["contribution"], False),
    ("Gross margin g", reported["margin"], as_is["margin"], fixed["margin"], True),
    ("Revenue R (INR/month)", reported["revenue"], as_is["revenue"], fixed["revenue"], False),
    ("Operating profit (INR/month)", reported["operating_profit"], as_is["operating_profit"], fixed["operating_profit"], False),
    ("Break-even (units/month)", reported["break_even"], as_is["break_even"], fixed["break_even"], False),
    ("Realistic capacity (units/month)", reported["capacity"], round(realistic), round(realistic), False),
    ("Overall readiness ρ", reported["readiness"], round(readiness), round(readiness), True),
]

print(f"Read {len(bom_rows)} BOM lines from {DEMO.relative_to(ROOT)}.")
print("App formula adds financial packaging to BOM; the fixture also has a Packaging BOM row.")
print("Recomputed values remove only this second INR 500 packaging charge.")
print(f"Inferred fixture inputs: Q={financial['monthlySales']}; X={fixed['expenses']:,} INR/month.")
print(f"Capacity: theoretical={theoretical:,}; utilization={manufacturing['utilization']}%; exact realistic={realistic:.2f}.")
print(f"Readiness: nine journey stages; exact mean={readiness:.2f}% (whole-percent display).\n")
print(f"{'Indicator':34} {'Reported in paper':>18} {'As-is app':>14} {'D1 corrected':>14}  Status")
print("-" * 118)
for label, expected, as_is_value, corrected, is_percent in rows:
    paper_match = round(float(expected), 2) == round(float(as_is_value), 2)
    correction_changed = round(float(as_is_value), 2) != round(float(corrected), 2)
    if paper_match and correction_changed:
        status = "as-is matches paper; differs from paper only by D1"
    elif paper_match:
        status = "as-is matches paper"
    else:
        status = "OTHER DIFFERENCE: as-is app does not match paper"
    print(f"{label:34} {display(expected, is_percent):>18} {display(as_is_value, is_percent):>14} {display(corrected, is_percent):>14}  {status}")
