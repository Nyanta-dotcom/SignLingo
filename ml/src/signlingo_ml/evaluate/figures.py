"""Figures for the report and the AI Lab (P1-25). Every number is read from experiment records.

Nothing is typed in by hand: bars, matrices and curves come from `reports/experiments/*.json`
(via `summary.aggregate` for the aggregated ones). A figure whose source run is missing is
reported as skipped, never faked.
"""

import argparse
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from signlingo_ml.config import REPORTS
from signlingo_ml.evaluate.summary import aggregate, load_records

BLUE, SKY, GREY, ORANGE = "#1D6FE8", "#38BDF8", "#94A3B8", "#F59E0B"
CNN_RUN = "cnn_ens_wide_e30_n5"
LM_RUN = "lmi_main_xy_dist_ang__mlp_512_256__ens"
BASELINE_RUN = "baseline_mlp_hog_s42"
CURVE_RUNS = ["cnn_main_wide_e30_s42", "lmi_main_xy_dist_ang__mlp_512_256_s42"]


def _save(fig, path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


def _bar_rows(ax, rows, title, color):
    """Horizontal bars of mean test macro-F1 with seed std; rows = [(label, stat_dict)]."""
    rows = sorted(rows, key=lambda r: r[1]["mean"])
    y = np.arange(len(rows))
    means = [r[1]["mean"] for r in rows]
    errs = [r[1]["std"] or 0.0 for r in rows]
    ax.barh(y, means, xerr=errs, color=color, ecolor="#0F172A", capsize=3)
    ax.set_yticks(y, [r[0] for r in rows])
    ax.set_xlim(0, 1.05)
    ax.set_xlabel("Test macro-F1 (mean ± std over seeds)")
    ax.set_title(title, fontsize=10)
    for yi, m in zip(y, means, strict=True):
        ax.text(m + 0.01, yi, f"{m:.3f}", va="center", fontsize=8)


def _clean(label: str) -> str:
    """Readable label: config tags use '__' and '_' as separators."""
    return label.replace("__", " · ").replace("_", " ")


def fig_model_comparison(agg: dict, path) -> Path:
    img = [
        (_clean(f"{r['model_name']} ({r['feature_set']})"), r["test_macro_f1"])
        for r in agg["baselines"]
        if r["test_macro_f1"]
    ] + [
        (_clean(f"CNN {r['config']}"), r["test_macro_f1"]) for r in agg["cnn_main"] if r["test_macro_f1"]
    ]
    lm = [
        (_clean(f"Landmark {r['config']}"), r["test_macro_f1"])
        for r in agg["lm_main"]
        if r["test_macro_f1"]
    ]
    if not img and not lm:
        raise ValueError("no test results to compare")
    panels = [
        p
        for p in (
            (img, "Image data (Sign Language MNIST)", BLUE),
            (lm, "Landmark data (keypoint.csv, file-order split, not a signer holdout)", SKY),
        )
        if p[0]
    ]
    heights = [len(p[0]) for p in panels]
    fig, axes = plt.subplots(
        len(panels),
        1,
        figsize=(9, 0.42 * sum(heights) + 1.2 * len(panels) + 0.8),
        gridspec_kw={"height_ratios": heights},
        constrained_layout=True,
    )
    for ax, (rows, title, color) in zip(np.atleast_1d(axes), panels, strict=True):
        _bar_rows(ax, rows, title, color)
    fig.suptitle("Test macro-F1 by model (different datasets: not directly comparable)", fontsize=11)
    return _save(fig, path)


def fig_confusion(record: dict, path) -> Path:
    cm = record.get("confusion_matrix")
    if not cm:
        raise ValueError(f"{record['run_id']} has no confusion_matrix (test was not evaluated)")
    labels, mat = cm["labels"], np.array(cm["matrix"])
    fig, ax = plt.subplots(figsize=(8, 7))
    im = ax.imshow(mat, cmap="Blues", vmin=0, vmax=1)
    ax.set_xticks(range(len(labels)), labels, fontsize=8)
    ax.set_yticks(range(len(labels)), labels, fontsize=8)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title(f"{record['model_name']}: test confusion matrix (row-normalised)", fontsize=10)
    fig.colorbar(im, ax=ax, fraction=0.046, label="share of the true letter")
    return _save(fig, path)


def fig_per_class_f1(records: list[dict], names: list[str], path) -> Path:
    labels = list(records[0]["per_class_f1"])
    width = 0.8 / len(records)
    fig, ax = plt.subplots(figsize=(11, 4))
    for i, (rec, name) in enumerate(zip(records, names, strict=True)):
        vals = [rec["per_class_f1"][k] for k in labels]
        ax.bar(np.arange(len(labels)) + i * width, vals, width, label=name,
               color=[BLUE, GREY, SKY, ORANGE][i % 4])  # fmt: skip
    ax.set_xticks(np.arange(len(labels)) + width * (len(records) - 1) / 2, labels)
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("F1 (test)")
    ax.set_title("Per-letter F1 on the test split")
    ax.legend(fontsize=8)
    return _save(fig, path)


def fig_curves(record: dict, path) -> Path:
    c = record.get("curves")
    if not c or "epoch" not in c:
        raise ValueError(f"{record['run_id']} has no curves")
    fig, (a, b) = plt.subplots(1, 2, figsize=(9, 3.4))
    a.plot(c["epoch"], c["train_loss"], color=BLUE)
    a.set_xlabel("epoch")
    a.set_ylabel("training loss")
    b.plot(c["epoch"], c["val_macro_f1"], color=SKY)
    best = record.get("hyperparams", {}).get("best_epoch")
    if best:
        b.axvline(best, color=ORANGE, ls="--", label=f"best epoch {best}")
        b.legend(fontsize=8)
    b.set_xlabel("epoch")
    b.set_ylabel("validation macro-F1")
    fig.suptitle(f"{record['model_name']} ({record['run_id']})", fontsize=10)
    return _save(fig, path)


def fig_leakage(agg: dict, path) -> Path:
    leak = {r["split_strategy"]: r for r in agg["leakage"]}
    if not leak:
        raise ValueError("no leakage_study records")
    order = [s for s in ("random", "group_ward70") if s in leak]
    names = {"random": "random split", "group_ward70": "group split"}
    fig, (a, b) = plt.subplots(1, 2, figsize=(10, 3.8))
    x, w = np.arange(len(order)), 0.35
    for off, key, label, color in (
        (-w / 2, "val_acc", "validation", BLUE),
        (w / 2, "test_acc", "test", GREY),
    ):
        vals = [leak[s][key]["mean"] if leak[s][key] else 0 for s in order]
        errs = [(leak[s][key] or {"std": 0})["std"] or 0 for s in order]
        a.bar(x + off, vals, w, yerr=errs, label=label, color=color, capsize=3)
    a.set_xticks(x, [names[s] for s in order])
    a.set_ylim(0, 1.05)
    a.set_ylabel("accuracy (Logistic Regression)")
    a.set_title("Validation looks perfect only when copies leak", fontsize=10)
    a.legend(fontsize=8)
    for off, key, label, color in (
        (-w / 2, "nn_val_to_train", "val → train", BLUE),
        (w / 2, "nn_test_to_train", "test → train", GREY),
    ):
        vals = [leak[s][key]["mean"] if leak[s][key] else 0 for s in order]
        b.bar(x + off, vals, w, label=label, color=color)
    b.set_xticks(x, [names[s] for s in order])
    b.set_ylabel("distance to nearest same-class train image")
    b.set_title("Near-duplicates: small distance = leakage", fontsize=10)
    b.set_ylim(0, b.get_ylim()[1] * 1.25)  # headroom so the legend never covers a bar
    b.legend(fontsize=8, loc="upper center", ncol=2)
    return _save(fig, path)


def make_all(records: list[dict], out_dir) -> dict:
    out, by_id = Path(out_dir), {r["run_id"]: r for r in records}
    agg, written, skipped = aggregate(records), [], {}

    def attempt(name, fn):
        try:
            fn()
            written.append(name)
        except (ValueError, KeyError) as e:
            skipped[name] = str(e)

    attempt("model_comparison.png", lambda: fig_model_comparison(agg, out / "model_comparison.png"))
    attempt("leakage_study.png", lambda: fig_leakage(agg, out / "leakage_study.png"))
    for run, name in ((CNN_RUN, "confusion_cnn.png"), (LM_RUN, "confusion_landmark.png")):
        attempt(name if run in by_id else f"{name} [{run} missing]",
                lambda run=run, name=name: fig_confusion(by_id[run], out / name))  # fmt: skip
    attempt(f"per_class_f1.png [{CNN_RUN}, {BASELINE_RUN}]" if {CNN_RUN, BASELINE_RUN} <= set(by_id) else f"per_class_f1.png [{CNN_RUN} or {BASELINE_RUN} missing]",
            lambda: fig_per_class_f1([by_id[BASELINE_RUN], by_id[CNN_RUN]], ["MLP + HOG (baseline)", "CNN ensemble"], out / "per_class_f1.png"))  # fmt: skip
    for run in CURVE_RUNS:
        attempt(f"curves_{run}.png" if run in by_id else f"curves_{run}.png [{run} missing]",
                lambda run=run: fig_curves(by_id[run], out / f"curves_{run}.png"))  # fmt: skip
    written = [w.split(" [")[0] for w in written]
    return {"written": written, "skipped": skipped}


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Draw figures from experiment records.")
    ap.add_argument("--dir", default=str(REPORTS / "experiments"))
    ap.add_argument("--out", default=str(REPORTS / "figures"))
    args = ap.parse_args(argv)
    res = make_all(load_records(args.dir), args.out)
    print("written:", *res["written"], sep="\n  ")
    if res["skipped"]:
        print("skipped:", *[f"{k}: {v}" for k, v in res["skipped"].items()], sep="\n  ")


if __name__ == "__main__":
    main()
