import pytest

from signlingo_ml.pipeline import STEP_ORDER, Step, main, run_steps


def _steps(tmp_path, calls, fail=None):
    def make(name):
        out = tmp_path / f"{name}.done"

        def run():
            calls.append(name)
            if name == fail:
                raise RuntimeError("boom")
            out.write_text("ok")

        return Step(name, [out], run)

    return {n: make(n) for n in STEP_ORDER}


def test_all_runs_every_step_in_order(tmp_path):
    calls = []
    run_steps(["all"], _steps(tmp_path, calls))
    assert calls == STEP_ORDER


def test_second_run_is_cached_and_force_reruns(tmp_path):
    calls, steps = [], None
    steps = _steps(tmp_path, calls)
    run_steps(["all"], steps)
    calls.clear()
    status = run_steps(["all"], steps)
    assert calls == [] and set(status.values()) == {"cached"}
    run_steps(["export"], steps, force=True)
    assert calls == ["export"]


def test_dry_run_runs_nothing(tmp_path):
    calls = []
    status = run_steps(["cnn"], _steps(tmp_path, calls), dry_run=True)
    assert calls == [] and status == {"cnn": "would run"}


def test_failure_stops_the_pipeline_and_names_the_step(tmp_path):
    calls = []
    with pytest.raises(RuntimeError, match="cnn"):
        run_steps(["all"], _steps(tmp_path, calls, fail="cnn"))
    assert calls[-1] == "cnn" and "landmarks" not in calls


def test_unknown_step_is_rejected():
    with pytest.raises(SystemExit):
        main(["nonsense"])
