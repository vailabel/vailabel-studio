//! The automatic-retraining policy: when has a project gathered enough new
//! labels to be worth training again?

/// Decide whether to start a retrain.
///
/// - `labeled_now`: items in the project that carry at least one annotation.
/// - `labeled_at_last_run`: the same count recorded when the most recent run
///   (finished, failed or canceled) started; `None` if the project never trained.
///   Measuring from the last *attempt* is deliberate: a run that failed must
///   not be retried in a loop — only more labeling earns another try.
/// - `min_new_items`: the project's threshold.
/// - `run_in_flight`: a run for this project is already pending or running.
pub fn should_retrain(
    labeled_now: u64,
    labeled_at_last_run: Option<u64>,
    min_new_items: u32,
    run_in_flight: bool,
) -> bool {
    if run_in_flight || labeled_now == 0 {
        return false;
    }
    // A threshold of 0 would retrain forever on an unchanged dataset.
    let threshold = u64::from(min_new_items.max(1));
    labeled_now >= labeled_at_last_run.unwrap_or(0).saturating_add(threshold)
}

#[cfg(test)]
mod tests {
    use super::should_retrain;

    #[test]
    fn first_run_waits_for_the_threshold() {
        assert!(!should_retrain(49, None, 50, false));
        assert!(should_retrain(50, None, 50, false));
    }

    #[test]
    fn later_runs_count_only_new_labels() {
        assert!(!should_retrain(149, Some(100), 50, false));
        assert!(should_retrain(150, Some(100), 50, false));
    }

    #[test]
    fn never_while_a_run_is_in_flight_or_nothing_is_labeled() {
        assert!(!should_retrain(500, Some(100), 50, true));
        assert!(!should_retrain(0, None, 0, false));
    }

    #[test]
    fn deleting_labels_does_not_trigger_a_retrain() {
        assert!(!should_retrain(80, Some(100), 50, false));
    }

    #[test]
    fn a_zero_threshold_still_needs_one_new_item() {
        assert!(!should_retrain(100, Some(100), 0, false));
        assert!(should_retrain(101, Some(100), 0, false));
    }
}
