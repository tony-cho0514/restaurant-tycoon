# Design lessons from deep business / tycoon sims (economy, crisis pacing, information design, long-term engagement)

Research date: 2026-10-30. Scope: the systems layer only (economy, events, feedback, dashboards, difficulty curve, failure, expansion), not graphics.

Source notes for the report writer:
- **Steam review %** comes from a SteamSpy API snapshot taken on 2026-10-30. Steam's own review API redirected and could not be read, and SteamSpy counts can lag Steam's live numbers. Use them as approximate.
- **Most-helpful negative reviews** were read on each game's Steam community page ("negativereviews, top rated, English") on 2026-10-30. They are paraphrased below with hours played, date and helpful votes where shown.
- **vaporlens.app** is an aggregator that machine-summarises Steam reviews. Its "weights" are relative mention frequencies, not percentages. Treat it as secondary evidence.
- **Quotes:** paraphrase is used almost everywhere, and the one direct quote is under 15 words.

---

## Q1. Per game: what players praise and criticize about the economy and progression

### Takeaway
Across all 11 games, praise centres on the early "garage to empire" climb and on systems where cause and effect can be read. Criticism clusters on four things:
- the mid and late game turning into repetition or passive income
- micromanagement that grows with scale
- opaque scoring or opaque swings in income
- "differences" between options that are only cosmetic

The best-rated titles (RimWorld 98%, Game Dev Tycoon 95%, Software Inc. 94%) all have a readable feedback loop. Even so, their negative reviews still attack late-game hollowness.

### Cited Findings

**Review snapshot (SteamSpy, retrieved 2026-10-30; positive share of positive + negative):**

| Game | Positive | Reviews (approx.) |
|---|---|---|
| RimWorld | 98.0% | ~210k |
| Game Dev Tycoon | 95.4% | ~35.8k |
| Software Inc. | 94.4% | ~7.2k |
| Big Ambitions | 92.9% | ~10.7k |
| Frostpunk | 92.5% | ~123.5k |
| Two Point Hospital | 91.9% | ~33.3k |
| Planet Coaster | 91.3% | ~70k |
| RollerCoaster Tycoon 2: Triple Thrill Pack | 89.3% | ~5.4k |
| Prison Architect | 89.1% | ~72k |
| Capitalism 2 | 81.7% | ~0.5k |
| Startup Company | 81.5% | ~6.1k |
| Offworld Trading Company | 77.0% | ~5.6k |
| Planet Coaster 2 | 65.2% | ~9.3k |

