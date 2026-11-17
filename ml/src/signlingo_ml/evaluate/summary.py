"""Aggregate experiment JSON files into tables (mean +- std over seeds).

All numbers come from `reports/experiments/*.json`; nothing is typed in by hand. The "best"
baseline is picked by VALIDATION macro-F1, never by test.
"""

import argparse
import json
from collections import defaultdict
from pathlib import Path

import numpy as np

from signlingo_ml.config import REPORTS

BASELINE_KEYS = ["val_macro_f1", "test_acc", "test_macro_f1", "latency_ms", "train_s"]
LEAK_KEYS = ["val_acc", "test_acc"]
CNN_KEYS = ["val_macro_f1", "val_acc", "params", "train_s"]


def load_records(directory: str | Path) -> list[dict]:
    return [
        json.loads(p.read_text(encoding="utf-8")) for p in sorted(Path(directory).glob("*.json"))
    ]


def _stat(values: list[float]) -> dict | None:
    if not values:
        return None
    arr = np.asarray(values, dtype=float)
    return {"mean": float(arr.mean()), "std": float(arr.std(ddof=1)) if len(arr) > 1 else None}


def _group(records, key_fn):
    groups = defaultdict(list)
    for r in records:
        groups[key_fn(r)].append(r)
    return groups


def aggregate(records: list[dict]) -> dict:
    baselines = []
    base = [r for r in records if r["kind"] == "baseline"]
    for (name, fset), rs in _group(base, lambda r: (r["model_name"], r["feature_set"])).items():
        row = {"model_name": name, "feature_set": fset, "n_seeds": len(rs)}
        for k in BASELINE_KEYS:
            row[k] = _stat([r["metrics"][k] for r in rs if k in r["metrics"]])
        row["run_ids"] = sorted(r["run_id"] for r in rs)
        baselines.append(row)
    baselines.sort(key=lambda r: -(r["val_macro_f1"] or {"mean": -1})["mean"])

    best = baselines[0] if baselines else None
    best_detail = None
    if best:  # confusions of the best-by-validation baseline (first seed), from its test run
        rec = next(r for r in base if r["run_id"] == best["run_ids"][0])
        best_detail = {
            "top_confusions": rec.get("top_confusions", [])[:5],
            "weakest_classes": sorted(rec.get("per_class_f1", {}).items(), key=lambda kv: kv[1])[
                :5
            ],
        }

    leak = []
    ls = [r for r in records if r["kind"] == "leakage_study"]
    for strat, rs in _group(ls, lambda r: r["split_strategy"]).items():
        row = {"split_strategy": strat, "n_seeds": len(rs)}
        for k in LEAK_KEYS:
            row[k] = _stat([r["metrics"][k] for r in rs if k in r["metrics"]])
        d = [r.get("diagnostics", {}) for r in rs]
        row["val_test_gap"] = _stat([x["val_test_gap"] for x in d if "val_test_gap" in x])
        row["nn_val_to_train"] = _stat([x["nn_dist_val_to_train"]["median"] for x in d])
        row["nn_test_to_train"] = _stat(
            [x["nn_dist_test_to_train"]["median"] for x in d if "nn_dist_test_to_train" in x]
        )
        leak.append(row)

    def cnn_rows(kind: str, keys: list[str], dataset: str = "sign_mnist") -> list[dict]:
        rs_all = [
            r
            for r in records
            if r["kind"] == kind
            and r.get("dataset") == dataset
            and r.get("hyperparams", {}).get("config")
        ]
        rows = []
        for tag, rs in _group(rs_all, lambda r: r["hyperparams"]["config"]).items():
            row = {"config": tag, "n_seeds": len(rs)}
            for k in keys:
                row[k] = _stat([r["metrics"][k] for r in rs if k in r["metrics"]])
            row["best_epoch"] = _stat(
                [r["hyperparams"]["best_epoch"] for r in rs if "best_epoch" in r["hyperparams"]]
            )
            rows.append(row)
        rows.sort(key=lambda r: (-(r["val_macro_f1"] or {"mean": -1})["mean"], r["config"]))
        return rows

    cnn_sweep = cnn_rows("ablation", CNN_KEYS)
    cnn_main = cnn_rows("main", CNN_KEYS + ["test_acc", "test_macro_f1"])
    lm_sweep = cnn_rows("ablation", CNN_KEYS, "landmarks")
    lm_main = cnn_rows("main", CNN_KEYS + ["test_acc", "test_macro_f1"], "landmarks")
    cmp_ = None
    if cnn_main and best and cnn_main[0]["test_macro_f1"] and best["test_macro_f1"]:
        a, b = cnn_main[0]["test_macro_f1"], best["test_macro_f1"]
        stds = [s for s in (a["std"], b["std"]) if s is not None]
        diff = a["mean"] - b["mean"]
        cmp_ = {
            "cnn_config": cnn_main[0]["config"],
            "baseline": f"{best['model_name']} ({best['feature_set']})",
            "cnn_test_macro_f1": a,
            "baseline_test_macro_f1": b,
            "difference": diff,
            "exceeds_seed_noise": (diff > 2 * max(stds)) if stds else None,
            "rule": "difference > 2 x the larger seed std (heuristic, not a significance test)",
        }
    return {
        "baselines": baselines,
        "best_by_val": best,
        "best_detail": best_detail,
        "leakage": leak,
        "cnn_sweep": cnn_sweep,
        "cnn_main": cnn_main,
        "lm_sweep": lm_sweep,
        "lm_main": lm_main,
        "cnn_vs_baseline": cmp_,
    }


def _fmt(s: dict | None, digits: int = 3) -> str:
    if s is None:
        return "-"
    return f"{s['mean']:.{digits}f}" + (f" ± {s['std']:.{digits}f}" if s["std"] is not None else "")


