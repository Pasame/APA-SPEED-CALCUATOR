# Fluffy Archive

[자료실 열기](https://pasame.github.io/fluffy-archive/) · [아하 속도 계산기](https://pasame.github.io/fluffy-archive/tools/aha/index.html)

복슬복슬호를 모티브로 한 비공식 게임 자료실입니다. 붕괴: 스타레일, 젠레스 존 제로, 원신, 이환, 명조의 가이드를 게임별로 살펴보고 검색할 수 있습니다.

스타레일 4.7 출시 캐릭터 육성 94종과 메인 딜러별 대표 파티, 다른 네 게임의 입문 가이드 각 1편과 아하 속도 계산기를 제공합니다. 개척자는 운명의 길별로 구분하고 성별 중복은 합칩니다. 장비·스탯은 조건별 추천이며, 확인일과 참고 자료는 각 가이드에서 볼 수 있습니다.

캐릭터 목록은 출시순·가나다순을 양방향으로 정렬할 수 있습니다. 환락 하이퍼캐리에서는 에바네시아·은랑 LV.999·스파키·웨이브를 선택하면 운영과 대체 후보가 함께 바뀝니다.

계산기는 파티 편성, 장비·효과, 목표 속도 역산, 행동 순서, 저장·공유 기능을 유지합니다. 기존 루트 주소의 `#aha=` 공유 설정도 새 계산기로 연결됩니다.

오프라인 계산기는 [tools/aha/index.html](tools/aha/index.html) 파일 하나를 저장해 사용하세요. 자료실 전체를 오프라인에서 보려면 저장소 파일을 함께 내려받아야 합니다.

## 개발

```sh
npm run build
npm test
npm start
```

`site/content.json`과 `site/build.cjs`, `site/styles.css`, `site/app.js`가 자료실의 원본입니다. 기존 `app.html`, `app.js`, `engine.js`, `state.js`는 계산기 원본입니다. 생성된 HTML만 직접 수정하지 마세요.

[개발 안내](DEVELOPMENT.md) · [디자인·자산 기록](DESIGN.md)
