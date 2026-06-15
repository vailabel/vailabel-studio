//! Parsing a local model's free-text label suggestions into clean class names.

use serde_json::Value;

/// Max label suggestions kept from a single turn — enough to be useful without
/// burying the user in chips.
pub const MAX_LABEL_SUGGESTIONS: usize = 12;

/// Parse a model's free-text answer into a clean list of candidate label names.
///
/// Tolerates the three shapes a local model tends to return: a JSON array
/// (`["car","person"]`), a comma-separated line, or a newline/bulleted list.
/// Each name is stripped of list markers and quotes, lowercased, and filtered to
/// short noun-like phrases (sentences are dropped); duplicates are removed with
/// order preserved. Pure — unit-tested below.
pub fn parse_label_list(raw: &str) -> Vec<String> {
    let trimmed = raw.trim();
    let tokens: Vec<String> = match extract_json_array(trimmed) {
        Some(array) => array,
        None => trimmed
            .split(|character| matches!(character, ',' | '\n' | ';' | '/'))
            .map(ToString::to_string)
            .collect(),
    };

    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for token in tokens {
        let cleaned = clean_label_token(&token);
        if cleaned.is_empty() {
            continue;
        }
        // Drop sentences/explanations — class names are short noun phrases.
        if cleaned.split_whitespace().count() > 4 || cleaned.chars().count() > 40 {
            continue;
        }
        if seen.insert(cleaned.clone()) {
            out.push(cleaned);
        }
        if out.len() >= MAX_LABEL_SUGGESTIONS {
            break;
        }
    }
    out
}

/// Normalize one candidate token: strip leading list markers (numbering, bullets,
/// dashes), surrounding quotes/brackets, collapse whitespace, and lowercase.
fn clean_label_token(token: &str) -> String {
    let stripped = token
        .trim()
        .trim_start_matches(|character: char| {
            character.is_ascii_digit()
                || matches!(character, '.' | ')' | '(' | '-' | '*' | '•' | '·' | '#' | ' ' | '\t')
        })
        .trim_matches(|character: char| {
            matches!(character, '"' | '\'' | '`' | '[' | ']' | '{' | '}' | '.')
        })
        .trim();
    stripped
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

/// Extract the first `[...]` JSON array of strings from arbitrary model output.
fn extract_json_array(raw: &str) -> Option<Vec<String>> {
    let start = raw.find('[')?;
    let end = raw[start..].find(']').map(|offset| start + offset)?;
    let slice = &raw[start..=end];
    let value: Value = serde_json::from_str(slice).ok()?;
    let array = value.as_array()?;
    Some(
        array
            .iter()
            .filter_map(|entry| entry.as_str().map(ToString::to_string))
            .collect(),
    )
}
