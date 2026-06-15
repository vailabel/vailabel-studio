//! Track interpolation — the core of the tracking architecture.
//!
//! Given a [`Track`]'s sparse keyframes, resolve the object's shape at *any*
//! frame by linearly interpolating between the bracketing keyframes. This is a
//! pure, allocation-light function with no I/O so it is trivially unit-testable
//! and is mirrored 1:1 by the TypeScript `track-engine.ts` used for live
//! scrubbing in the UI (the backend copy materializes tracks for export).
//!
//! ## Semantics
//! - Before the first keyframe → not visible (`None`).
//! - On/after the last keyframe → hold the last shape (unless it is `outside`).
//! - Between keyframes `a` and `b` → if `a.outside`, the object is gone until
//!   `b`; otherwise interpolate `a → b` by the fractional position.
//! - Interpolation requires equal point counts; mismatched shapes hold `a`.

use super::{Point, Track, TrackKeyframe};

/// A track shape resolved at a single frame.
pub struct SampledShape {
    pub shape: Vec<Point>,
    /// True when the queried frame lands exactly on a stored keyframe.
    pub keyframe: bool,
}

fn sorted_keyframes(track: &Track) -> Vec<&TrackKeyframe> {
    let mut kfs: Vec<&TrackKeyframe> = track.keyframes.iter().collect();
    kfs.sort_by_key(|k| k.frame);
    kfs
}

fn lerp_point(a: &Point, b: &Point, t: f64) -> Point {
    Point {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
    }
}

fn lerp_shape(a: &[Point], b: &[Point], t: f64) -> Vec<Point> {
    if a.is_empty() || a.len() != b.len() {
        return a.to_vec();
    }
    a.iter().zip(b.iter()).map(|(p, q)| lerp_point(p, q, t)).collect()
}

/// Resolve a track's shape at `frame`, or `None` when the object is not visible.
pub fn sample_at(track: &Track, frame: i64) -> Option<SampledShape> {
    let kfs = sorted_keyframes(track);
    let first = kfs.first()?;
    if frame < first.frame {
        return None;
    }

    let last = kfs[kfs.len() - 1];
    if frame >= last.frame {
        if last.outside {
            return None;
        }
        return Some(SampledShape {
            shape: last.shape.clone(),
            keyframe: frame == last.frame,
        });
    }

    for window in kfs.windows(2) {
        let a = window[0];
        let b = window[1];
        if frame < a.frame || frame >= b.frame {
            continue;
        }
        if a.outside {
            return None;
        }
        if frame == a.frame {
            return Some(SampledShape {
                shape: a.shape.clone(),
                keyframe: true,
            });
        }
        let span = (b.frame - a.frame) as f64;
        let t = if span > 0.0 {
            (frame - a.frame) as f64 / span
        } else {
            0.0
        };
        return Some(SampledShape {
            shape: lerp_shape(&a.shape, &b.shape, t),
            keyframe: false,
        });
    }

    None
}

/// True when a keyframe is stored exactly on `frame`.
pub fn is_keyframe(track: &Track, frame: i64) -> bool {
    track.keyframes.iter().any(|k| k.frame == frame)
}

/// Resolve a track across `[start, end]` (inclusive) stepping by `step`,
/// skipping frames where the object is not visible. Used by track export.
pub fn materialize(track: &Track, start: i64, end: i64, step: i64) -> Vec<(i64, SampledShape)> {
    let step = step.max(1);
    let mut out = Vec::new();
    let mut frame = start;
    while frame <= end {
        if let Some(sampled) = sample_at(track, frame) {
            out.push((frame, sampled));
        }
        frame += step;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn box_kf(frame: i64, x: f64, y: f64) -> TrackKeyframe {
        TrackKeyframe {
            frame,
            shape: vec![
                Point { x, y },
                Point {
                    x: x + 10.0,
                    y: y + 10.0,
                },
            ],
            outside: false,
            occluded: false,
        }
    }

    fn track(keyframes: Vec<TrackKeyframe>) -> Track {
        Track {
            id: "t1".into(),
            project_id: "p1".into(),
            video_id: "v1".into(),
            label_id: None,
            label_name: "car".into(),
            color: "#fff".into(),
            kind: "box".into(),
            keyframes,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    #[test]
    fn interpolates_midpoint_between_keyframes() {
        let t = track(vec![box_kf(0, 0.0, 0.0), box_kf(10, 100.0, 50.0)]);
        let sampled = sample_at(&t, 5).expect("visible at frame 5");
        assert!(!sampled.keyframe);
        assert_eq!(sampled.shape[0], Point { x: 50.0, y: 25.0 });
        assert_eq!(sampled.shape[1], Point { x: 60.0, y: 35.0 });
    }

    #[test]
    fn returns_keyframe_flag_on_exact_frame() {
        let t = track(vec![box_kf(0, 0.0, 0.0), box_kf(10, 100.0, 50.0)]);
        assert!(sample_at(&t, 0).unwrap().keyframe);
        assert!(sample_at(&t, 10).unwrap().keyframe);
        assert!(is_keyframe(&t, 10));
        assert!(!is_keyframe(&t, 5));
    }

    #[test]
    fn invisible_before_first_keyframe() {
        let t = track(vec![box_kf(5, 0.0, 0.0)]);
        assert!(sample_at(&t, 0).is_none());
        // Single keyframe holds forward.
        assert!(sample_at(&t, 99).is_some());
    }

    #[test]
    fn outside_keyframe_hides_until_next() {
        let mut gone = box_kf(5, 0.0, 0.0);
        gone.outside = true;
        let t = track(vec![box_kf(0, 0.0, 0.0), gone, box_kf(10, 100.0, 50.0)]);
        assert!(sample_at(&t, 7).is_none(), "hidden between outside and next kf");
        assert!(sample_at(&t, 10).is_some(), "reappears at next kf");
    }

    #[test]
    fn materialize_skips_invisible_and_steps() {
        let t = track(vec![box_kf(0, 0.0, 0.0), box_kf(4, 40.0, 0.0)]);
        let frames: Vec<i64> = materialize(&t, 0, 4, 2).into_iter().map(|(f, _)| f).collect();
        assert_eq!(frames, vec![0, 2, 4]);
    }
}
