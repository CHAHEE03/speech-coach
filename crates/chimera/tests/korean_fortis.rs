use chimera::control::score::{ControlKey, Gesture, Targets};
use chimera::phonetics::korean::word_syllables;
use chimera::phonetics::planner::{PlanOptions, plan_utterance};
use chimera::phonetics::{Plan, Segment};
use chimera::voice::human_voice::HumanVoice;

fn plan(word: &str, rate: f64) -> Plan {
    let segs: Vec<Segment> = word_syllables(word).into_iter().flat_map(|s| s.onset.into_iter().chain([s.nucleus]).chain(s.coda)).collect();
    plan_utterance(&segs, &PlanOptions { rate: Some(rate), ..Default::default() })
}

#[test]
fn fortis_onsets_are_longer_and_release_into_a_brief_pressed_onset() {
    for (lax, tense) in [("가", "까"), ("다", "따"), ("바", "빠"), ("자", "짜"), ("사", "싸"), ("시", "씨")] {
        for rate in [1.0, 2.0] {
            let (a, b) = (plan(lax, rate), plan(tense, rate));
            let dur = |p: &Plan| p.segments[0].t1 - p.segments[0].t0;
            assert!((dur(&b) / dur(&a) - 1.75).abs() < 1e-10, "{lax}/{tense}");
            let release = b.gestures.iter().find(|g| g.label.as_ref().is_some_and(|l| l.as_str() == "fortis release")).unwrap();
            assert!((release.end() - b.segments[0].t1 - 0.01 / rate).abs() < 1e-10);
            let tension = b.gestures.iter().find(|g| g.targets.has(ControlKey::TENSION)).unwrap();
            assert!(tension.t0 < b.segments[1].t0);
            assert!(tension.end() > b.segments[1].t0 && tension.end() < b.segments[1].t1);
            assert!(a.gestures.iter().all(|g| !g.targets.has(ControlKey::TENSION)));
        }
    }
}

#[test]
fn fortis_marks_follow_surface_onsets_and_do_not_change_codas_or_tones() {
    for word in ["까", "아까", "학교", "씨", "쌰", "꽈"] {
        let syllables = word_syllables(word);
        assert!(syllables.iter().any(|s| s.onset.iter().any(|c| c.fortis == Some(true))), "{word}");
        assert!(syllables.iter().all(|s| s.nucleus.fortis.is_none() && s.coda.iter().all(|c| c.fortis.is_none())));
    }
    assert_eq!(word_syllables("밖")[0].coda, word_syllables("박")[0].coda);
    for (a, b) in [("카", "까"), ("사", "싸"), ("차다", "짜다")] {
        let tones = |w| word_syllables(w).iter().map(|s| s.nucleus.tone).collect::<Vec<_>>();
        assert_eq!(tones(a), tones(b));
    }
}

#[test]
fn tension_gesture_changes_the_glottal_pulse_then_restores_the_source() {
    let mut voice = HumanVoice::with_defaults(48000.0);
    let base = voice.glottis.params;
    voice.schedule(&[Gesture::new(0.0, 0.1, 0.01, 0.02, 4.0, Targets::default().with(ControlKey::TENSION, 0.85))]);
    voice.render(&mut vec![0.0; 2400]);
    assert!(voice.glottis.params.open_quotient < base.open_quotient);
    assert!(voice.glottis.params.closure_sharpness > base.closure_sharpness);
    voice.render(&mut vec![0.0; 9600]);
    assert_eq!(voice.glottis.params.open_quotient, base.open_quotient);
    assert_eq!(voice.glottis.params.closure_sharpness, base.closure_sharpness);
}
