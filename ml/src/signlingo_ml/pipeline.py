"""One entrypoint for the whole ML pipeline (P1-26, AC-ML-01).

    python -m signlingo_ml.pipeline all            # every step, in order
    python -m signlingo_ml.pipeline cnn landmarks  # chosen steps
    python -m signlingo_ml.pipeline all --dry-run  # show what would run

A step is skipped ("cached") when all its output files exist; `--force` reruns it. Steps call the
same module CLIs documented in ml/README, so results are identical to running them by hand.
Full training takes hours on CPU (the CNN sweep and the SVM baseline dominate).
"""

import argparse
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from signlingo_ml.config import ARTIFACTS, DATA_PROCESSED, REPORTS

EXP = REPORTS / "experiments"
STEP_ORDER = ["data", "baselines", "cnn", "landmarks", "export", "publish", "report"]


@dataclass
class Step:
    name: str
    outputs: list[Path]
    run: Callable[[], None]

    def done(self) -> bool:
        return all(p.exists() for p in self.outputs)


def _data() -> None:
    from signlingo_ml.config import raw_path
    from signlingo_ml.data.load import load_kaggle_csv
    from signlingo_ml.data.quality import clean
    from signlingo_ml.data.split import load_or_make_split
    from signlingo_ml.data.transform import transform

    X, y = transform(clean(load_kaggle_csv(raw_path("sign_mnist_train.csv"))))
    load_or_make_split(X, y, DATA_PROCESSED / "split_v1.parquet")


def _baselines() -> None:
    from signlingo_ml.train import baselines, leakage_study

    baselines.main([])
    leakage_study.main([])


def _cnn() -> None:
    from signlingo_ml.train import ensemble_cnn, run_cnn

    run_cnn.main(["--epochs", "30", "--configs", "wide"])
    ensemble_cnn.main(["--tag", "wide_e30"])


def _landmarks() -> None:
    from signlingo_ml.train import landmark_improve, run_landmarks

    run_landmarks.main([])
    landmark_improve.main([])


def _export() -> None:
    from signlingo_ml.export import build_release

    build_release.main([])


def _publish() -> None:
    from signlingo_ml.export import publish

    publish.main([])


def _report() -> None:
    from signlingo_ml.evaluate import figures, summary

    summary.main([])
    figures.main([])


def default_steps() -> dict[str, Step]:
    from signlingo_ml.export.publish import DEFAULT_PUBLIC

    spec = {
        "data": ([DATA_PROCESSED / "split_v1.parquet"], _data),
        "baselines": ([EXP / "baseline_mlp_hog_s42.json"], _baselines),
        "cnn": ([EXP / "cnn_ens_wide_e30_n5.json"], _cnn),
        "landmarks": ([EXP / "lmi_main_xy_dist_ang__mlp_512_256__ens.json"], _landmarks),
        "export": ([ARTIFACTS / "landmark-mlp-ens5-1.0.0.onnx"], _export),
        "publish": ([DEFAULT_PUBLIC / "models" / "index.json"], _publish),
        "report": ([REPORTS / "summary.md", REPORTS / "figures" / "model_comparison.png"], _report),
    }
    return {n: Step(n, o, r) for n, (o, r) in spec.items()}


def run_steps(names, steps, force=False, dry_run=False) -> dict[str, str]:
    chosen = STEP_ORDER if "all" in names else [n for n in STEP_ORDER if n in names]
    status = {}
    for name in chosen:
        step = steps[name]
        if step.done() and not force:
            status[name] = "cached"
        elif dry_run:
            status[name] = "would run"
        else:
            print(f"== {name}", flush=True)
            try:
                step.run()
            except Exception as e:
                raise RuntimeError(f"pipeline step '{name}' failed: {e}") from e
            status[name] = "ran"
    return status


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Run the SignLingo ML pipeline.")
    ap.add_argument("steps", nargs="+", choices=["all", *STEP_ORDER])
    ap.add_argument("--force", action="store_true", help="rerun steps whose outputs exist")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    for name, state in run_steps(args.steps, default_steps(), args.force, args.dry_run).items():
        print(f"{name:10s} {state}")


if __name__ == "__main__":
    main()
