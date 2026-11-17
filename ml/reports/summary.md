## Baselines (group split, fixed untuned hyper-parameters)

| Model | Features | Seeds | Val macro-F1 | Test acc | Test macro-F1 | ms/img | Train s |
|---|---|---|---|---|---|---|---|
| MLP 256-128 | hog | 3 | 0.923 ± 0.007 | 0.917 ± 0.001 | 0.911 ± 0.003 | 0.670 ± 0.130 | 21.8 ± 0.2 |
| Linear SVM | hog | 1 | 0.877 | 0.882 | 0.876 | 0.693 | 2332.7 |
| Random Forest (200 trees) | pixel | 3 | 0.837 ± 0.002 | 0.804 ± 0.004 | 0.788 ± 0.004 | 35.335 ± 2.249 | 11.8 ± 0.5 |
| MLP 256-128 | pixel | 3 | 0.834 ± 0.003 | 0.799 ± 0.009 | 0.777 ± 0.008 | 0.482 ± 0.059 | 13.3 ± 0.4 |
| Logistic Regression | pixel | 1 | 0.772 | 0.705 | 0.684 | 0.321 | 2.5 |
| Majority class (floor) | pixel | 1 | 0.004 | 0.020 | 0.002 | 0.041 | 0.0 |

Best by validation macro-F1: **MLP 256-128 (hog)**.

Top confusions of that model (true -> predicted, share of the true class):
- U -> K: 15.0%
- V -> W: 12.7%
- U -> R: 11.7%
- N -> S: 10.7%
- Y -> K: 9.0%

## Leakage study (Logistic Regression, pixels)

| Split | Seeds | Val acc | Test acc | Val-Test gap | NN dist val->train | NN dist test->train |
|---|---|---|---|---|---|---|
| group_ward70 | 3 | 0.745 ± 0.040 | 0.690 ± 0.014 | 0.055 ± 0.029 | 2.45 ± 0.05 | 2.59 ± 0.03 |
| random | 3 | 1.000 ± 0.000 | 0.687 ± 0.004 | 0.312 ± 0.003 | 0.45 ± 0.01 | 2.51 ± 0.00 |

## CNN sweep (validation only; one factor changed from `base`)

| Config | Seeds | Val macro-F1 | Val acc | Best epoch | Params | Train s |
|---|---|---|---|---|---|---|
| wide_e30 | 3 | 0.980 ± 0.005 | 0.980 ± 0.005 | 9.7 ± 2.5 | 828056 | 170 ± 41 |
| base_e30 | 3 | 0.977 ± 0.010 | 0.977 ± 0.010 | 17.0 ± 4.4 | 208728 | 137 ± 21 |
| wide | 3 | 0.975 ± 0.002 | 0.975 ± 0.002 | 11.0 ± 3.6 | 828056 | 147 ± 42 |
| base | 3 | 0.962 ± 0.015 | 0.962 ± 0.015 | 13.0 ± 1.0 | 208728 | 87 ± 8 |
| lr_3e-3 | 3 | 0.952 ± 0.043 | 0.953 ± 0.043 | 11.0 ± 4.4 | 208728 | 72 ± 24 |
| dropout_0.5 | 3 | 0.950 ± 0.009 | 0.951 ± 0.009 | 14.3 ± 1.2 | 208728 | 91 ± 1 |
| no_aug | 3 | 0.918 ± 0.014 | 0.917 ± 0.014 | 7.3 ± 1.5 | 208728 | 45 ± 9 |

## CNN main (config chosen on validation; test evaluated once)

| Config | Seeds | Val macro-F1 | Test acc | Test macro-F1 |
|---|---|---|---|---|
| wide_e30__ens5 | 1 | 0.988 | 0.979 | 0.979 |
| wide_e30 | 3 | 0.980 ± 0.005 | 0.975 ± 0.002 | 0.974 ± 0.003 |
| wide | 3 | 0.975 ± 0.002 | 0.972 ± 0.002 | 0.971 ± 0.003 |

## Landmark sweeps (validation only; config = features__model)

Split: keypoint.csv in file order per class, train | gap | val | gap | test. This is not a signer holdout: the file has no signer or session column.

| Config | Seeds | Val macro-F1 | Val acc | Best epoch | Params | Train s |
|---|---|---|---|---|---|---|
| xy_dist_ang__mlp_512_256__ens5 | 1 | 0.857 | 0.861 | - | 1414520 | 125 |
| xy_dist_ang__mlp_512_256 | 3 | 0.850 ± 0.005 | 0.855 ± 0.003 | 13.0 ± 5.3 | 282904 | 19 ± 4 |
| xy_dist_ang__mlp_256_128 | 3 | 0.843 ± 0.004 | 0.848 ± 0.002 | 11.3 ± 3.2 | 108696 | 9 ± 1 |
| xy_dist_ang__mlp_128_64 | 6 | 0.842 ± 0.017 | 0.844 ± 0.014 | 12.3 ± 2.9 | 46168 | 7 ± 1 |
| xy_dist_ang__hgb | 1 | 0.810 | 0.828 | 200.0 | 0 | 171 |
| dist_ang__mlp_128_64 | 3 | 0.794 ± 0.012 | 0.798 ± 0.013 | 7.7 ± 5.5 | 40792 | 6 ± 1 |
| dist__mlp_128_64 | 3 | 0.792 ± 0.002 | 0.804 ± 0.006 | 7.7 ± 2.1 | 36824 | 5 ± 1 |
| xy__mlp_128_64 | 3 | 0.777 ± 0.007 | 0.817 ± 0.007 | 36.7 ± 9.6 | 15320 | 16 ± 7 |
| canonical | 3 | 0.746 ± 0.003 | 0.789 ± 0.003 | 27.0 ± 2.6 | 15320 | 8 ± 0 |
| mirror_aug | 3 | 0.696 ± 0.010 | 0.750 ± 0.008 | 31.0 ± 7.2 | 15320 | 14 ± 3 |
| no_aug | 3 | 0.630 ± 0.028 | 0.708 ± 0.024 | 34.7 ± 0.6 | 15320 | 10 ± 1 |
| base | 3 | 0.630 ± 0.023 | 0.710 ± 0.018 | 31.7 ± 4.0 | 15320 | 9 ± 1 |

## Landmark main runs (test part scored once per run)

| Config | Seeds | Val macro-F1 | Test acc | Test macro-F1 |
|---|---|---|---|---|
| xy_dist_ang__mlp_512_256__ens5 | 1 | 0.857 | 0.782 | 0.778 |
| xy_dist_ang__mlp_512_256 | 3 | 0.850 ± 0.005 | 0.768 ± 0.021 | 0.769 ± 0.016 |
| canonical | 3 | 0.746 ± 0.003 | 0.709 ± 0.004 | 0.664 ± 0.004 |

CNN `wide_e30__ens5` vs best baseline MLP 256-128 (hog): test macro-F1 0.979 vs 0.911 ± 0.003 (difference +0.069); the difference exceeds the seed noise (difference > 2 x the larger seed std (heuristic, not a significance test)).
