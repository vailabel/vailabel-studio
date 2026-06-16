//! Pure parsing of ultralytics' `results.csv` (per-epoch training metrics).
//!
//! No filesystem here — the composition root reads the file and passes the text,
//! so this stays a pure domain function (the report command does the I/O).

/// Parse `results.csv` *content* into `(column names, numeric rows)`. Non-numeric
/// cells become `NaN`; blank lines are skipped. Empty/headerless input yields
/// empty vectors so a report degrades to just its plots.
pub fn parse_results_csv(content: &str) -> (Vec<String>, Vec<Vec<f64>>) {
    let mut lines = content.lines();
    let columns: Vec<String> = match lines.next() {
        Some(header) => header.split(',').map(|s| s.trim().to_string()).collect(),
        None => return (Vec::new(), Vec::new()),
    };
    let rows = lines
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            line.split(',')
                .map(|cell| cell.trim().parse::<f64>().unwrap_or(f64::NAN))
                .collect::<Vec<_>>()
        })
        .collect();
    (columns, rows)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_header_and_numeric_rows() {
        let (cols, rows) = parse_results_csv("epoch, metrics/mAP50\n1, 0.5\n2, 0.8\n");
        assert_eq!(cols, vec!["epoch".to_string(), "metrics/mAP50".to_string()]);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[1], vec![2.0, 0.8]);
    }

    #[test]
    fn non_numeric_cells_become_nan_and_blanks_skipped() {
        let (_cols, rows) = parse_results_csv("epoch,note\n1,hello\n\n");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0][0], 1.0);
        assert!(rows[0][1].is_nan());
    }

    #[test]
    fn empty_input_yields_empty() {
        let (cols, rows) = parse_results_csv("");
        assert!(cols.is_empty());
        assert!(rows.is_empty());
    }
}
