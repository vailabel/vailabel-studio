//! Spreadsheet (CSV / TSV / Excel) parsing for the structured-data import flow.
//!
//! Label Studio-style tabular import: a spreadsheet is read into a header row +
//! data rows, and the create flow turns each row into its own labeling task. The
//! parse is pure (no DB, no `AppState`) — it only reads the file the user picked,
//! so it lives next to the dataset commands as a plain helper.

use std::path::Path;

use calamine::{open_workbook_auto, Data, Reader};
use serde::Serialize;

use crate::AppError;

/// A parsed spreadsheet: the header row plus every data row as a list of
/// stringified cells (each row padded/truncated to the header width so the
/// frontend can zip columns safely). `sheet_names` is populated for Excel/ODS so
/// a later version can offer sheet selection; today the first sheet is used.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpreadsheetData {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub sheet_names: Vec<String>,
}

/// Parse a CSV / TSV / Excel file into `{ headers, rows }`. The format is chosen
/// by extension; unknown extensions are read as comma-delimited text.
pub fn parse_spreadsheet(path: &str) -> Result<SpreadsheetData, AppError> {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "xlsx" | "xlsm" | "xlsb" | "xls" | "ods" => parse_excel(path),
        "tsv" | "tab" => parse_delimited(path, b'\t'),
        _ => parse_delimited(path, b','),
    }
}

/// CSV / TSV via the `csv` crate. `flexible` tolerates ragged rows; headers are
/// read as the first record so a stray BOM can be stripped before use.
fn parse_delimited(path: &str, delimiter: u8) -> Result<SpreadsheetData, AppError> {
    let mut reader = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .has_headers(false)
        .flexible(true)
        .from_path(path)
        .map_err(|e| AppError::Message(format!("Could not open spreadsheet: {e}")))?;

    let mut records = reader.records();
    let mut headers: Vec<String> = match records.next() {
        Some(row) => row
            .map_err(|e| AppError::Message(format!("Malformed header row: {e}")))?
            .iter()
            .map(|cell| cell.trim().to_string())
            .collect(),
        None => return Ok(empty()),
    };
    // The csv crate doesn't strip a UTF-8 BOM, so the first header would carry
    // a leading U+FEFF (not whitespace, so trim() misses it).
    if let Some(first) = headers.first_mut() {
        *first = first.trim_start_matches('\u{feff}').to_string();
    }

    let width = headers.len();
    let mut rows = Vec::new();
    for record in records {
        let record = record.map_err(|e| AppError::Message(format!("Malformed row: {e}")))?;
        rows.push(normalize_row(record.iter().map(|c| c.to_string()), width));
    }

    Ok(SpreadsheetData {
        headers,
        rows,
        sheet_names: Vec::new(),
    })
}

/// Excel / ODS via `calamine` (pure Rust, no system deps). Reads the first sheet.
fn parse_excel(path: &str) -> Result<SpreadsheetData, AppError> {
    let mut workbook = open_workbook_auto(path)
        .map_err(|e| AppError::Message(format!("Could not open workbook: {e}")))?;
    let sheet_names = workbook.sheet_names().to_vec();
    let Some(first) = sheet_names.first().cloned() else {
        return Ok(empty());
    };
    let range = workbook
        .worksheet_range(&first)
        .map_err(|e| AppError::Message(format!("Could not read sheet '{first}': {e}")))?;

    let mut iter = range.rows();
    let headers: Vec<String> = match iter.next() {
        Some(row) => row.iter().map(cell_to_string).collect(),
        None => {
            return Ok(SpreadsheetData {
                headers: Vec::new(),
                rows: Vec::new(),
                sheet_names,
            })
        }
    };
    let width = headers.len();
    let rows = iter
        .map(|row| normalize_row(row.iter().map(cell_to_string), width))
        .collect();

    Ok(SpreadsheetData {
        headers,
        rows,
        sheet_names,
    })
}

/// Pad/truncate a row to the header width so column zipping stays aligned.
fn normalize_row(cells: impl Iterator<Item = String>, width: usize) -> Vec<String> {
    let mut row: Vec<String> = cells.collect();
    if width > 0 {
        row.resize(width, String::new());
    }
    row
}

/// Render an Excel cell as text. Whole floats print without a trailing `.0`
/// (Excel stores integers as f64), matching how the value reads in the sheet.
fn cell_to_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::Float(f) if f.fract() == 0.0 && f.abs() < 1e15 => format!("{}", *f as i64),
        other => other.to_string(),
    }
}

fn empty() -> SpreadsheetData {
    SpreadsheetData {
        headers: Vec::new(),
        rows: Vec::new(),
        sheet_names: Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Distinct file name per test so the parallel test runner doesn't collide.
    fn temp_path(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("vailabel_spreadsheet_test_{name}"))
    }

    #[test]
    fn parses_csv_and_strips_bom() {
        let path = temp_path("bom.csv");
        std::fs::write(&path, "\u{feff}name,score\nAlice,9\nBob,7\n").unwrap();

        let data = parse_spreadsheet(path.to_str().unwrap()).unwrap();

        // The UTF-8 BOM must not leak into the first header.
        assert_eq!(data.headers, vec!["name", "score"]);
        assert_eq!(data.rows, vec![vec!["Alice", "9"], vec!["Bob", "7"]]);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn parses_tsv_and_pads_ragged_rows() {
        let path = temp_path("ragged.tsv");
        // The second row is short; it should be padded to the header width.
        std::fs::write(&path, "a\tb\tc\n1\t2\n").unwrap();

        let data = parse_spreadsheet(path.to_str().unwrap()).unwrap();

        assert_eq!(data.headers, vec!["a", "b", "c"]);
        assert_eq!(data.rows, vec![vec!["1", "2", ""]]);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn header_only_file_yields_no_rows() {
        let path = temp_path("header_only.csv");
        std::fs::write(&path, "col1,col2\n").unwrap();

        let data = parse_spreadsheet(path.to_str().unwrap()).unwrap();

        assert_eq!(data.headers, vec!["col1", "col2"]);
        assert!(data.rows.is_empty());
        let _ = std::fs::remove_file(&path);
    }
}
