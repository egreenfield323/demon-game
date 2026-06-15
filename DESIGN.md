# SOUL QUOTA — Design

## Premise

A low-level demon on his last warning is sent to the land of the living to close soul contracts door-to-door. Hit the daily quota or get dragged back to the Pit. The horror is bureaucratic; the tone is a Stardew-sweet town where the friendliest guy on the street is shopping for your eternal soul.

## The run (roguelike frame)

- A run is a 7-day work week. Quotas: **1, 1, 2, 2, 3, 3, 4** souls.
- Lose: miss a quota → Satan cinematic → run over. Win: survive day 7.
- Either way you bank **Sin Points** = souls + 2x days completed (+10 for a win), spent in the Orientation Pit on permanent upgrades.
- Each morning you choose 1 of 3 districts; you're committed for the day ("the bus only runs at dawn").

| District | Danger | Pool | Profile |
| --- | --- | --- | --- |
| Murkwell Commons | * | widow, retiree, nurse, artist | low willpower, low value ($1-2), forgiving |
| The Stoop | ** | barfly, artist, nurse, founder | erratic (DRUNK quirks), cheap souls, trusting |
| Gildport Financial | *** | analyst, cryptobro, founder, retiree | high willpower + suspicion, souls worth $2-3 |

## Demon Vision as a resource

**Hellfire** (6/day base) is the scan budget; the vision filter itself is free.

- **Quick scan (1 fire)** — both surface traits (e.g. LONELY, GRIEVING).
- **Deep scan (2 fire, hold E)** — their **Desire** (3x keyword), their **Ick** (the landmine), and any quirk.
- Pitching blind is legal and dangerous: you can discover the Desire or the Ick the hard way mid-conversation.

## The Soul-Bargain (conversation battler)

Their **Willpower** is the shield; **Suspicion** is a tight alarm (cap **50**); **Patience** is the turn limit (min 3).

- Hand of 4 drawn from your deck (start: 12 lines — a full set of basic appeals, so you're never RNG-starved). Play 1 per turn, redraw; discard recycles.
- Keyword multipliers: Desire **3x** / trait affinity **1.75x** / neutral 1x / Ick **0x + 6 bonus suspicion + OFFENDED**.
- **Rapport (combo)**: each resonant line (desire/trait) builds momentum (+2/+1, cap 5) that amplifies damage (+15%/point) **but also ramps the suspicion each appeal generates (+16%/point)** — chaining is a race to close before the alarm trips, not free speed. A misread, an Ick, or a neutral line snaps the chain to 0. **Setup→payoff**: Small Talk primes the next line (+6 dmg); The Fine Print scales +2 dmg per Rapport.
- **Patience** is a firm turn budget (−1/turn, Ick −2). The only regain is hard-earned: a Desire hit landed while the chain is already hot (combo 4+) makes them lean in and skips the turn cost.
- Suspicion gain = card cost x their suspicion rate, x1.5 if DEVOUT, x1.5 while WARY.
- **Moods**: big hits (12+) can make them RECEPTIVE (+25% damage); 30+ suspicion risks WARY; Icks cause OFFENDED (-25% damage, next turn).
- Quirks: **SKEPTIC** halves keyword bonuses, **DRUNK** is -15% willpower but ±40% damage variance, **DEVOUT** as above.
- Fleeing marks raise district heat: +10 starting suspicion for the rest of the day.
- Walking away is safe but burns the mark for the day. Every bargain costs 25 game-minutes.

Utility lines: probes reveal traits mid-talk, soothes dump suspicion, **The Fine Print** (14 dmg) only works under 50% willpower, **Devil's Advocate** converts their suspicion into damage.

## Charms (every boon has a curse)

| Charm | Boon | Curse |
| --- | --- | --- |
| Silver Tongue | +25% damage | +10% suspicion gain |
| Opal of Echoes | free trait reveal each bargain | -1 max Hellfire |
| Dead Man's Watch | +2 patience | day runs 20% faster |
| Quill of the First Lie | +$1 per soul | +1 quota on day 7 |
| Hagstone Monocle | deep scans cost 1 | soul-value auras hidden |
| Velvet Glove | soothes doubled | -1 patience |

Consumables: Brimstone Espresso (+2 fire tomorrow), Bottled Longing (first bargain starts with Desire revealed).

## Meta upgrades (Sin Points)

Ten permanent unlocks on a deep cost curve (you grind several runs for the lot): Forked Tongue (+1 card damage) - Bigger Furnace (+1 fire) - Expense Account (+$3 start) - Night School (Cold Read in deck) - Cool Customer (-15% suspicion gain) - Iron Patience (+1 patience) - Connoisseur (+1 coin/soul) - Unholy Charisma (+15% damage) - Sleight of Hand (draw 5) - HR Loophole (one missed quota forgiven per run).

## Antagonist angels (the Exorcist)

A disguised **angel** can be salted into a district's crowd; Demon Vision shows the halo and an ANGEL warning. Pitch one blind and your cover is blown (heavy heat). Flee too many marks — or blow your cover — and the **Exorcist** spawns to stalk you for the rest of the day. Let it catch you and the Boss is summoned regardless of quota: the run ends. Reach the manhole to escape.

## What's in this slice

Full loop: title → pit → district select → overworld (scan/talk/sleep) → bargain → quota check → commissary → win/loss → meta. 8 archetypes with personality barks, 23 cards, 6 charms, 2 consumables, 5 upgrades, 3 hand-built districts, synthesized SFX, persistent meta save.

## Roadmap (not in slice)

- **Exorcist mini-boss** — flee enough marks in a week and one starts hunting *you*.
- **Contract clauses** — negotiate terms at signing (riskier clause = bigger payout) instead of an instant sign.
- **Building interiors** + door-knocking (the literal door-to-door fantasy).
- **More districts** (Retirement Home, Tech Campus, the Marina) and a 30-day "corporate quarter" mode.
- Deck-thinning at the Commissary; rival demons working your territory; music (the synth bus is ready for a sequencer).
- Balance pass driven by the headless sim: Monte-Carlo whole-run simulations are cheap since the game runs without a browser.

## Numbers worth knowing (tuning reference)

- Day = 8:00→20:00 at ~0.7s per game-minute ≈ 8.4 real minutes, minus 25 min per bargain.
- 7 NPCs per district per day; quota 4 on day 7 means closing over half the street.
- Base deck damage ceiling ≈ 6-dmg keyword lines; a deep-scanned Desire turns those into 18s — scanning *is* the damage economy.