- Sources (SteamSpy API, by app ID): [RimWorld](https://steamspy.com/api.php?request=appdetails&appid=294100), [GDT](https://steamspy.com/api.php?request=appdetails&appid=239820), [Software Inc.](https://steamspy.com/api.php?request=appdetails&appid=362620), [Big Ambitions](https://steamspy.com/api.php?request=appdetails&appid=1331550), [Frostpunk](https://steamspy.com/api.php?request=appdetails&appid=323190), [Two Point Hospital](https://steamspy.com/api.php?request=appdetails&appid=535930), [Planet Coaster](https://steamspy.com/api.php?request=appdetails&appid=493340), [Planet Coaster 2](https://steamspy.com/api.php?request=appdetails&appid=2688950), [RCT2 TTP](https://steamspy.com/api.php?request=appdetails&appid=285330), [Prison Architect](https://steamspy.com/api.php?request=appdetails&appid=233450), [Capitalism 2](https://steamspy.com/api.php?request=appdetails&appid=638200), [Startup Company](https://steamspy.com/api.php?request=appdetails&appid=606800), [Offworld](https://steamspy.com/api.php?request=appdetails&appid=271240)
- Capitalism Plus has 83.8% of ~111 reviews. A Steam store search for "Capitalism Lab" returned no Lab entry, only Capitalism 2 and Capitalism Plus. — [SteamSpy Capitalism Plus](https://steamspy.com/api.php?request=appdetails&appid=450120)
- Prison Architect 2 (app 1257610) shows no reviews on SteamSpy as of 2026-10-30. — [SteamSpy](https://steamspy.com/api.php?request=appdetails&appid=1257610)

**Big Ambitions (Hovgaard Games)**

*Status*
- 1.0 full release on **2026-08-28**, after about 3 years in Early Access. 1.0 added The Hamptons, the 7th neighbourhood. The first post-release fix build, 3672/3674, came out on 2026-09-01. — [Steam announcement "Big Ambitions 1.0 FULL RELEASE"](https://steamcommunity.com/games/1331550/announcements/detail/716786116904093573); [InGameNews, 2026-08-30](https://ingamenews.com/pc-gaming/big-ambitions-1-0-unleashes-expansive-new-york-tycoon-experience/)
  - The date comes from the search summary of the Steam and X posts; the fetched Steam page itself showed only the title. One repack listing says 2026-09-02, which is unreliable.
- 1.0 systems relevant here:
  - an HQ where hired managers take over logistics and HR
  - a new **Pricing Manager** who runs a whole neighbourhood's stores
  - a banking overhaul covering loans, investments and taxes
  - Lifetime peak above 12,000 concurrent Steam players.
  - Source: [InGameNews](https://ingamenews.com/pc-gaming/big-ambitions-1-0-unleashes-expansive-new-york-tycoon-experience/)

*Praised*
- Deep pricing, inventory and logistics.
- The "just one more day" pull.
- A charming early game.
- The climb from a small shop to an empire.
- Automating deliveries felt like a key unlock.
- Source (aggregated): [vaporlens](https://vaporlens.app/app/1331550/big_ambitions.md)

*Criticized: late game*
- The most frequent complaint: the game gets repetitive after roughly 10–20 hours. — [vaporlens](https://vaporlens.app/app/1331550/big_ambitions.md)
- Most-helpful negative reviews, paraphrased — [Steam negative reviews](https://steamcommunity.com/app/1331550/negativereviews/?browsefilter=toprated&filterLanguage=english):
  - Early game strong, but manual store building, supply setup and no automation make the later game tedious (59.8 h, 2023-04-08, 249 helpful).
  - Scaling up turns into furnishing, hauling and hiring; it feels like decorating rather than running a business (247 helpful).
  - Managers still need manual scheduling and task assignment, and logistics cannot be planned at a macro level (233 helpful).
  - The rivalry system mostly comes down to adjusting prices (94.4 h, 2024-03-16).
  - Passive income makes the game too easy and leaves an empty loop once you are rich (2023-07-12).
  - Store types feel only superficially different (2025-03-07).
  - Employees messaging the CEO with complaints contradicts the idea of delegating HR (2025-03-29).

*Criticized: early economy*
- Vehicle repair and towing costs drain early money.
- The first hours are slow and hard, and some players go bankrupt early.
- Sleep, hunger and happiness upkeep feels like busywork.
- Source (aggregated): [vaporlens](https://vaporlens.app/app/1331550/big_ambitions.md)

**Capitalism Lab / Capitalism II (Enlight)**

*Praised*
- A long-form review (2025-11-13) calls the base game a genuinely competitive business sim.
- Product-specific consumer behaviour: brand matters for clothing but not for staples.
- Cost can be traded against quality.
- Emergent failures, e.g. import freight costs losing a price war, or an undersized factory breaking the supply chain and forcing a loan.
- Source: [Legacy of Games review](https://legacyofgames.com/2025/11/13/capitalism-lab)

*Criticized*
- The AI appears to cheat, reaching high technology without R&D centres.
- DLC adds tedium: R&D overhaul, a pointless talent-headhunting system, and a services DLC buried in logistics busywork.
- Retail stores are capped at four items.
- Mansions and CEO salaries serve no purpose.
- The "Lab" is mostly a UI modernisation of Capitalism II.
- Source: [Legacy of Games](https://legacyofgames.com/2025/11/13/capitalism-lab)

*Learning curve*
- The developer's own guide concedes the game can feel daunting. — [capitalismlab.com](https://capitalismlab.com/?p=7180)
- A player calls the curve steep, especially without help. — [itch.io post](https://itch.io/post/1927815)

**Game Dev Tycoon (Greenheart Games)**

*Critic scores*
- Metacritic: PC 68, iOS 89, Switch 81. — [Wikipedia](https://en.wikipedia.org/wiki/Game_Dev_Tycoon)

*Praised*
- Replayability.
- The garage-to-industry progression arc.
- Source (aggregated): [vaporlens](https://vaporlens.app/app/239820/game_dev_tycoon.md)

*Criticized*
- Repetitive mid-game loop.
- Unbalanced economy and frequent bankruptcy.
- No tutorial explaining scores.
- Source (aggregated): [vaporlens](https://vaporlens.app/app/239820/game_dev_tycoon.md)

*Most-helpful negative reviews* — [Steam negative reviews](https://steamcommunity.com/app/239820/negativereviews/?browsefilter=toprated&filterLanguage=english)
- Shallow: management choices rarely matter and unconventional experiments fail (28.3 h, 2013-12, 452 helpful).
- Every game must beat your last one, which blocks smaller projects (2017-05, 351 helpful).
- Scores are judged against your own past games, the tech/design ratio is opaque, and slider hints mislead (2015-08, 270 helpful).
- Early success makes later reviews worse; one reviewer says the game "punishes you for doing well" (2016-04).
- The loop is: pick a genre, publish, wait, repeat; the story ends about 4 hours in (2022-07).
- Relative-to-self scoring eventually forces bankruptcy (2021-06).

*How the scoring works (community account, not official)*
- A Steam thread says review scores depend on how much better the game is than your previous best.
- A new record on one of Design/Technology gives roughly 8–9; a 10 needs records on both.
- Source: [Steam discussion](https://steamcommunity.com/app/239820/discussions/0/1639788130290877045)

**Startup Company (Hovgaard Games, same studio as Big Ambitions)**

Most-helpful negative reviews — [Steam negative reviews](https://steamcommunity.com/app/606800/negativereviews/?browsefilter=toprated&filterLanguage=english):
- Progression is click-heavy and tier-based (2017-12, 323 helpful).
- Forced milestones make the whole game feel like a tutorial (2020-04, 255 helpful).
- Early play is manual clicking and later the money arrives on its own; the reviewer likens it to Cookie Clicker (2017-08, 220 helpful).
- Ad revenue and auto-renewing clients come too easily, and late-game chains are repetitive (2021-01).
- Late growth needs exponential hiring for near-linear returns, so it feels like an idle game (59.9 h, 2019-08).
- The game is mostly waiting, and office furniture has no real effect.

**Software Inc. (Coredumping)**

Most-helpful negative reviews — [Steam negative reviews](https://steamcommunity.com/app/362620/negativereviews/?browsefilter=toprated&filterLanguage=english):
- Hollow: software and companies lack distinction, so success brings no sense of achievement (49.6 h, 2017-03, 156 helpful).
- Early success is too easy, with little middle ground; once a product hits, progression stalls (2020-07).
- Mechanics pile up, are mandatory, and cannot be opted out of (469 h).
- Staff skill micromanagement becomes unworkable at scale (190 h, 2020-12).
- Features are poorly explained; the reviewer could not tell how many staff or marketers were needed (2023-12).
- One min-max strategy is usually best (2024-01).

**Two Point Hospital (Two Point Studios / SEGA)**

*Progression structure*
- One star in a hospital unlocks the next level. Players can return later for two or three stars. — [Wikipedia](https://en.wikipedia.org/wiki/Two_Point_Hospital)
- The developers said the star system lets players progress and come back, and that it is not a copy of mobile mechanics. — [TheSixthAxis interview](https://www.thesixthaxis.com/?p=318888)
- Lead designer Ben Huskins said each hospital pushes the player toward different priorities. — [PC Gamer hands-on](https://www.pcgamer.com/uk/two-point-hospital-hands-on-theme-hospital-fans-are-getting-the-exact-game-they-want-with-a-few-twists/)
- Later star rewards are mostly cosmetic and run out midway through three-starring. — [Steam discussion (2018)](https://steamcommunity.com/app/535930/discussions/0/2590022385655039854)

*Praised vs. criticized (aggregated)*
- Repetition is the single largest complaint (weight 0.52).
- Statistics screens and the gradual difficulty rise are praised.
- Source: [vaporlens](https://vaporlens.app/app/535930/two_point_hospital.md)

*Most-helpful negative reviews* — [Steam negative reviews](https://steamcommunity.com/app/535930/negativereviews/?browsefilter=toprated&filterLanguage=english)
- Staff AI wastes effort, forcing over-hiring and micromanagement; overview screens are split and hard to compare (56 h, 2019-06, 724 helpful).
- Reputation rises too fast and players get swamped (2018-09).
- Repeated scenarios with no sandbox give no sense of owning a hospital (2018-09-13).
- Income swings sharply with no clear cause, and the advisor nags (301 h, 2018-09).
- Later levels are tedious: the same rooms rebuilt and easy star goals (2019-08).

**RollerCoaster Tycoon / Planet Coaster**

*RCT economy structure*
- Even the sandbox-like park gives only a fixed $50,000 loan, not unlimited money. — [Wikipedia RCT1](https://en.wikipedia.org/wiki/RollerCoaster_Tycoon_(video_game))
- RCT2's scenario editor sets objectives and the available rides. — [Wikipedia RCT2](https://en.wikipedia.org/wiki/RollerCoaster_Tycoon_2)
- RCT3 has three objective tiers per scenario: Apprentice, Entrepreneur, Tycoon. — [Wikipedia RCT3](https://en.wikipedia.org/wiki/RollerCoaster_Tycoon_3)
- Fan guides tell players to check each scenario's loan limit and interest rate on arrival. — [RCT fandom General Scenario Guide](https://rct.fandom.com/wiki/General_Scenario_Guide)

*Chris Sawyer on design*
- He said he had no formal design philosophy and simply built ideas he found fun. — [Eurogamer interview 2016 (PDF mirror)](https://www.tt-ms.de/presse/eurogamer_2016-03-03.pdf)

*Planet Coaster*
- The top negative reviews are dominated by DLC pricing and by performance: AI on a single core, about 15 fps around 2,000 guests.
- One reviewer notes that others criticise the management layer but says they like it.
- Source: [Steam negative reviews](https://steamcommunity.com/app/493340/negativereviews/?browsefilter=toprated&filterLanguage=english)

**Prison Architect (Introversion)**

- The 5-mission campaign is widely described as a tutorial in disguise, and the developers framed it that way too. — [bit-tech review](https://bit-tech.net/reviews/gaming/prison-architect-review/1/); [TheSixthAxis interview](https://www.thesixthaxis.com/2015/10/06/prison-architect-interview/)
- Money is very tight; a reviewer notes you can go bankrupt before finishing the first cell block. — via search summary of review coverage; [bit-tech review](https://bit-tech.net/reviews/gaming/prison-architect-review/1/)
- Early grants plus an accountant feed daily income to spend on upgrades (single player account). — [Felix Online](https://felixonline.co.uk/articles/2013-11-13-create-and-run-your-own-prison/)

**Offworld Trading Company (Mohawk Games, Soren Johnson)**

*Design intent*
- An "economic RTS" with no military, built around economics instead of combat. — [Quarter to Three](https://quartertothree.com/fp/?p=31329)
- It drops unit selection, favours macro strategy, and keeps the ~30-minute RTS match. — [Designer Notes, GDC postmortem page](https://designer-notes.com/offworld-trading-company-gdc-postmortem)

*Most-helpful negative reviews* — [Steam negative reviews](https://steamcommunity.com/app/271240/negativereviews/?browsefilter=toprated&filterLanguage=english)
- Abstracted shipping reduces the economy to build order plus sabotage (572 helpful, 2015-04).
- No mid or late game, just the same short match repeated (379 helpful, 2017-05).
- Games play out in a predictable pattern (2017-05).
- Matches are short and often end in hostile takeovers (2016-12).
- Nothing to do for the last ~30% of a match; tutorials take longer than matches (2022-02).

**Frostpunk (11 bit studios)**

- Hope and discontent are separate meters, driven by different things, and both can be full or empty. — [PC Gamer devs interview](https://www.pcgamer.com/au/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws)
- If hope stays too low or discontent too high for long enough, citizens revolt and the game ends. — [Wikipedia](https://en.wikipedia.org/wiki/Frostpunk)
- A reviewer notes you often have to make everyone unhappy to keep them alive. — [PC Gamer review](https://pcgamer.com/frostpunk-review)

**RimWorld (Ludeon, Tynan Sylvester)**

- A story generator, not a contest: it is about the drama, tragedy and comedy in the colony, not winning or losing. — [Wikipedia](https://en.wikipedia.org/wiki/RimWorld)
- Event pacing details are under Q2.

### Inferences
- The games praised for their *economy* (Capitalism, Big Ambitions early game, GDT) all have at least one strong, legible trade-off: price vs. satisfaction, quality vs. cost, or design vs. tech.
- The games criticised for their *economy* fail in one of two ways:
  - The trade-off collapses into a single dominant strategy: Software Inc. min-max, Offworld build order, Big Ambitions rivalry reduced to price.
  - The trade-off is hidden: GDT relative scoring, Two Point income swings.
- Startup Company and Big Ambitions come from the same studio and draw the same critique: passive income makes the late game idle. This looks structural to "shop → empire" sims whose revenue scales with assets while decision count does not.

### Gaps
- No primary Two Point Hospital postmortem or GDC talk was found.
- The content of Soren Johnson's Offworld postmortem was not retrieved; only the abstract page was.
- Prison Architect's negative-review page did not render, so there is no top-negative-review evidence for it.
- Capitalism Lab's own Steam reviews were not located (the store search did not return the Lab).
- Planet Coaster 2's 65% rating is recorded, but its causes were not researched.
- Steam's live review numbers could not be read; SteamSpy counts may lag.

---

## Q2. How the best sims pace events and crises, and what makes randomness feel fair or unfair

### Takeaway
RimWorld and Frostpunk both make pressure *adaptive and readable*:
- RimWorld eases off after losses, lets disasters play out slowly, and scales threats by settings the player chooses.
- Frostpunk forecasts the next cold wave so the player always sees a demanding goal approaching, then gives a sign of hope.

Randomness feels unfair when:
- threat scales with something the player is rewarded for building (RimWorld wealth)
- outcomes depend on a hidden yardstick (GDT)
- streaks pile up with no recovery window (Randy Random)

### Cited Findings

**RimWorld storytellers: mechanics**
- Each storyteller weighs colony wealth, building wealth, colonist count, animals, recent deaths or injuries, and time since the last major event. — [RimWorld Wiki: AI Storytellers](https://rimworldwiki.com/wiki/AI_Storytellers)
- Threat scale by difficulty — [RimWorld Wiki](https://rimworldwiki.com/wiki/AI_Storytellers):
  - Peaceful 10%, Community builder 30%, Adventure story 60%, Strive to survive 100%, Blood and dust 155%, Losing is fun 220%.
  - A "wealth-independent" option replaces wealth with a time curve that peaks after N years (default 12).
- The three storytellers — [RimWorld Wiki](https://rimworldwiki.com/wiki/AI_Storytellers):
  - Cassandra: a rising curve; she pushes hard, gives breathing room, then pushes again.
  - Phoebe: long gaps for building.
  - Randy: pure random, which can produce long streaks of hard events. Randy's event density was cut to roughly Cassandra's in v0.14.
- Protections added over time — [RimWorld Wiki](https://rimworldwiki.com/wiki/AI_Storytellers):
  - v0.4.460 let storytellers consider wealth and let a colony recover from serious damage.
  - An "adaptation" score rises while the colony does well and drops when colonists are hurt, which eases pressure after losses.
  - Population intent makes colonist-joining events rarer as the colony grows.

**RimWorld: Sylvester's design intent**
- The storyteller eases off when the colony population drops. — [Game Developer](https://gamedeveloper.com/design/how-i-rimworld-i-fleshes-out-the-i-dwarf-fortress-i-formula)
- Incidents are built to overlap and last: fallout lasts days, fires spread slowly, sieges last days. This makes interactions likely, e.g. a trader arriving mid-siege. — [Game Developer](https://gamedeveloper.com/design/how-i-rimworld-i-fleshes-out-the-i-dwarf-fortress-i-formula)
- Raiders who win steal or kidnap and leave rather than wipe the colony. Sylvester wants the downward spiral to play out over a long arc, or even reverse, because losing is dramatic. — [Game Developer](https://gamedeveloper.com/design/how-i-rimworld-i-fleshes-out-the-i-dwarf-fortress-i-formula)
- The storyteller concept is modelled on Left 4 Dead's AI Director. — [RimWorld Wiki: About RimWorld](https://rimworldwiki.com/wiki/About_RimWorld)
- One analysis argues the design leans on apophenia: players read stories into randomness. — [Habrador blog](https://blog.habrador.com/2019/06/why-rimworld-sold-more-than-1-million.html)

**RimWorld: the fairness complaint (wealth scaling)**
- Players complain there is no room to build nice things because raids scale with wealth.
- They also say raids arrive even when no attacker could plausibly know what the colony is worth.
- Source: [Steam discussions](https://steamcommunity.com/app/294100/discussions/0/598519626423344802)
- Counterpoints from the wiki — [RimWorld Wiki: Wealth management](https://rimworldwiki.com/wiki/Wealth_management):
  - Buildings count at half value for raids.
  - Extreme wealth management matters mainly on extreme difficulty.
  - Custom settings allow time-based instead of wealth-based scaling.
  - Mods such as "Visible Raid Points" exist to *show* what drives raid size.

**Frostpunk**
- Developers describe the final storm as the game's final, hardest test and wanted the game to end like a novel rather than an open sandbox. — [PC Gamer devs interview](https://www.pcgamer.com/au/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws) (via search summary; the full page did not load)
- A critical analysis says the weather forecast paces the game so a demanding goal is always approaching, followed by a sign of hope. It also argues the law choices often have an obviously optimal answer. — [indienova critical play report](https://lab.indienova.com/indie-game-review/critical-play-report-frostpunk/) (via search summary; direct fetch returned 403)
- Scenario-writing talk (IGC 2018): decide the scenario's ending as early as possible, and treat moral choices as central. The talk was titled "Empathize with Numbers". — [Inven Global](https://www.invenglobal.com/articles/6528/igc-2018-empathize-with-numbers-the-process-of-frostpunk-scenario-writing)
- 11 bit's Marta Fijak on how hard it is to empathise with a crowd of 500. — [PCGamesInsider](https://www.pcgamesinsider.biz/news/67933/11bits-marta-fijak-empathising-with-500-people-is-hard-in-frostpunk/)

**Unfair-feeling outcomes in business sims**
- GDT players read relative-to-self scoring as arbitrary and luck-driven. — [vaporlens](https://vaporlens.app/app/239820/game_dev_tycoon.md); [Steam negative reviews](https://steamcommunity.com/app/239820/negativereviews/?browsefilter=toprated&filterLanguage=english)
- Two Point players report income swinging with no clear cause. — [Steam negative reviews](https://steamcommunity.com/app/535930/negativereviews/?browsefilter=toprated&filterLanguage=english)
- Offworld players say matches look random but follow a predictable pattern. — [Steam negative reviews](https://steamcommunity.com/app/271240/negativereviews/?browsefilter=toprated&filterLanguage=english)
- Big Ambitions players report the opposite problem: too little randomness, so the mechanics feel predictable. — [Steam negative reviews](https://steamcommunity.com/app/1331550/negativereviews/?browsefilter=toprated&filterLanguage=english)

**Explained vs. unexplained failure (GDT piracy build, 2013)**
- Greenheart released a cracked build of GDT in which the player's in-game studio was hit by piracy.
- Pirates then complained on forums about piracy ruining their in-game company.
- Source: [TorrentFreak](https://torrentfreak.com/game-pirates-whine-about-piracy-in-game-dev-simulator-130429/); [PC Gamer](https://www.pcgamer.com/au/indie-development-sim-game-dev-tycoon-gives-pirates-a-taste-of-their-own-torrenting)

### Inferences
- **Fair randomness has four properties:**
  1. Telegraphed: a forecast, a supplier hint.
  2. Attributable afterwards: the player can name the cause.
  3. Recoverable: adaptation drops after losses, and raiders leave instead of wiping the colony.
  4. Scaled by something the player understands and chose: difficulty settings, time.
- **Unfair randomness** stacks events without a recovery window, or scales punishment with the very thing the game rewards (wealth). The "Visible Raid Points" mod shows players want the hidden driver *shown*.
- **Pace in waves.** Cassandra's push / breathing-room / push rhythm and Frostpunk's forecast / storm / relief rhythm are the same pattern. A deterministic hourly sim can implement it with a "pressure budget" and cooldowns.
- **The piracy anecdote suggests** that a drain the player cannot act on reads as unfair even when it is explained.

### Gaps
- The content of Tynan Sylvester's GDC talks and the Frostpunk GDC 2019 talk ("Why Make Games?") was not retrieved.
- Exact storyteller timers (Cassandra cycle length, minimum gap between major threats) are not documented on the wiki.
- No formal player study of "perceived fairness" in sims was found.

---

## Q3. The snowball problem: early game tense, late game "solved"

### Takeaway
Almost every business sim in scope draws late-game "it becomes passive or repetitive" complaints: Big Ambitions, Startup Company, Software Inc., Two Point, GDT, Offworld. The fixes that work are structural:
- new chapters or levels with new constraints (Two Point, RCT scenarios)
- a designed ending (Frostpunk's storm)
- pressure tied to time or difficulty rather than punishing success

Anti-snowball rules that are *hidden* or *relative to your own success* (GDT scoring, RimWorld wealth raids) produce resentment.

### Cited Findings

**Late-game complaints**
- **Big Ambitions:** late-game repetition is the top complaint (about 10–20 h in). — [vaporlens](https://vaporlens.app/app/1331550/big_ambitions.md)
- **Big Ambitions:** passive income leaves an empty loop once rich. — [Steam negative reviews](https://steamcommunity.com/app/1331550/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Startup Company:** later the money arrives automatically, and growth needs exponential hiring for near-linear returns. — [Steam negative reviews](https://steamcommunity.com/app/606800/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Software Inc.:** little middle ground between struggling and success, then progression stalls. — [Steam negative reviews](https://steamcommunity.com/app/362620/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Offworld:** nothing to do for the last ~30% of a match. — [Steam negative reviews](https://steamcommunity.com/app/271240/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Mad Games Tycoon:** experienced players say there is almost no late-game challenge. — [Steam discussion](https://steamcommunity.com/app/341000/discussions/0/530645446308969556)
- **Mad Games Tycoon 2:** reviews summarised as repetitive mid-to-late, financially irrelevant late game. — [vaporlens](https://vaporlens.app/app/1342330/mad_games_tycoon_2.md)

**Anti-snowball fixes that backfired**
- **GDT** sets quality targets from your best past game; reviewers say this punishes excellent releases and can force bankruptcy. — [Steam negative reviews](https://steamcommunity.com/app/239820/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **RimWorld** wealth-scaled raids are resented as "can't build nice things". — [Steam discussion](https://steamcommunity.com/app/294100/discussions/0/598519626423344802)
- A village-builder developer tried making the game react to larger villages and found it very unfun, so kept snowballing by design. — [itch.io devlog post](https://itch.io/post/9113650)

**Structural fixes**
- **Two Point** progression is level-based: one star opens a new hospital with different priorities, and research carries back. — [Wikipedia](https://en.wikipedia.org/wiki/Two_Point_Hospital); [PC Gamer](https://www.pcgamer.com/uk/two-point-hospital-hands-on-theme-hospital-fans-are-getting-the-exact-game-they-want-with-a-few-twists/); [Wccftech](https://wccftech.com/two-point-hospital-hands-on-impressions/amp/)
  - Repetition across levels is still its top complaint. — [vaporlens](https://vaporlens.app/app/535930/two_point_hospital.md)
- **RCT** scenarios bound each run with objectives, available rides and a loan limit and interest rate. — [Wikipedia RCT2](https://en.wikipedia.org/wiki/RollerCoaster_Tycoon_2); [RCT fandom](https://rct.fandom.com/wiki/General_Scenario_Guide)
- **Frostpunk** ends on the storm. — [PC Gamer](https://www.pcgamer.com/au/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws)
- **RimWorld** offers time-based threat scaling as an alternative to wealth-based. — [RimWorld Wiki](https://rimworldwiki.com/wiki/AI_Storytellers)
- **Big Ambitions 1.0** added a neighbourhood-wide Pricing Manager and HQ-delegated logistics and HR, a direct response to the scaling-busywork complaints. — [InGameNews](https://ingamenews.com/pc-gaming/big-ambitions-1-0-unleashes-expansive-new-york-tycoon-experience/)
- From 4X forums (general strategy, not tycoon), proposed fixes include rewarding 2nd–4th place more, and "mini-games within games". — [Steam Civ VII discussion](https://steamcommunity.com/app/1295660/discussions/0/4851029059847100597); [CivFanatics](https://forums.civfanatics.com/threads/the-4x-problem-of-snowballing.621076)

**Economy-design theory**
- Machinations (Joris Dormans) classifies feedback loops as positive or negative, constructive or destructive, fast or slow. These loops determine much of an economy's dynamic behaviour. — [Dormans PhD thesis, "Engineering emergence"](https://eprints.illc.uva.nl/id/eprint/2118/)
- Adams & Dormans, *Game Mechanics: Advanced Game Design*, has a pattern library. It includes "engines", "friction" (Static Friction, Dynamic Friction) and "escalation" patterns. — [InformIT book page](https://www.informit.com/store/game-mechanics-advanced-game-design-9780321820273); [Pearson sample chapter](https://ptgmedia.pearsoncmg.com/imprint_downloads/peachpit/peachpit/samplechapters/0321820274/0321820274_gamemechanics_ch05section.pdf)

### Inferences
- **Revenue scales, decisions don't.** The late game dies when revenue scales with assets but the *number of meaningful decisions per session* doesn't. Every successful fix adds new decisions (new level constraints, new district, finale) rather than only bigger numbers.
- **Opposing forces should be visible and fair.** Rising fixed costs (rent renewals), competitor entry and seasonality are "friction" that reads as fair when visible and in-fiction. GDT's hidden self-relative bar reads as cheating.
- **Dynamic Friction (author's understanding, not retrieved from source):** a drain that grows with the player's size. Rent and wages tied to shop size fit this, as long as they are shown as named line items.

### Gaps
- The definitions of the Dynamic/Static Friction patterns were not retrieved from the book text.
- No developer postmortem quantifying late-game churn (e.g. playtime drop-off curves) was found for any of the listed games.

---

## Q4. Information design: dashboards, graphs, reports, cause-and-effect explanations

### Takeaway
Players reward screens that answer *why*:
- per-factor satisfaction breakdowns
- review feedback text
- stats screens

They punish four things:
- split screens that can't be compared
- numbers whose meaning is ambiguous
- swings without causes
- systems that need outside spreadsheets or wikis

Frostpunk's "empathize with numbers" principle (turn aggregate stats into people) is the counterpart for emotional readability.

### Cited Findings
- **Game Dev Tycoon**
  - The design gives each release review scores with feedback. — [Wikipedia](https://en.wikipedia.org/wiki/Game_Dev_Tycoon)
  - Players still call scores opaque, say slider hints mislead, and say the tech/design ratio is never explained. — [Steam negative reviews](https://steamcommunity.com/app/239820/negativereviews/?browsefilter=toprated&filterLanguage=english)
  - vaporlens rates GDT's dependence on external guides at the maximum (Wiki score 100). — [vaporlens](https://vaporlens.app/app/239820/game_dev_tycoon.md)
- **Two Point Hospital**
  - Extensive statistics screens are praised. — [vaporlens](https://vaporlens.app/app/535930/two_point_hospital.md)
  - The most-helpful negative review (724 helpful) says the overview screens are split up and hard to compare.
  - Another long-play reviewer (301 h) cites income swings with no clear cause plus repetitive advisor nagging.
  - Source: [Steam negative reviews](https://steamcommunity.com/app/535930/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Big Ambitions**
  - Players see per-factor satisfaction (interior, staff skills, cleanliness, pricing). One reported 100 on three factors but 91% on pricing.
  - Another asked whether the satisfaction % means customers would accept higher prices, showing the number's meaning is unclear.
  - Source: [Steam discussion 1](https://steamcommunity.com/app/1331550/discussions/0/3823034639980284729); [Steam discussion 2](https://steamcommunity.com/app/1331550/discussions/0/3948029052449329881)
  - The search tool summarised both threads together, so which thread holds which post is uncertain.
  - Aggregated reviews ask for better logistics and inventory tools and flag a need for spreadsheets or external tracking. — [vaporlens](https://vaporlens.app/app/1331550/big_ambitions.md)
- **Software Inc.:** a player could not tell how many staff or marketers were needed. — [Steam negative reviews](https://steamcommunity.com/app/362620/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **RimWorld**
  - Sylvester wants the simulation simple enough that a player can observe and understand it. — [Game Developer](https://gamedeveloper.com/design/how-i-rimworld-i-fleshes-out-the-i-dwarf-fortress-i-formula)
  - Players install mods to see raid points and wealth, i.e. to expose the storyteller's hidden input. — [RimWorld Wiki: Wealth management](https://rimworldwiki.com/wiki/Wealth_management)
- **Frostpunk:** the scenario-writing talk is titled "Empathize with Numbers". — [Inven Global](https://www.invenglobal.com/articles/6528/igc-2018-empathize-with-numbers-the-process-of-frostpunk-scenario-writing); [PCGamesInsider](https://www.pcgamesinsider.biz/news/67933/11bits-marta-fijak-empathising-with-500-people-is-hard-in-frostpunk/)

### Inferences
- **Best pattern:**
  1. One comparison screen: this period vs. last, by driver.
  2. A plain-language reason attached to every big delta.
  3. Satisfaction numbers that say what action they imply ("price satisfaction 91% → room to raise? no").
- **Advisors that nag** (Two Point) are disliked. Advisors that appear *once with a cause* fit better. This is inferred, not directly sourced.
- **Each formula hidden from players becomes a wiki dependency.** For ~100 friends who won't read a wiki, the game must explain itself.

### Gaps
- No official documentation of Big Ambitions' "business insights" screens or of how its satisfaction formula weights price was found.
- No developer write-up on Two Point's graph design was found.

---

## Q5. Onboarding complex sims: what worked, what drew complaints

### Takeaway
Two approaches work:
- a short tutorial disguised as the first real scenario (Prison Architect's campaign, Two Point's first hospital)
- progressive unlocks spread across levels

Complaints come from three opposite failures:
- no explanation of core scoring (GDT, Software Inc.)
- tutorials that outlast the actual play (Offworld)
- forced milestones that make the whole game feel like a never-ending tutorial (Startup Company)

### Cited Findings
- **Prison Architect:** the campaign is a tutorial in disguise, per reviewers and the developers. — [bit-tech](https://bit-tech.net/reviews/gaming/prison-architect-review/1/); [TheSixthAxis](https://www.thesixthaxis.com/2015/10/06/prison-architect-interview/)
- **Two Point Hospital**
  - Unlocks spread across a sequence of hospitals; one star opens the next.
  - Facilities researched later can be used when returning to earlier hospitals.
  - Source: [Wikipedia](https://en.wikipedia.org/wiki/Two_Point_Hospital); [Wccftech](https://wccftech.com/two-point-hospital-hands-on-impressions/amp/)
  - It is called easy to learn (0.18), though players still look up outside guides (0.10). — [vaporlens](https://vaporlens.app/app/535930/two_point_hospital.md)
- **Capitalism Lab:** the official advice is — [capitalismlab.com](https://capitalismlab.com/?p=7180):
  - tutorials of about 10–15 minutes
  - start with retail before manufacturing or tech
  - experiment in separate saves
  - use the money cheat to learn without financial limits
- **Offworld:** reviewers say the tutorials take longer than a match. — [Steam negative reviews](https://steamcommunity.com/app/271240/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Startup Company:** forced milestones make the game feel like a tutorial, and players feel pushed to play the way the developers intend (2020-04, 255 helpful). — [Steam negative reviews](https://steamcommunity.com/app/606800/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Game Dev Tycoon:** lacks a tutorial on scoring and progression (0.32). — [vaporlens](https://vaporlens.app/app/239820/game_dev_tycoon.md)
- **Software Inc.:** the early game is unintuitive; one reviewer could not get staff to come to work without outside help. — [Steam negative reviews](https://steamcommunity.com/app/362620/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Big Ambitions:** the tutorial helps with goals, but its coverage of key systems is limited and the first hours are slow and hard. — [vaporlens](https://vaporlens.app/app/1331550/big_ambitions.md)

### Inferences
- **Target:** a first in-game week that *is* the tutorial, finished in under 10–15 real minutes. Levers unlock as the related problem first appears; for example, the ads lever unlocks on the first "app-rank drop" slow day.
- **Avoid long mandatory milestone chains.** After onboarding, goals should be optional.

### Gaps
- No telemetry-based onboarding postmortems (completion or drop-off rates) were found for these titles.

---

## Q6. Failure and bankruptcy: how games handle losing and how players feel

### Takeaway
Three models appear:
- **Hard game over:** Frostpunk revolt, Offworld hostile takeover.
- **Debt-based soft failure:** RCT and Capitalism loans with interest, Big Ambitions loans.
- **"Losing is fun" slow decline:** RimWorld, where the storyteller eases off, raiders leave survivors, and the decline is stretched into a story.

Players accept failure when they can see it coming and trace its cause. They resent it when the system makes failure inevitable through hidden rules (GDT's self-relative scoring), or when it comes too early from opaque costs (Big Ambitions vehicle costs, Prison Architect).

### Cited Findings
- **RimWorld**
  - The hardest difficulty is literally named "Losing is fun" (220% threat). — [RimWorld Wiki](https://rimworldwiki.com/wiki/AI_Storytellers)
  - Sylvester wants losing dragged out and possibly reversible. Raiders steal or kidnap and leave rather than wipe the colony, and mental breaks do some damage before recovery. — [Game Developer](https://gamedeveloper.com/design/how-i-rimworld-i-fleshes-out-the-i-dwarf-fortress-i-formula)
- **Frostpunk:** sustained low hope or high discontent leads to revolt and game over. — [Wikipedia](https://en.wikipedia.org/wiki/Frostpunk)
- **RCT:** loan limits and interest rates differ per scenario. — [Wikipedia RCT1](https://en.wikipedia.org/wiki/RollerCoaster_Tycoon_(video_game)); [RCT fandom](https://rct.fandom.com/wiki/General_Scenario_Guide)
  - Scenario authors use the loan terms as flavour, e.g. cheap land but high loan interest. — via search summary of [RCT fandom](https://rct.fandom.com/wiki/General_Scenario_Guide)
- **Capitalism Lab**
  - An undersized factory broke the supply chain and forced a loan; the reviewer frames this as an emergent challenge, not a frustration. — [Legacy of Games](https://legacyofgames.com/2025/11/13/capitalism-lab)
  - The official learning guide includes advice on avoiding bankruptcy and suggests the cheat mode for learning. — [capitalismlab.com](https://capitalismlab.com/?p=7180)
- **Game Dev Tycoon**
  - Frequent bankruptcy and an unbalanced economy are cited (0.31). — [vaporlens](https://vaporlens.app/app/239820/game_dev_tycoon.md)
  - Self-relative scoring is blamed for eventual bankruptcy. — [Steam negative reviews](https://steamcommunity.com/app/239820/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Big Ambitions**
  - Some players go bankrupt early, and vehicle repair and towing drain money. — [vaporlens](https://vaporlens.app/app/1331550/big_ambitions.md)
  - Community guides discuss starting loans: a small "frugal" loan versus a larger loan to open a business. — [Steam discussion](https://steamcommunity.com/app/1331550/discussions/0/800059836888780515) (exact thread attribution from search summary; treat as approximate)
  - Players invent a self-imposed no-credit challenge.
  - No official game-over rule was found.
- **Offworld:** matches often end in hostile takeovers, which makes them short. — [Steam negative reviews](https://steamcommunity.com/app/271240/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Prison Architect:** you can go bankrupt before finishing the first block. — [bit-tech](https://bit-tech.net/reviews/gaming/prison-architect-review/1/) (via search summary)

### Inferences
- **For a learning-oriented game, the RimWorld model fits best.** Failure is a long, recoverable arc with options: emergency loan, cutting hours, selling upgrades. A final closure becomes content (a post-mortem of the failed shop) instead of a blank game-over screen.
- **Hard game over works in Frostpunk** because the run is short and authored. It would hurt a game played in 5–10 minute daily sessions, where losing weeks of real-time "charge" is costly.
- **Early bankruptcy from opaque costs** is the most-cited negative across Big Ambitions, GDT and Prison Architect. Early-game costs need to be visible before they hit.

### Gaps
- No player-sentiment data comparing permadeath vs. restart-with-meta-progress in business sims specifically was found.
- Big Ambitions' official bankruptcy and game-over rules were not confirmed.

---

## Q7. Expansion (second store, managers, automation): reactions to the shift from hands-on to managerial play

### Takeaway
Players *want* delegation once they scale. The complaint is almost never "automation removed my fun"; it is that automation is missing or half-done, so scale multiplies busywork:
- managers still need manual scheduling
- hiring and furnishing hundreds of items
- staff complaints reaching the CEO

The second complaint is that once delegated, the empire runs itself and becomes idle. Good expansion swaps micro decisions for *new macro decisions*, not for no decisions.

### Cited Findings
- **Big Ambitions**
  - Top negative reviews — [Steam negative reviews](https://steamcommunity.com/app/1331550/negativereviews/?browsefilter=toprated&filterLanguage=english):
    - Managers still require manual scheduling, and logistics can't be planned at macro level.
    - Hiring and furnishing hundreds of staff and items becomes overwhelming as the empire grows.
    - Staff complaints contradict delegated HR.
  - 1.0 responded with HQ-delegated logistics and HR and a neighbourhood-wide Pricing Manager. — [InGameNews](https://ingamenews.com/pc-gaming/big-ambitions-1-0-unleashes-expansive-new-york-tycoon-experience/)
  - Aggregated reviews say weak auto-scheduling (0.07) and shallow HR (0.04) are complaints, while automating deliveries is praised as a key unlock. — [vaporlens](https://vaporlens.app/app/1331550/big_ambitions.md)
- **Software Inc.:** staff-skill micromanagement becomes unworkable at scale, and mechanics pile up with no way to opt out. — [Steam negative reviews](https://steamcommunity.com/app/362620/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Startup Company:** late growth means exponential hiring for near-linear returns, which feels like an idle game. — [Steam negative reviews](https://steamcommunity.com/app/606800/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Two Point Hospital:** staff AI forces over-hiring and micromanagement; players asked for schedules and room templates. — [Steam negative reviews](https://steamcommunity.com/app/535930/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Capitalism Lab:** the talent-headhunting system feels pointless and CEO salaries serve no purpose, so management layers without decision weight are criticised. — [Legacy of Games](https://legacyofgames.com/2025/11/13/capitalism-lab)

### Inferences
- **A second store should arrive with new macro decisions:**
  - which neighbourhood
  - whether to share a supplier
  - which manager policy (e.g. "keep ≥2 days of dough", "discount near-expiry cheese")
  - how to split a limited ad budget
- **Managers should run on visible policies the player sets.** When a manager makes a mistake, it should surface as a story with a cause, not as a stream of requests.
- **Delegation should be earned** (unlocked by experience or dex cards) and partial, so there is always one hands-on decision left.

### Gaps
- No primary developer write-up (Hovgaard devlog) explaining the 1.0 manager redesign was retrieved.
- Sentiment on Big Ambitions' post-1.0 manager features specifically, after 2026-08-28, is not yet visible in the top-rated reviews, which are mostly 2023–2025.

---

## Q8. Concrete lessons for the Korean pizza-shop web game

### Takeaway
The pizza game already has the four things the best sims are praised for:
- telegraphed crises
- discoverable causes
- a post-mortem report
- a dex

The biggest risks, based on the evidence above:
1. The late game going passive (Big Ambitions / Startup Company pattern).
2. Opaque or self-relative scoring (GDT).
3. Early bankruptcy from costs the player didn't see coming.
4. Expansion that multiplies chores.
5. A friend-comparison feature that rewards pure snowballing.

### Cited Findings (evidence each lesson rests on)
- **Telegraph then hit; ease off after losses.** Lesson: L1, L2. — [RimWorld Wiki](https://rimworldwiki.com/wiki/AI_Storytellers); [Game Developer](https://gamedeveloper.com/design/how-i-rimworld-i-fleshes-out-the-i-dwarf-fortress-i-formula); [indienova on Frostpunk forecasts](https://lab.indienova.com/indie-game-review/critical-play-report-frostpunk/)
- **Don't punish success with hidden or self-relative bars.** Lesson: L3. — [GDT negative reviews](https://steamcommunity.com/app/239820/negativereviews/?browsefilter=toprated&filterLanguage=english); [RimWorld wealth complaints](https://steamcommunity.com/app/294100/discussions/0/598519626423344802)
- **Late game goes idle when revenue scales but decisions don't.** Lesson: L4, L5. — [Big Ambitions](https://steamcommunity.com/app/1331550/negativereviews/?browsefilter=toprated&filterLanguage=english); [Startup Company](https://steamcommunity.com/app/606800/negativereviews/?browsefilter=toprated&filterLanguage=english); [Software Inc.](https://steamcommunity.com/app/362620/negativereviews/?browsefilter=toprated&filterLanguage=english); [Offworld](https://steamcommunity.com/app/271240/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Comparison screens and causes for every swing.** Lesson: L6, L7. — [Two Point negative reviews](https://steamcommunity.com/app/535930/negativereviews/?browsefilter=toprated&filterLanguage=english); [Big Ambitions satisfaction threads](https://steamcommunity.com/app/1331550/discussions/0/3823034639980284729)
- **Tutorial in disguise; short; no endless forced milestones.** Lesson: L8. — [Prison Architect / bit-tech](https://bit-tech.net/reviews/gaming/prison-architect-review/1/); [Capitalism Lab guide](https://capitalismlab.com/?p=7180); [Startup Company](https://steamcommunity.com/app/606800/negativereviews/?browsefilter=toprated&filterLanguage=english); [Offworld](https://steamcommunity.com/app/271240/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Soft, recoverable failure; loans with visible terms.** Lesson: L9, L10. — [RimWorld / Game Developer](https://gamedeveloper.com/design/how-i-rimworld-i-fleshes-out-the-i-dwarf-fortress-i-formula); [RCT loans](https://rct.fandom.com/wiki/General_Scenario_Guide); [Capitalism Lab emergent loan](https://legacyofgames.com/2025/11/13/capitalism-lab)
- **Delegation must remove chores and add macro decisions.** Lesson: L11. — [Big Ambitions reviews + 1.0 managers](https://ingamenews.com/pc-gaming/big-ambitions-1-0-unleashes-expansive-new-york-tycoon-experience/)
- **Options must be meaningfully different.** Lesson: L12. — [Big Ambitions "store types superficially different"](https://steamcommunity.com/app/1331550/negativereviews/?browsefilter=toprated&filterLanguage=english); [Software Inc. "one optimal min-max"](https://steamcommunity.com/app/362620/negativereviews/?browsefilter=toprated&filterLanguage=english)
- **Life-sim upkeep as chore.** Lesson: L13. — [vaporlens Big Ambitions](https://vaporlens.app/app/1331550/big_ambitions.md)
- **Designed endings beat endless sandboxes for focus.** Lesson: L14. — [Frostpunk / PC Gamer](https://www.pcgamer.com/au/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws); [Two Point level structure](https://en.wikipedia.org/wiki/Two_Point_Hospital)

### Inferences (the concrete lessons; these are design recommendations, not sourced facts)

**L1. A "Cassandra" pressure budget for the hourly sim**
- Give each in-game week a pressure budget, spent on slow-day causes and crises. Enforce a cooldown after any big event (auto-pause events).
- Never stack two *new* major crises in the same game week during the first month.
- After a bad month (profit change below a threshold in the post-mortem), lower the next month's budget, like RimWorld's adaptation and its easing off after losses.
- Optionally offer storyteller-style modes: "Calm" (Phoebe-like), "Standard" (Cassandra-like), "Chaos" (Randy-like). Friends then self-select difficulty and fairness feels chosen.

**L2. Every crisis needs a hint, a cause and a counter-move**
- Keep the supplier/news hint 1–3 game days ahead (Frostpunk's forecast rhythm).
- Every hint should come with at least one lever that helps: pre-order cheese before a price spike, run ads before an app-rank drop. Unactionable drains read as unfair (the GDT piracy anecdote).

**L3. Scale difficulty by calendar or stage, never by hidden wealth, and never by "your own best"**
- Rent increases at lease renewal, announced months ahead, are good fair friction.
- A competitor opening triggered by a district's visible profitability is fine if a news item says "a franchise is scouting your street".
- Avoid GDT-style "you must beat last month" scoring.

**L4. One meaningful decision per 5–10 minute session, by design**
- Because one real day equals one game week, each charge should surface at least one choice with a trade-off: a group order vs. capacity, price vs. a review complaint, ordering vs. expiry risk, a hire vs. stress.
- Weeks that would play out with zero decisions are where "mostly waiting" (Startup Company) and "passive income" (Big Ambitions) complaints come from.

**L5. Plan the mid and late game around chapters, not bigger numbers**
- For example: Chapter 1, the campus shop survives its first semester. Chapter 2, lease renewal and rent increase. Chapter 3, a delivery-app fee change or a competitor franchise. Chapter 4, an optional second store.
- Each chapter adds a lever *and* a constraint, the way Two Point levels or RCT scenarios do.
- Consider a season finale (Frostpunk's "end like a novel") with a New Game+ that keeps dex cards and lets the player choose a harder neighbourhood.

**L6. Make the monthly post-mortem the hero screen**
- Decompose the profit change into named drivers: traffic, conversion, average ticket (price), ingredient cost, expiry waste, labour, ads, rent, one-offs.
- Attach the discovered cause tag to each driver ("−18% traffic: roadwork, weeks 2–3").
- Show it in *one* comparison view (this month vs. last). This directly answers Two Point's "split screens, swings with no cause" complaints.

**L7. Satisfaction numbers must say what they imply**
- Big Ambitions players couldn't tell whether 91% price satisfaction meant they could raise prices.
- Phrase it as action-relevant text, e.g. "9% of customers thought it was expensive; +₩1,000 is expected to cost about 6 orders a day."
- Keep formulas simple enough that the ~100 friends never need a wiki (GDT's guide dependency).

**L8. The first week is the tutorial in disguise**
- Make the first week a scripted opening week (like Prison Architect's campaign), finished in under ~10–15 real minutes (Capitalism Lab's tutorial length).
- Unlock levers when the relevant problem first appears, and pair each unlock with its dex card.
- Avoid long mandatory milestone chains afterwards (Startup Company's complaint).

**L9. Failure is a recoverable arc, then a lesson**
- Before bankruptcy, offer visible options: emergency loan (fixed interest and a shown repayment schedule, RCT-style), shorter hours or extra days off, selling an upgrade, a supplier payment extension.
- If the shop does close, generate a "closing post-mortem" and keep the dex cards (meta-progress), so losing teaches. This fits the learning goal and RimWorld's "losing is fun".
- Avoid hard game-over that wipes many real days of charge.

**L10. Show early costs before they bite**
- Early bankruptcy from unseen costs is the most-cited unfair failure (Big Ambitions vehicle costs, Prison Architect, GDT).
- With ₩1,000,000 starting cash, show a weekly fixed-cost line (rent, wages, delivery-app fees) on day 1, plus a "runway: N weeks" indicator.

**L11. Delegation earned via dex or experience, run by player-set policies**
- A manager or part-timer lead who auto-orders ingredients should follow rules the player sets (e.g. "keep 2 days of dough", "mark down cheese 1 day before expiry").
- They can make occasional *visible* mistakes with causes.
- Expansion to a second store should add macro choices (district, shared supplier, ad split), not double the chores.

**L12. Make the neighbourhoods economically distinct**
- Campus: semester and exam-week cycles, price-sensitive. Office: weekday lunch peaks and group orders. Residential: weekends and family sets.
- This prevents the "store types feel the same" and "one min-max strategy" critiques. Seasonality and events should shift the optimal price, so there is no single solved setting.

**L13. Stress and burnout as a strategic resource, not upkeep**
- Big Ambitions' sleep/hunger upkeep is called tedious.
- Tie stress to the player's own choices (no days off, solo shifts, angry reviews). Let it unlock or close options (e.g. burnout disables auto review replies or causes mistakes) rather than requiring routine clicks.

**L14. Design the friend comparison so it doesn't reward pure snowballing**
- Comparing raw net worth amplifies the snowball and early-start advantage.
- Because the sim is deterministic, friends could play a shared "season seed" (same district, same events) and compare multiple badges: best month, crises survived, lowest waste, best review recovery.
- Rewarding 2nd–4th place more (an idea from 4X forums) also suggests showing several leaderboards, so most of the ~100 friends "win" something.

### Gaps
- Whether these lessons hold for a short-session iPad PWA audience is not tested. All cited evidence is from PC sims with long sessions.
- No source was found on mobile/PWA business sims with real-time "charge" mechanics; that would need separate research (e.g. idle or management mobile titles).
