# Speech Coach (발음 연습)

A web app for practising Korean pronunciation, aimed first at deaf and hard-of-hearing speakers.
It shows the mouth and tongue for a sound and plots the learner's own vowels from the microphone
against Korean targets, so feedback comes through the eyes instead of the ears.

청각장애인의 한국어 발음 연습을 위한 웹 앱이에요. 입과 혀의 모양을 보여주고, 마이크로 들은 내 모음을
한국어 목표 모음과 같은 지도 위에 찍어서, 귀 대신 눈으로 피드백을 받을 수 있어요.

## What's here

- **Mouth and tongue**: a live cross-section of the vocal tract as a simple teaching drawing: a plain
  silhouette with the mouth, nose and throat cut out, colour only on what moves (tongue, lips, soft
  palate), the parts named. Drag the tongue, lips, jaw or soft palate. CHIMERA's glowing-line look
  (with sound pressure, airflow, measurements and a grid) is a toggle (Neon), and a 3D head turns to
  show the front.
- **Vowels**: an F1/F2 map with the Korean vowels ㅣ ㅏ ㅓ ㅗ ㅜ ㅡ. Press **Mic** and say a vowel:
  your voice shows as an amber point, and the nearest target lights up.
- **Speak**: type Korean (or English, or IPA) and watch the mouth say it, slowed down if you like,
  with the gestural score, the tube and the vocal folds. A Korean consonant chart says each
  consonant between two vowels and shows its textbook drawing beside the moving head.
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

## 태블릿에서 열기 / Open it on a tablet

마이크와 AudioWorklet에는 localhost 또는 HTTPS가 필요합니다. 태블릿에서
`http://<PC-IP>:5320`으로 접속하면 마이크를 사용할 수 없습니다.

### 한국어

**방법 1 — Vercel 배포 (HTTPS)**

1. 이 프로젝트를 Git 저장소에 올리고 Vercel에서 가져옵니다. 프로젝트 루트와 Vite를 선택합니다.
2. 저장소의 `vercel.json` 설정으로 배포합니다. 설치 단계에서 rustup으로 Rust와
   `wasm32-unknown-unknown` 타깃을 설치하고 `bun install --frozen-lockfile`을 실행합니다.
   빌드 단계는 Cargo 경로를 추가하여 `bun run build`를 실행하고 `dist`를 배포합니다.
   `.wasm` 응답에는 `application/wasm` 헤더가 적용됩니다.
3. 태블릿에서 발급된 `https://…vercel.app` 주소를 열고 마이크 권한을 허용합니다.

**방법 2 — 같은 Wi-Fi에서 LAN HTTPS 개발 서버**

1. PC와 태블릿을 같은 Wi-Fi에 연결합니다. Windows PowerShell에서 `ipconfig`를 실행하고
   Wi-Fi 어댑터의 IPv4 주소를 찾습니다 (예: `192.168.0.25`).
2. Bun과 OpenSSL이 필요합니다. 기존 개발 서버를 종료하고 프로젝트 루트의 PowerShell에서
   아래 명령을 실행합니다. 인증서는 한 번 생성하며, IP는 실제 PC 주소로 바꿉니다.
   OpenSSL이 PATH에 없다면 `openssl` 대신 Git for Windows에 포함된
   `& "C:\Program Files\Git\usr\bin\openssl.exe"`를 사용할 수 있습니다.

   ```powershell
   New-Item -ItemType Directory -Force .certs
   openssl req -x509 -newkey rsa:2048 -sha256 -nodes -keyout .certs/lan-key.pem -out .certs/lan-cert.pem -days 365 -subj "/CN=Speech Coach LAN" -addext "subjectAltName=IP:192.168.0.25,IP:127.0.0.1,DNS:localhost"
   bun install --frozen-lockfile
   bun run dev:lan
   ```

