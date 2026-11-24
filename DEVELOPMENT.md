# 개발 안내

[자료실](https://pasame.github.io/fluffy-archive/) · [계산기](https://pasame.github.io/fluffy-archive/tools/aha/index.html)

## 원본과 빌드

- `engine.js`: 기존 계산 공식, 역산과 행동 시뮬레이션. 위키 통합에서 변경하지 않았습니다.
- `state.js`: 계산기 설정 저장·공유. 저장 키 `aha-calculator-v3`를 유지합니다.
- `app.html`, `app.js`, `art.json`: 계산기 화면·동작·인라인 이미지.
- `site/content.json`: 문서 본문, 검색 키워드, 확인일, 참고 범위, 출처와 관련 문서 ID.
- `site/build.cjs`: 홈, 게임별 자료, 가이드, 검색 화면 생성. 외부 라이브러리를 사용하지 않습니다.
- `site/styles.css`, `site/app.js`: 공통 디자인과 검색·필터.
- `build.js`: 위 원본으로 루트 `index.html`, 게임·가이드·검색 페이지와 독립 계산기 `tools/aha/index.html`을 생성합니다. 기존 Canvas 출력도 유지합니다.

콘텐츠는 현재 구조화된 JSON으로 관리합니다. 섹션과 장비 요약을 안전하게 이스케이프해 렌더링하며, 별도 Markdown 파서나 실행 중 외부 데이터 요청은 사용하지 않습니다. 문서 ID와 `related` 연결은 빌드와 테스트에서 검사합니다.

## 실행과 확인

```sh
npm run build
npm test
npm start
```

로컬 기본 주소는 `http://127.0.0.1:8767/`이며 `AHA_PORT`로 포트를 바꿀 수 있습니다. `/fluffy-archive/` 접두 경로도 지원해 Pages 상대경로를 확인할 수 있습니다.

`npm test`는 기존 계산 86개·상태 13개 테스트와 사이트 회귀 검증을 실행합니다. 사이트 검증은 문서/관련 ID, 상대 링크와 자산, 구형 공유 링크의 최초 진입·해시 변경 전달, 계산기 단일 HTML의 소스 포함 여부를 확인합니다. 먼저 빌드해야 합니다.

기존 `ui.qa.test.cjs`는 설치된 Playwright로 계산기 화면을 검증합니다. `NODE_PATH`와 필요시 `PLAYWRIGHT_CHROME_PATH`를 설정하고 `node ui.qa.test.cjs`를 실행하세요. `QA_SCREENSHOTS_DIR`로 캡처 경로를 지정할 수 있습니다. 이 테스트의 대상 경로만 새 계산기 위치로 바꿨으며 기대값은 유지했습니다.

사이트 홈·검색·가이드·계산기 연결은 1280/390/320px에서 별도 확인합니다. 검색·필터·빈 결과 복구·키보드·가로 넘침·이미지 로드를 포함합니다.

## 배포와 호환성

GitHub Pages는 `main` 루트에서 정적 파일을 제공합니다. `.nojekyll`을 유지합니다. 모든 내부 주소는 프로젝트 경로 아래에서 동작하는 상대 주소입니다.

루트 `#aha=` 링크는 쿼리와 해시를 보존해 계산기로 이동합니다. 계산기는 동일 origin과 저장 키를 사용하며 브라우저의 유효한 기존 설정을 유지합니다. 파일로 내려받거나 Canvas에서 사용할 때 홈 링크는 공개 자료실을 가리킵니다.

## 콘텐츠 범위

첫 공개는 가이드 9편과 기존 계산기입니다. 각 문서는 확인일 및 출처의 적용 범위를 명시합니다. 최신 메타·종결 세팅을 전부 검증했다는 의미는 아닙니다. 이후 게임별 캐릭터·파티 상세를 검증된 자료부터 추가합니다.

과거 `REFERENCE.md`와 `VERIFICATION-*.md`는 계산기 개발 당시의 기록입니다. 과거 버전·모드 설명을 현행 UI 사양으로 사용하지 마세요.
