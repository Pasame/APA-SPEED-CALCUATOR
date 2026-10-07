# 상세 설정과 계산 근거

[계산기](https://pasame.github.io/APA-SPEED-CALCUATOR/) · [사용 안내](README.md) · [개발 안내](DEVELOPMENT.md)

## 상세 사용법

`index.html`을 브라우저로 열면 설치와 인터넷 연결 없이 사용할 수 있습니다. 출처 링크를 확인할 때만 인터넷이 필요합니다.

1. **파티 편성**: 캐릭터 옆에 마을 SPD를 입력합니다. 다른 슬롯에 편성한 캐릭터는 중복 선택할 수 없습니다.
2. **돌파·전무·재련**: 캐릭터 바로 아래에서 선택합니다. 효광 2돌과 곽향 1돌 등의 전체 버프는 비환락 캐릭터를 포함한 모든 아군에게 적용합니다. 상시 전무·유물·행적 효과는 마을 SPD에 포함되므로 중복 가산하지 않습니다. 웨이브·서머레토 전무의 조건부 전투 효과는 재련 단계에 맞춰 추가합니다.
3. **캐릭터 세부**: 바커공, 메신저, 앰포리어스, 여전사의 전투 중 효과를 설정합니다. 복잡한 개인 속도·구성 입력은 ‘매우 세부적인 개인 설정’을 열어 수정합니다.
4. **하단 세부**: 상단 ‘세부’를 누르면 추가 전체 버프, 목표 SPD 역산과 출처를 볼 수 있습니다. 행동 순서는 기본 화면에 표시됩니다. 역산 결과는 0.01 단위로 올림합니다.
5. **행동 순서**: 펄·효광 필살기와 기타 행동 증가, 보너스 턴, 속도 버프 시작·종료를 누적 AV 시점으로 추가합니다. 종료는 같은 값의 음수를 입력합니다.

**마을 SPD의 소수점을 반영하지 않으면 실제 결과와 오차가 발생할 수 있습니다.**

## 조건부 효과

조건부 효과는 활성 상태로 계산합니다. 효광은 결계, 곽향은 양명, 히아킨 2돌은 전원 HP 감소 조건 충족을 기본 가정합니다. 캐릭터 세부에서 활성 상태 또는 히아킨 대상별 조건을 해제할 수 있습니다. 완·매 특성은 본인 제외입니다. 바커공과 행동 증가는 SPD를 높이지 않으며 행동 순서에만 영향을 줍니다.

## 기준과 계산 범위

기준은 스타레일 4.6입니다. 캐릭터 효과는 비공식 데이터베이스의 출시 분기 문구, 아하 계수는 커뮤니티 관측식, 행동 게이지는 KQM 연구에 근거합니다. 공식 내부 수치나 실제 게임 전투와 대조한 검증은 아닙니다. 숨은 소수점 반올림과 동속 우선순위는 정확히 재현하지 않습니다.

시뮬레이션은 입력한 효과에 따른 행동 게이지 계산입니다. 캐릭터별 공격·스킬 선택, 에너지, 웃음 포인트, 적 행동, 기억 정령, 협주·Fever, 턴별 버프 만료는 자동 계산하지 않습니다. 해당 발동·종료는 직접 지정해야 합니다. 웨이브 단독 환락의 +25 효과는 실전 총량을 입력하며 중첩 횟수를 자동 가정하지 않습니다.

## 4.7 아하 찌라시

상단 버튼으로 별도 패널을 엽니다. 최초 진입과 다시 가져오기는 4.6 설정의 깊은 복사이며 상태를 공유하지 않습니다. 기본 화면·초기화·기존 기초항 80은 유지합니다. 아하(94, 행적5)는 찌라시에서만 선택할 수 있습니다. 전광 +12/14/16/18/20은 유효 기초 SPD와 구성 입력에 한 번 반영하고 마을 SPD에는 중복 가산하지 않습니다.

확인일 2026-10-07 (재확인), Gachabase v4.6.51 BETA D16706787/R16685262. 출시 전 변경 가능. 편성 아하의 전광 포함 기초 SPD를 아하 타임과 % 기준으로 사용하는 해석은 실기 미검증입니다. 미편성 보유는 전광·행적 없는 94로 제한합니다. 승격 속도는 직접 활성화, 추가 아하 타임·6돌 게이지와 만료는 수동 이벤트입니다. 피해·원력·에너지·포인트·스킵 발동 자동화는 제공하지 않습니다.

10월 5일 적용값과 아하·전광·동료 7명의 승격 효과를 다시 대조했습니다. 현재 공개 자료의 빌드와 계산 관련 수치는 동일하며, 이후 베타 변경은 확인하지 못했습니다. 아하의 속도 125/150 행적은 환락도 +120%/+150% 조건이므로 SPD 버프로 반영하지 않습니다. [베타 데이터 변경 이력](https://hsr.gachabase.net/changelog/beta?lang=ko)도 확인했습니다.

## 출처

아래는 계산기에 수록된 출처입니다.

- [펄 · 스타레일 4.6 · 필살기/2돌/행적/연극인](https://hsr.gachabase.net/characters/1503/pearl/release/4.6.0/16688351?lang=ko)
- [효광 · 결계 중 2돌 +12%, 전용 광추](https://hsr.gachabase.net/characters/1502/yao-guang/release?lang=ko)
- [곽향 · 양명 중 1돌 +12%](https://hsr.gachabase.net/characters/1217/huohuo/release/4.4.0?lang=ko)
- [웨이브 · 출시 기초속도 107 / 단독 환락 예외](https://hsr.gachabase.net/characters/1513/aventurine-waveflair/release/4.5.0/16247584?lang=ko)
- [웨이브 전광 · 환락 스킬 후 속도 +24% (1재)](https://hsr.gachabase.net/lightcones/23064/summer-rides-the-surf/release/4.5.0/16247584?lang=ko)
- [은랑 LV.999 · 기초속도 110 / 전광 +18% (1재)](https://hsr.gachabase.net/characters/1506/silver-wolf-lv999/release?branch=release&lang=ko)
- [스파키 · 2돌 보너스 턴](https://hsr.gachabase.net/characters/1501/sparxie/release?lang=ko)
- [히아킨 · HP 감소 후 2돌 +30%](https://hsr.gachabase.net/characters/1409/hyacine/release?lang=ko)
- [환락 튜토리얼 · 4.6 출시 데이터](https://hsr.gachabase.net/tutorials/battle/2260/path-of-elation/release?lang=en)
- [속도 순위 계수 · 2026-09 관측 정리 (공식 숫자 명시 아님)](https://hohzuki-tries.com/hsr-aha-speed-formula/)
- [행동 게이지·속도 변경 공식 · KQM 연구](https://hsr.keqingmains.com/misc/speed-guide/)
- [개척자 6돌 · 테스트 중 속도 효과 삭제 이력](https://hsr.gachabase.net/diff/characters/8010/stelle-elation?cur=beta_4.1.54_14611439&lang=ko&prev=beta_4.1.53_14536466)
- [완·매 · 자신 제외 +10% (특성 10레벨)](https://hsr.gachabase.net/characters/1303/ruan-mei/release/4.5.0/16247584?lang=ko)
- [댄댄댄·메신저·매 · 출시판 장비 문구](https://hsr.gachabase.net/characters/1306/sparkle/release/4.3.0/15245519?lang=ko)
- [서머레토 전광·앰포리어스 · 전체 속도 조건부 효과](https://hsr.gachabase.net/characters/1512/robin-summeretto/release/4.6.0/16688351?lang=ko)

- [4.7 에이언즈★아하 베타 문구](https://hsr.gachabase.net/characters/1511/aeon-aha/beta?lang=ko)
- [4.7 아하 전용 광추 베타 문구](https://hsr.gachabase.net/lightcones/23065/upon-the-first-echo-of-aha/beta?lang=ko)
