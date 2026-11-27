# Home game calendar

`calendar.json` contains checked schedules and their direct official sources. Run `npm run build` after editing it; do not edit the embedded JSON in `index.html`. The browser loads only local assets, without fetching external calendar data.

- `checkedAt`: the actual verification date, not the build date. Dates do not refresh automatically.
- `start` / `end`: Korean dates (`YYYY-MM-DD`) or offset timestamps. End is exclusive. An announcement ending at 15:59 has an end of 16:00. Use `endDisplay` when the original deadline has special wording.
- `instant`: a confirmed broadcast/update start without an invented duration. Date-only starts stay on their calendar day; timed starts disappear after their time.
- `endUnknown`: render only a start marker in the visible date window. Never imply that an unknown end means an indefinitely ongoing event.
- Window: today in Korea plus 41 following days, with yesterday at the left edge for context. The vertical line marks today. Each week runs Sunday through Saturday. Rows sort by their visible start, then end, then category. The details show the original dates of clipped intervals.
- Hover, focus or tap a week to see its dates and the versions of the selected games. A version change within a week displays both versions. Estimated versions carry an `예상` label.
- After filtering, entries share a bar when their game, known version, category and exclusive end time match and either both started before today in Korea or their start times match exactly. Compare timestamps before clipping to the chart. When starts differ, show the shared deadline on the bar and each original period in the details.
- Keep official source URLs and research notes in the dataset so maintainers can verify dates and rewards. Put eligibility details needed to understand a listed reward in the reward's `note`.
- `calendar-pickups.json` maps event IDs to featured characters and weapons. Keep each verified local image with its item name. Desktop hover, keyboard focus and tapping a bar reveal its details.
- `type` uses one of nine categories.
  - `gacha` (픽업·뽑기) covers character and equipment banners.
  - `event` (인게임 이벤트) covers quests, challenges and other activities played in the game.
  - `endgame` (엔드 콘텐츠) covers rotating endgame challenge periods. It has its own opt-in filter.
  - `web` (웹 이벤트) covers activities completed on an official website. Use this type when the site hosts the activity and the game delivers its rewards.
  - `login` (출석) covers check-in campaigns that grant rewards for multiple days of attendance.
  - `claim` (접속 보상) covers one-time login rewards, including gifts sent to the in-game mailbox. Record any claim window and eligibility in the event notes or reward notes.
  - `broadcast` (공식 방송) and `update` (버전 업데이트) cover confirmed broadcast and version release schedules.
  - `offline` (국내 공식행사) covers confirmed official events in South Korea.
- The calendar initially selects 픽업·뽑기, 인게임 이벤트, 공식 방송 and 버전 업데이트. Use the category toggles to include 웹 이벤트, 출석, 접속 보상 or 국내 공식행사.
- `offline`: only game-company events or confirmed official collaborations in South Korea. Exclude fan gatherings, ordinary merchandise-store promotions and expired collaborations. Retain location and approval/source evidence. This filter is independent of all five game filters.
- `rewards`: record the per-player amount for the stated period. Use `maximum: true` for a verified cap and `quantity: null` for an unknown count. Keep the source with the reward when it differs from the schedule source. Keep purchase, draw, and clear conditions in `note`.
- `image`: a verified local game-item image in `site/assets/calendar/`. Keep its remote `imageUrl`/provenance. If no image is verified, preserve the reward name without an invented replacement picture.
- `coverage` records verification gaps and upcoming announcement status for the next data refresh. Add future broadcasts once an official date is available.

`calendar.js` shares date/filter logic with `site.calendar.test.cjs`. Regression checks include KST midnight/year rollover, ended-today events, unknown deadlines, broadcast milestones, independent offline filtering, disclosure-preserving refresh and local reward asset existence.