def render_markdown(agg: dict) -> str:
    out = ["## Baselines (group split, fixed untuned hyper-parameters)", ""]
    out += [
        "| Model | Features | Seeds | Val macro-F1 | Test acc | Test macro-F1 | ms/img | Train s |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for r in agg["baselines"]:
        out.append(
            f"| {r['model_name']} | {r['feature_set']} | {r['n_seeds']} | {_fmt(r['val_macro_f1'])}"
            f" | {_fmt(r['test_acc'])} | {_fmt(r['test_macro_f1'])} | {_fmt(r['latency_ms'], 3)}"
            f" | {_fmt(r['train_s'], 1)} |"
        )
    if agg["best_by_val"]:
        b = agg["best_by_val"]
        out += ["", f"Best by validation macro-F1: **{b['model_name']} ({b['feature_set']})**."]
        det = agg["best_detail"]
        if det and det["top_confusions"]:
            out += [
                "",
                "Top confusions of that model (true -> predicted, share of the true class):",
            ]
            out += [f"- {c['true']} -> {c['pred']}: {c['rate']:.1%}" for c in det["top_confusions"]]
    if agg["leakage"]:
        out += ["", "## Leakage study (Logistic Regression, pixels)", ""]
        out += [
            "| Split | Seeds | Val acc | Test acc | Val-Test gap | NN dist val->train | NN dist test->train |",
            "|---|---|---|---|---|---|---|",
        ]
        for r in agg["leakage"]:
            out.append(
                f"| {r['split_strategy']} | {r['n_seeds']} | {_fmt(r['val_acc'])} | {_fmt(r['test_acc'])}"
                f" | {_fmt(r['val_test_gap'])} | {_fmt(r['nn_val_to_train'], 2)}"
                f" | {_fmt(r['nn_test_to_train'], 2)} |"
            )
    if agg.get("cnn_sweep"):
        out += ["", "## CNN sweep (validation only; one factor changed from `base`)", ""]
        out += [
            "| Config | Seeds | Val macro-F1 | Val acc | Best epoch | Params | Train s |",
            "|---|---|---|---|---|---|---|",
        ]
        for r in agg["cnn_sweep"]:
            out.append(
                f"| {r['config']} | {r['n_seeds']} | {_fmt(r['val_macro_f1'])} | {_fmt(r['val_acc'])}"
                f" | {_fmt(r['best_epoch'], 1)} | {r['params']['mean']:.0f} | {_fmt(r['train_s'], 0)} |"
            )
    if agg.get("cnn_main"):
        out += ["", "## CNN main (config chosen on validation; test evaluated once)", ""]
        out += [
            "| Config | Seeds | Val macro-F1 | Test acc | Test macro-F1 |",
            "|---|---|---|---|---|",
        ]
        for r in agg["cnn_main"]:
            out.append(
                f"| {r['config']} | {r['n_seeds']} | {_fmt(r['val_macro_f1'])}"
                f" | {_fmt(r['test_acc'])} | {_fmt(r['test_macro_f1'])} |"
            )
    if agg.get("lm_sweep"):
        out += [
            "",
            "## Landmark MLP sweep (validation only; one factor changed from `base`)",
            "",
            (
                "Split: keypoint.csv in file order per class, train | gap | val | gap | test. "
                "This is not a signer holdout: the file has no signer or session column."
            ),
            "",
            "| Config | Seeds | Val macro-F1 | Val acc | Best epoch | Params | Train s |",
            "|---|---|---|---|---|---|---|",
        ]
        for r in agg["lm_sweep"]:
            out.append(
                f"| {r['config']} | {r['n_seeds']} | {_fmt(r['val_macro_f1'])} | {_fmt(r['val_acc'])}"
                f" | {_fmt(r['best_epoch'], 1)} | {r['params']['mean']:.0f} | {_fmt(r['train_s'], 0)} |"
            )
    if agg.get("lm_main"):
        out += ["", "## Landmark MLP main (config chosen on validation; test part scored once)", ""]
        out += [
            "| Config | Seeds | Val macro-F1 | Test acc | Test macro-F1 |",
            "|---|---|---|---|---|",
        ]
        for r in agg["lm_main"]:
            out.append(
                f"| {r['config']} | {r['n_seeds']} | {_fmt(r['val_macro_f1'])}"
                f" | {_fmt(r['test_acc'])} | {_fmt(r['test_macro_f1'])} |"
            )
    c = agg.get("cnn_vs_baseline")
    if c:
        verdict = {True: "exceeds", False: "does NOT exceed", None: "cannot be judged against"}[
            c["exceeds_seed_noise"]
        ]
        out += [
            "",
            (
                f"CNN `{c['cnn_config']}` vs best baseline {c['baseline']}: test macro-F1 "
                f"{_fmt(c['cnn_test_macro_f1'])} vs {_fmt(c['baseline_test_macro_f1'])} "
                f"(difference {c['difference']:+.3f}); the difference {verdict} the seed noise "
                f"({c['rule']})."
            ),
        ]
    return "\n".join(out) + "\n"


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Summarise experiment JSON files.")
    ap.add_argument("--dir", default=str(REPORTS / "experiments"))
    ap.add_argument("--out", default=str(REPORTS / "summary.md"))
    args = ap.parse_args(argv)
    agg = aggregate(load_records(args.dir))
    md = render_markdown(agg)
    Path(args.out).write_text(md, encoding="utf-8")
    Path(args.out).with_suffix(".json").write_text(json.dumps(agg, indent=2), encoding="utf-8")
    print(md)


if __name__ == "__main__":
    main()
