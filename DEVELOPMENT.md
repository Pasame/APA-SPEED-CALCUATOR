# 개발 안내

[계산기](https://pasame.github.io/APA-SPEED-CALCUATOR/) · [사용 안내](README.md) · [계산 근거](REFERENCE.md)

## 파일 구성

개발용 파일: `engine.js` 계산, `app.js` 화면, `app.html` 틀, `build.js` 단일 HTML 및 Canvas 파일 생성. 최종 사용 파일은 `index.html` 하나입니다. `aha-speed.canvas.tsx`는 Canvas를 지원하는 편집기에 사용할 수 있는 단일 파일 버전입니다.

`engine.test.js`는 계산 검증, `engine-4.6.fixture.cjs`는 기존 4.6 엔진 회귀 대조에 사용합니다. `server.js`는 로컬 미리보기 서버입니다.

## 실행과 빌드

로컬 미리보기: `npm start` 실행 후 `http://127.0.0.1:8767/` 접속. 서버 없이도 HTML 파일을 직접 열 수 있습니다. 화면이나 계산식을 수정한 뒤 `npm run build`로 배포용 `index.html`을 다시 생성합니다.

```sh
npm start
npm test
npm run build
```

원본인 `engine.js`, `app.js`, `app.html`을 수정한 뒤 빌드합니다. 생성된 `index.html`만 수정하지 않습니다.

## 기존 검증 기록

`npm test` (계산 검증 50개; 기존 32개 기대값 유지 + 4.6 원본 엔진 회귀 대조). 모바일 320/390/768px와 PC 1280px, 어두운 테마, 중복 선택, 돌파·전무·재련, 전체 버프와 조건부 제외, 세부 접기, 행동 기록의 화면 검증도 수행했습니다. 찌라시 패널의 설정 분리·다시 가져오기·키보드 열기/닫기·전광/구성 입력·수동 아하 타임·오프라인 실행도 검증했습니다.

위 항목은 기존 README의 검증 기록을 옮긴 것입니다. 계산을 변경할 때는 `npm test`를 다시 실행하고, 화면 동작은 별도로 확인합니다.

## 배포

QA 수정 검증: 기존 50개 계산 테스트를 유지한 총 56개 `npm test` 통과. 추가 검증은 자동 이벤트의 이전 수치 무시, 잘못된 시간·수동 수치 보존, 슬롯별 단일 오류와 복구를 확인합니다. 1280/390/320px의 두 모드에서 입력 우선 배치, 가로 넘침, 보유 상태 복원, 설정 분리·가져오기·초기화, 키보드와 오프라인 실행을 `ui.qa.test.cjs`로 확인했습니다.

UI 회귀 검증은 이미 설치된 Playwright를 사용해 `node ui.qa.test.cjs`로 실행합니다. 필요한 경우 `NODE_PATH`로 해당 설치 위치를 지정하고 `PLAYWRIGHT_CHROME_PATH`로 브라우저 실행 파일을 지정합니다. `QA_SCREENSHOTS_DIR`를 지정하면 각 화면 크기의 캡처도 저장합니다. 실행용 HTML에는 의존성이 추가되지 않습니다.

GitHub Pages: `main` 브랜치 루트의 `index.html`을 배포합니다. `.nojekyll`로 별도 사이트 빌드 없이 정적 파일을 제공합니다.

## 4.7 패널 상태 분리

최초 진입과 ‘다시 가져오기’는 기존 4.6 설정을 깊은 복사하며 상태를 공유하지 않습니다. 기본 화면, 초기화, 기존 기초항 80을 유지합니다. 베타 전용 캐릭터와 설정은 기본 계산기에 영향을 주지 않아야 합니다.
