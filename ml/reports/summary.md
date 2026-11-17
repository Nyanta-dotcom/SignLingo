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
