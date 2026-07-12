# 🎬 DCPG (Découpage) AI Studio - 프로젝트 인수인계서

이 문서는 데쿠파주(DCPG) 비디오 AI 스튜디오 웹 포털 프로젝트를 나중에 다시 이어서 작업하거나, 다른 개발자/AI가 곧바로 파악할 수 있도록 작성된 가이드입니다.

---

## 1. 프로젝트 개요 및 컨셉
* **회사명**: 데쿠파주 (Découpage), 약자 DCPG
* **디자인 컨셉**: 
  * 아날로그 B급 감성 (참조: awge.com 스타일)
  * 브라운관(CRT) TV 프레임, 화면 지지직(Static Noise) 효과, 구형 캠코더(Camcorder) 녹화 화면.
  * Windows 95 스타일의 폴더 및 윈도우 창 UI.
  * 화면 밖에서 날아와 슬롯으로 들어가는 **진짜 6면체 3D 비디오 테이프** 삽입 연출.

## 2. 개발 환경 및 실행 방법
* **기술 스택**: HTML5, Vanilla CSS(3D Transform 집중 활용), Vanilla JavaScript, Vite 빌드 툴.
* **프로젝트 경로**: `video-ai-portal` 폴더
* **실행 방법**:
  1. VSCode나 터미널에서 해당 폴더로 이동합니다.
  2. `npm install` (최초 1회, 이미 되어있을 경우 생략 가능)
  3. `npm run dev` 명령어를 입력합니다.
  4. 브라우저에서 `http://localhost:5173` 으로 접속합니다.

## 3. 폴더 구조 및 주요 파일 설명
```text
video-ai-portal/
├── index.html          # 메인 HTML. TV 베젤, 페이지 영역, 3D 비디오 테이프 뼈대가 들어있습니다.
├── src/
│   ├── styles.css      # 핵심 뼈대! 모든 CSS 애니메이션, 3D 렌더링, Win95 테마가 여기에 있습니다.
│   └── main.js         # 애니메이션 타이밍 제어, 캔버스 노이즈 생성, 윈도우 창 라우팅(화면 전환) 로직.
├── public/             # 추후 이미지나 실제 비디오(.mp4), 아이콘 파일을 넣는 곳입니다.
└── package.json        # Vite 실행 설정 파일.
```

## 4. 핵심 구현 로직 가이드
이 프로젝트를 이어서 수정할 때 알아두어야 할 주요 사항입니다.

### A. 3D 비디오 테이프 (`.vhs-3d-box`)
* `styles.css` 내부의 `.vhs-3d-box` 및 `.face` 클래스들을 통해 CSS만으로 앞/뒤/위/아래/좌/우 6면체를 만들었습니다.
* 크기를 조절하거나 디자인(텍스처)을 입히고 싶다면 `styles.css`의 `/* ── TRUE 3D VHS CASSETTE (CUBOID) ── */` 섹션을 수정하면 됩니다.

### B. 화면 전환 (CRT 효과 및 화면 확대)
* 브라운관 TV가 꺼지는 효과는 `crtElementOff`, 켜지는 효과는 `crtElementOn` 애니메이션(scale 0 ↔ 1)을 사용합니다.
* 아이콘을 클릭해 폴더로 진입할 때 창이 전체화면으로 커지는 것은 `.maximized` 클래스가 동적으로 부여되면서 이루어집니다. (`main.js`의 `switchView` 함수 참고)

### C. 노이즈 및 캠코더 효과 (`main.js`)
* 배경 지지직 화면과 미디어 뷰어의 캠코더 느낌은 HTML `<canvas>` 요소에 JavaScript로 직접 픽셀(Noise)을 찍어내어 구현했습니다.
* 시간 카운터 로직은 프레임 기반으로 `2026-07-07 00:00:00`부터 틱(Tick) 단위로 올라가도록 작성되어 있습니다.

---

## 5. 다음 작업자를 위한 추천 (Next Steps)

1. **실제 영상(.mp4 / .avi) 연결하기**
   * 현재 "AI_REEL.AVI" 뷰와 데스크톱 우측 하단 "미디어 뷰어"는 캔버스를 이용한 가짜(Fake) 노이즈 화면입니다.
   * 영상 준비가 완료되면 `index.html` 내의 `<canvas id="mediaNoiseCanvas">` 요소를 `<video src="./public/your-video.mp4" autoplay loop muted>` 등으로 교체하세요.

2. **디테일한 이미지 에셋 추가**
   * 현재 Windows 95 아이콘들은 텍스트 이모지(📁, ⚙️)로 대체되어 있습니다. 픽셀 아트 스타일의 `.png` 또는 `.ico` 파일을 구해 `public/` 폴더에 넣고 `<img>` 태그로 교체하면 훨씬 아날로그 감성이 살아납니다.
   * 비디오 테이프 표지 부분(`.vhs-label`)에도 커스텀 포스터 이미지를 배경으로 넣으면 멋집니다.

3. **기타 스타일 조정**
   * 배경색, 텍스트 로고 크기 변경 등은 전적으로 `styles.css`에서 제어 가능합니다.

---
**[End of Document]** 
*만들어진 기반은 매우 탄탄하고 유니크합니다. 굿 럭!* 🚀