3. Windows 방화벽에서 개인 네트워크의 TCP 5320 연결을 허용하고, 태블릿에서
   `https://192.168.0.25:5320`을 엽니다. 자체 서명 인증서 경고를 한 번 수락한 뒤
   마이크 권한을 허용합니다. 브라우저가 계속 차단하면 인증서를 기기에서 신뢰하도록
   설정하거나 Vercel 주소를 사용합니다. 게스트 Wi-Fi의 기기 간 통신 차단도 확인하세요.

인증서와 비밀 키는 `.certs/`에 보관되며 Git에서 제외됩니다. PC IP가 바뀌거나 인증서가
만료되면 새 IP로 다시 생성하고 서버를 재시작하세요. `dev:lan`은 기존
`src/wasm/chimera.wasm`을 사용합니다. 새 체크아웃에 wasm이 없다면 Rust 설치 후
`bun run wasm`을 먼저 실행하세요. 기존 `bun run dev`는 그대로 HTTP `127.0.0.1:5320`입니다.
iPad Safari는 마이크에 자체 음성 처리를 적용하므로 음색과 측정값이 달라질 수 있습니다.

### English

The microphone and AudioWorklet require localhost or HTTPS; `http://<PC-IP>:5320` will not
enable the microphone on a tablet.

**Option 1 — Deploy to Vercel (HTTPS)**

1. Push this project to a Git repository and import it into Vercel, selecting the project root and Vite.
2. Deploy using `vercel.json`: the install command uses rustup to install Rust with the
   `wasm32-unknown-unknown` target, then runs `bun install --frozen-lockfile`. The build command
   adds Cargo to PATH and runs `bun run build`. Vercel serves `dist`, with `application/wasm`
   for `.wasm` responses.
3. Open the assigned `https://…vercel.app` URL on the tablet and allow microphone access.

**Option 2 — LAN development over HTTPS**

1. Connect the PC and tablet to the same Wi-Fi. Run `ipconfig` in Windows PowerShell and find
   the Wi-Fi adapter's IPv4 address (for example, `192.168.0.25`).
2. With Bun and OpenSSL installed, stop any existing dev server and run the PowerShell commands
   above from the project root, replacing the example IP with your PC's address. Generate the
   certificate once. If OpenSSL is not on PATH, replace `openssl` with Git for Windows' executable:
   `& "C:\Program Files\Git\usr\bin\openssl.exe"`.
3. Allow inbound TCP port 5320 on your Windows private network. Open `https://192.168.0.25:5320`
   on the tablet, accept the self-signed certificate warning once, then allow the microphone.
   If the browser still blocks access, trust the certificate on the device or use Vercel HTTPS.
   Check that guest Wi-Fi is not isolating devices.

The certificate and private key stay in gitignored `.certs/`. Regenerate them and restart the
server if the PC IP changes or the certificate expires. `dev:lan` uses the existing
`src/wasm/chimera.wasm`; on a fresh checkout without it, install Rust and run `bun run wasm` first.
`bun run dev` remains HTTP on `127.0.0.1:5320`.
iPad Safari applies its own voice processing to the microphone, which can affect timbre and measurements.

Vercel's Rust setup follows the read-only [CHIMERA configuration](https://github.com/jamesondh/chimera-vocal-synth/blob/main/vercel.json).

## Credits

The voice engine (`crates/chimera`, `crates/chimera-wasm`) and the head drawing come from
[CHIMERA](https://github.com/jamesondh/chimera-vocal-synth) by Jameson Hodge, MIT licensed
(see [LICENSE](LICENSE)). The engine crates are kept unchanged so updates can be copied in.
The fonts in `public/fonts/` keep their own licenses (see the files there).

The textbook drawings in `public/sagittal/` are by Richard Wright and Dan McCloy (University of
Washington), from [phonetics-teaching-assets](https://github.com/drammock/phonetics-teaching-assets),
CC0 1.0. The live drawing follows their style.
