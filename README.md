# Speech Coach (발음 연습)

A web app for practising Korean pronunciation, aimed first at deaf and hard-of-hearing speakers.
It shows the mouth and tongue for a sound and plots the learner's own vowels from the microphone
against Korean targets, so feedback comes through the eyes instead of the ears.

청각장애인의 한국어 발음 연습을 위한 웹 앱이에요. 입과 혀의 모양을 보여주고, 마이크로 들은 내 모음을
한국어 목표 모음과 같은 지도 위에 찍어서, 귀 대신 눈으로 피드백을 받을 수 있어요.

## What's here

- **Mouth and tongue**: a live cross-section of the vocal tract (drag the tongue, lips, jaw, soft
  palate), or a 3D head to turn and see from the front; sound pressure, airflow, measurements and a grid
  can be shown on it.
- **Vowels**: an F1/F2 map with the Korean vowels ㅣ ㅏ ㅓ ㅗ ㅜ ㅡ. Press **Mic** and say a vowel:
  your voice shows as an amber point, and the nearest target lights up.
- **Speak**: type Korean (or English, or IPA) and watch the mouth say it, slowed down if you like,
  with the gestural score, a consonant chart, the tube and the vocal folds.
- **Sound**: the spectrum and spectrogram of the voice.
- **Voice**: dials for pitch, breath, tone, mouth, tongue and throat.
- Korean and English interface (한국어 / EN).

## Run it

Needs Rust with the `wasm32-unknown-unknown` target, and Bun.

```sh
bun install
bun run dev        # builds the wasm engine, then Vite on 127.0.0.1:5320
bun run test       # wasm build, cargo test, bun test
```

The microphone needs a secure context: open it on localhost or over HTTPS.

## Credits

The voice engine (`crates/chimera`, `crates/chimera-wasm`) and the head drawing come from
[CHIMERA](https://github.com/jamesondh/chimera-vocal-synth) by Jameson Hodge, MIT licensed
(see [LICENSE](LICENSE)). The engine crates are kept unchanged so updates can be copied in.
The fonts in `public/fonts/` keep their own licenses (see the files there).
