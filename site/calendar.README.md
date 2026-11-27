# Home game calendar

`calendar.json` contains checked schedules and their direct official sources. Run `npm run build` after editing it; do not edit the embedded JSON in `index.html`. The browser loads only local assets, without fetching external calendar data.

- `checkedAt`: the actual verification date, not the build date. Dates do not refresh automatically.
- `start` / `end`: Korean dates (`YYYY-MM-DD`) or offset timestamps. End is exclusive. An announcement ending at 15:59 has an end of 16:00. Use `endDisplay` when the original deadline has special wording.
- `instant`: a confirmed broadcast/update start without an invented duration. Date-only starts stay on their calendar day; timed starts disappear after their time.
- `endUnknown`: render only a start marker in the visible date window. Never imply that an unknown end means an indefinitely ongoing event.
- Window: today in Korea plus 41 following days. Ongoing known intervals are clipped visually; their original dates remain visible. Ongoing items sort by earliest end, then upcoming items by start.
- `type`: `gacha`, `event`, `login`, `broadcast`, `update`, `offline`.
- `offline`: only game-company events or confirmed official collaborations in South Korea. Exclude fan gatherings, ordinary merchandise-store promotions and expired collaborations. Retain location and approval/source evidence. This filter is independent of all five game filters.
- `rewards`: only confirmed currencies, tickets, characters and cosmetic/special rewards. `quantity: null` means no confirmed number. Keep purchase, paid-pass, draw, competition and maximum-reward conditions in `note`; never imply that all visitors receive them.
- `image`: a verified local game-item image in `site/assets/calendar/`. Keep its remote `imageUrl`/provenance. If no image is verified, preserve the reward name without an invented replacement picture.
- `coverage`: concise gaps/next-announcement status, folded under schedule information. Future broadcasts with no official date do not get guessed calendar entries.

`calendar.js` shares date/filter logic with `site.calendar.test.cjs`. Regression checks include KST midnight/year rollover, ended-today events, unknown deadlines, broadcast milestones, independent offline filtering, disclosure-preserving refresh and local reward asset existence.
