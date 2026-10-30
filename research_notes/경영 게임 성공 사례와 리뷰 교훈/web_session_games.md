# Web/browser and short-session "check in daily" games: why they worked, and their session, retention and UX design (for a pizza-shop management PWA on iPad)

Research date: 2026-10-30. Sources are labeled with publication dates where known. Quotes are kept under 15 words; everything else is paraphrase. Source reliability notes are inline. Where a fact comes from a search-engine summary rather than a page I opened, it is marked "(search summary)".

---

## 1. Why did the web/browser hits work, what did players say, and how did A Dark Room and Universal Paperclips unfold complexity?

### Takeaway
The browser hits share a pattern: they start with one or two controls, reveal new panels only when the player has earned or needs them, use a text log or ticker as narrator, and run with no install, account or paywall. A Dark Room and Paperclips never show a locked menu. New panels simply appear, so the screen grows with the player's understanding. The failure mode is a start that is too slow: some A Dark Room players quit before the fire was lit.

### Cited Findings

**Universal Paperclips (Frank Lantz, 2017)**
- The game opens with only a clip counter and a "Make Paperclip" button. A Business panel then appears where you set the price, read public demand and buy wire. Next come autoclippers, then Computational Resources, which unlocks research projects. Creativity, Trust-gated projects, Manufacturing, Wire, Power and Space Exploration panels follow. — [if50 / Aaron A. Reed, 2021-12-09](https://if50.substack.com/p/2017-universal-paperclips)
- Growth hits several plateaus. To pass each one, the player must invest money, materials or compute in a new breakthrough. An activity log at the top reports progress and the AI's unsettling thoughts. All interaction is button presses. — [Wikipedia: Universal Paperclips](https://en.wikipedia.org/wiki/Universal_Paperclips)
- Per Wired, 450,000 people played in the first 11 days, most of them to completion. Lantz built it to learn JavaScript and expected a weekend of work, but it took nine months. Hilary Lantz helped with the exponential math. Kittens Game was an inspiration. — [Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips)
- About two million people played in total. Lantz praised clickers' "radical simplicity" and summed up their appeal as "it's fun to make this number go up". — [if50, 2021](https://if50.substack.com/p/2017-universal-paperclips)
- Press reaction: The Verge warned against playing when you have something important to do that day or the next. Motherboard's writer was embarrassed by how much he enjoyed it. Forbes called it a clicker for thinkers. VentureBeat praised its sudden music cues and the koans in its log. — [if50](https://if50.substack.com/p/2017-universal-paperclips); [Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips)
- In a 2019 interview, Lantz says many incrementals refuse to let go once they hook you, and points to Cookie Clicker's endless prestige. His game instead has an ending. (search summary) — [hey.gg interview](https://www.hey.gg/blog/frank-lantz)

**A Dark Room (Michael Townsend / Doublespeak Games, web 2013-06-10; iOS port by Amir Rajan)**
- It started as a text-only idle web game in HTML/JS and was inspired by Candy Box. The opening is minimal: you keep a fire burning until a stranger arrives. Building options come first, and exploration opens only after you obtain a compass. Rajan calls the design "slow reveals", which let players imagine the world before a late twist. — [PocketGamer.biz, 2014-06-11](http://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/)
- Rajan says dropping visuals removed "noise" and gave clarity. Mobile pacing was the hardest part of the port, so he playtested heavily to keep players curious. The text-only format turned out to work for blind players, which was not planned. — [PocketGamer.biz, 2014](http://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/)
- **Player complaint:** some App Store reviewers left one-star reviews after quitting before the fire was lit, because they expected faster action. Other feedback said the game "needs pictures", which clashed with its identity. — [PocketGamer.biz, 2014](http://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/)
- Townsend (via a New Yorker interview) said this storytelling method makes players feel they are building the narrative even while they are only discovering it. — [TouchArcade RPG Reload, 2016-07-28](https://toucharcade.com/2016/07/28/rpg-reload-file-088-a-dark-room/)
- A GDC 2021 narrative review describes no images and no colors beyond black and grey text on a nearly empty screen. — [GDC Vault PDF, 2021](https://media.gdcvault.com/GDC+2021/ArthurDavis_ADarkRoomNarrativeReview.pdf); release date per [Wikipedia](https://en.wikipedia.org/wiki/A_Dark_Room)

**Candy Box! (aniwey, April 2013)**
- It was made by a 19-year-old French student in ASCII art. It starts as a candy counter where you can eat candies or throw them on the floor, then gradually opens into quests, potions and farming. It spread through social media. Candy Box 2 followed on 2013-10-24. — [Wikipedia: Candy Box!](https://en.wikipedia.org/wiki/Candy_Box!); [GameSkinny review](https://www.gameskinny.com/reviews/candy-box-review-how-to-get-diabetes-from-the-internet-and-have-a-blast-doing-it/)
- A PCGamesN headline reports 1,430,350 unique saves (reported number, not independently verified). — [PCGamesN](https://pcgamesn.com/indie/candy-box-has-1430350-unique-saves-date-sequel-s-code-free-use-anyone)

**Cookie Clicker (Orteil, 2013-08-08)**
- A 2013 design analysis says rewards follow an exponential curve. The opening minutes are dense with feel-good moments that grow scarcer, shifting the feeling from delight to accomplishment. A fictional news ticker reacts to the player's cookie empire. Achievements give long-term goals, and cheating earns a mocking achievement. At that time progress accrued only while the tab was open, and the end game had a reset-for-heavenly-cookies prestige. — [Game Developer / Tino van der Kraan, 2013-10-28](https://www.gamedeveloper.com/design/the-recipe-behind-cookie-clicker)
- A secondary history credits the prestige system (Heavenly Chips) as the most influential mechanic. It also credits Orteil's continued updates as what separated the game from one-hit wonders. Lower-reliability blog source. — [dinogame.gg](https://dinogame.gg/blog/history-of-cookie-clicker/)
- I found no primary Orteil interview on golden-cookie design. Golden cookies are random, clickable temporary boosts (search summary). — [Cookie Clicker Wiki](https://cookieclicker.fandom.com/wiki/Golden_Cookie?oldid=6162)

**Kittens Game (bloodrizer, 2014–present)**
- It is a text-based idle village simulation with hundreds of buildings, technologies, religions and resources, playable for hundreds of hours. It is often called the deepest browser incremental (opinion from a roundup). — [dinogame.gg roundup](https://dinogame.gg/blog/best-browser-incremental-games/)
- An academic book reports that the game nicknames itself the "Dark Souls of incremental gaming". — [Thoth book listing](https://thoth.pub/books/b6d34f46-72d8-41d6-b490-5c5e508f603c) (search summary)

**Trimps**
- It has about 90% positive Steam reviews, and its store page highlights deep, customizable automation. — [Steam](https://store.steampowered.com/app/1877960/Trimps)
- **Newcomer complaint:** one reviewer spent the whole first hour figuring out what each on-screen button did. — [itch.io devlog review](https://drhernandez1002.itch.io/system-design-blog/devlog/144095/incremental-game-review-trimps)

**Melvor Idle (2021-11-18, RuneScape-inspired)**
- Its skill system is modeled on RuneScape's satisfaction of small skill and number gains. It runs in the browser, on desktop and on mobile, with offline progression and cloud saves. — [GamingOnLinux, 2021-06](https://www.gamingonlinux.com/2021/06/melvor-idle-is-probably-one-of-the-best-idle-games-around/page=1/); [Nuuvem listing](https://www.nuuvem.com/-/item/melvor-idle)
- Steam reviews are about 90% positive (the count varies by snapshot). — [Steam](https://store.steampowered.com/app/1267910/Melvor_Idle/)
- An aggregator reports a 24-hour offline cap (low reliability). Player complaints about losing progress to unexpected combat deaths appear only in secondary summaries. — [vaporlens](https://vaporlens.app/app/1267910/melvor_idle.md)

**Wordle (Josh Wardle, 2021; GDC 2022 talk)**
- Wardle called the one-puzzle-a-day limit a defining factor in its virality. He said the shared daily word was an unplanned social ingredient that became central. The emoji grid was built after a player in New Zealand started sharing results by hand. He refused ads, avoided push notifications and other engagement tricks, and stressed respect for players. It was a single link with no download, account or paywall. — [Thumbsticks, 2022-04-26](https://www.thumbsticks.com/wardle-on-wordle-simple-word-game-global-phenomenon/)
- He said the daily limit asks for about three minutes a day and leaves people wanting more. — [Wikipedia: Wordle](https://en.wikipedia.org/wiki/Wordle) (search summary)

**Neopets (dailies)**
- Returning players come back for nostalgia, routine and community. Kotaku notes a one-click Neopoint minigame that works as "training wheels" for returning players. — [Kotaku](https://kotaku.com/your-old-neopets-may-still-be-alive-and-very-hungry-1842243197); [Atlas Obscura](https://www.atlasobscura.com/articles/how-a-small-group-of-devotees-are-saving-neopets-from-extinction)
- Daily users rose about 30% at the start of the pandemic, then tapered off. — [NPR](https://www.npr.org/transcripts/1055640624)

**Virtonomics (browser business sim; the closest structural analogue to this game)**
- Time is discrete. In the classic mode one turn happens per real day, and the intensive mode runs 24 turns per day. Each turn equals one game week (7 virtual days). — [Virtonomics help wiki](https://virtonomica.ru/help/index.php/General_information/en)
- It resembles Capitalism 2 and is regularly recommended for management and entrepreneurship education. — [Wikipedia: Virtonomics](https://en.wikipedia.org/wiki/Virtonomics)
- On Trustpilot (about 4.3/5), players praise what it taught them about marketing, management and strategy. Critics complain that paying is the answer to waiting days, and some call it pay-to-win. — [Trustpilot](https://www.trustpilot.com/review/virtonomics.com?page=6)

**Flipline / Cool Math Games (Papa's Pizzeria)**
- The success of Papa Louie let Flipline go full-time and start the spin-off Papa's Pizzeria. Post-Flash, the games still run on Cool Math Games through emulators such as Ruffle. — [Wikipedia: Papa Louie](https://en.wikipedia.org/wiki/Papa_Louie)

### Inferences
- **The Paperclips Business panel is close to this game's core.** It has price, demand and buying raw material, and Paperclips makes it the second thing the player sees. Price-sets-demand is a teachable, satisfying first lever.
- **Successful reveals add new panels; they do not show locked tabs.** A Dark Room and Paperclips show nothing greyed out. The empty space itself creates curiosity, and the player never faces ten tabs on day one.
- **A log or ticker works as narrator and tutor.** Paperclips' AI log, Cookie Clicker's news ticker and A Dark Room's text lines carry story and hints without modal tutorials. The game's chat-bubble reviews and supplier hints can play this role.
- **Slow reveal has a real cost.** A Dark Room lost impatient players at the very start. The first session must give an interesting decision within a minute or two.
- **Virtonomics shows the "1 real day = 1 game week" cadence works for teaching management.** Its main complaint, paying to skip waiting, does not apply to a game with no monetization. Its learning curve is still a warning sign.
- **Every hit was a no-install link that could be shared.** For roughly 100 friends, the link plus a shareable weekly result fits this pattern better than an app-store-style flow.

### Gaps
- No primary Orteil interview on Cookie Clicker design was found. Only a 2013 third-party analysis and low-reliability blogs.
- No primary Michael Townsend design interview was retrieved. A Tumblr "Interviews with Makers" post was cited elsewhere but not opened.
- Kittens Game: no reliable source on player complaints about its UI or tab overload was found.
- Flipline: no developer interview or design rationale was found. Only the Wikipedia history.
- Paperclips: what triggers each panel to appear was not documented in the sources I read.

---

## 2. How should daily sessions and check-ins be designed, and when do time gates feel respectful vs manipulative?

### Takeaway
Players love daily rituals that are short, finite and shared (Wordle). They also like check-ins where absence costs nothing and returning brings a small surprise (Neko Atsume). Time gates feel manipulative when they block play the player wants, punish absence, escalate streak rewards, or sell a way out of waiting. Animal Crossing sits in between: its real-time clock is beloved, but its weeds and departing neighbors penalize absence.

### Cited Findings
- **Wordle:** one puzzle, the same for everyone, about three minutes, no notifications and no ads. Wardle calls the daily limit and shared word the core of its spread. — [Thumbsticks, 2022](https://www.thumbsticks.com/wardle-on-wordle-simple-word-game-global-phenomenon/)
- **Neko Atsume (Hit-Point, Takasaki Yutaka):** you place items and food, leave, and check in periodically to see which cats came. The download target was only about 50,000 a year. — [Nippon.com](https://nippon.com/en/nipponblog/m00083)
- In a Meta interview, the Neko Atsume developers said they want it to give a little "healing" time in busy days. — [Meta blog](https://www.meta.com/blog/neko-atsume-interview/)
- A daily password gives a small fish reward. — [Wikipedia: Neko Atsume](https://en.wikipedia.org/wiki/Neko_Atsume)
- A blog argues its structure makes players spend more time away than in the game (opinion). — (search summary; source not opened)
- **Animal Crossing:** the series uses the console's real-time clock, so time passes whether or not you play. — [Nookipedia](https://nookipedia.com/wiki/Animal_Crossing_series)
- A critic reads the design as favoring small daily upkeep over binges, with weeds and departing neighbors when players skip days. — [Screen Slate](https://www.screenslate.com/articles/181)
- A UX essay notes the game is built so players can return even years later. — [UX Collective](https://uxdesign.cc/the-value-of-time-in-animal-crossing-14f80dfcde8d)
- **Appointment mechanics:** Yu-kai Chou defines an appointment as anchored to absolute times (every Monday) rather than a drifting countdown. He says a reminder alone gets ignored, so the return needs a payoff, and layering with collections or a social cohort makes it stronger. — [Yu-kai Chou blog](https://yukaichou.com/?p=41393)
- A GameRefinery analysis flags login calendars whose rewards grow with consecutive days (for example Dragon City). — [Game World Observer, 2019-06-10](https://gameworldobserver.com/2019/06/10/appointment-mechanics)
- **Where the line falls:** one practitioner essay calls transparency the key difference between strategic and manipulative delay. — [Wayline](https://www.wayline.io/blog/strategic-delay-game-design)
- A forum heuristic asks whether the time gates stop you from playing when you want to. — (search summary; forum post not opened)
- A 2025 consumer-protection classification by Roskachestvo files daily rewards and time-limited events as light engagement. It files waiting timers, FOMO and fake socialization as pressure mechanics. — [WN Hub](https://wnhub.io/news/game-design/item-48888) (search summary; attribution to this URL not verified)
- **Paid skipping breeds resentment:** Virtonomics reviewers resent being offered a subscription to skip waiting days. — [Trustpilot](https://www.trustpilot.com/review/virtonomics.com?page=6)

### Inferences
- **The game's charge model is closer to Neko Atsume and Wordle than to Animal Crossing.** The shop only advances when the player plays the charged week, so absence never causes decay. That is the "respectful" side, and it should be kept.
- **Banked charge needs a cap or a catch-up mode.** A friend returning after two weeks would otherwise face 14 game weeks. Suggested options: cap the bank (for example 3–4 weeks), or offer an "auto-run with current settings" catch-up that produces a single summary. This is my design inference, not sourced.
- **Respect checklist from the sources:**
  - No escalating streak rewards.
  - No lost charge for missing a day.
  - No push nags.
  - The player always knows when the next charge arrives.
  - When there is no charge, the player can still read the ledger, the dex and messages.
- **One shared weekly beat (Wordle's same-word effect).** If all friends play the same seeded event week, such as the same supplier crisis, they have something to talk about before the asset-comparison feature ships.

### Gaps
- No primary Hit-Point design interview on Neko Atsume's check-in rhythm was found.
- No primary Katsuya Eguchi statement on why Animal Crossing penalizes absence. The Screen Slate reading is a critic's interpretation.
- There is no rigorous player-research data on when time gates feel "respectful". The available material is practitioner opinion plus one consumer-agency classification.

---

## 3. Which idle/incremental design knowledge (Pecorella's "Math of Idle Games", GDC idle talks, prestige loops) applies to a non-idle management game with time charge?

### Takeaway
The math of exponential costs vs polynomial income does not transfer directly to a realistic shop economy. Three structural lessons do transfer: keep every lever relevant over time, place deliberate plateaus that need a new idea or breakthrough to pass, and offer a reset or "new run" loop with persistent bonuses. Offline progress in idle games is a deliberate design lever, usually capped.

### Cited Findings
- **Pecorella, Part I (2016-10-13, Kongregate blog, republished on Game Developer):**
  - Generator costs grow exponentially while production grows roughly linearly, so costs eventually overtake income. Balancing decides how long that takes.
  - Milestone multipliers (for example ×2 at 25 and 50 owned) temporarily push production back ahead of costs.
  - On a log scale the newest generator usually dominates, and older generators feel not worth considering.
  - Giving generators different multipliers lets different ones matter at different stages.
  - Prestige resets most progress for a persistent bonus (like "New Game+"). Players prestige when growth slows.
  - A separate exchange currency lets designers tune the growth of the main currency.
  - Players simplify decisions by bulk-buying.
  - — [Game Developer: Math of Idle Games Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)
- Part II covers alternative growth models and generator relevance. — [Game Developer: Part II](https://www.gamedeveloper.com/game-platforms/the-math-of-idle-games-part-ii)
- His GDC Europe 2016 talk "Quest for Progress" links companion spreadsheets. It is the third in a series of talks on "self-playing" games, with the 2015 talk covering the mechanics and monetization of idle games. — [GDC Vault 2016](https://www.gdcvault.com/play/1023863); [GDC Vault 2015](https://gdcvault.com/play/1022065/Idle-Games-The-Mechanics-and); [SlideShare deck](https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507)
- AdVenture Capitalist is credited with popularizing offline progression, now standard in the genre. The genre is traced to Progress Quest (2002). — [Wikipedia: Incremental game](https://en.wikipedia.org/wiki/Incremental_game) (search summary)
- Clicker Heroes explicitly has no 24-hour offline cap. — [Clicker Heroes blog](https://blog.clickerheroes.com/offline-progression-in-clicker-heroes/embed/)
- An opinion essay argues offline caps exist for design reasons: uncapped compounding lets a long absence break the economy and starve the active loop. — [HostedGG](https://hostedgg.com/blog/signaldecay-offline-first-idle-games)
- Paperclips' growth plateaus require a new breakthrough, which is how it keeps unveiling new systems. — [Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips)
- Cookie Clicker's early rewards are dense and later ones scarcer, moving the feeling from delight to accomplishment. — [Game Developer, 2013](https://www.gamedeveloper.com/design/the-recipe-behind-cookie-clicker)
- Paperclips' optional prestige restart in a parallel universe grants a bonus to creativity or demand. — [Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips)

### Inferences
- **Generator relevance becomes lever relevance.** In a pizza shop the risk is one dominant lever (for example "always max price" or "always overstock") that makes the other ten tabs irrelevant. Seasonal demand, ingredient-price swings and staff events should rotate which lever matters most. This mirrors Pecorella's advice to vary multipliers.
- **Plateaus become business problems.** Instead of exponential walls, script "plateaus" that a new concept solves: rent rises, a competitor opens, delivery demand grows. Each plateau naturally unlocks a new tab and a dex card. This is Paperclips' pattern applied to learning.
- **Front-load early rewards, then shift to accomplishment.** The first week should hand out many small wins (first sale, first review, first full day). Later weeks reward analysis through the monthly post-mortem.
- **Prestige becomes a "second shop" or "new season".** A soft reset with carried-over knowledge (dex cards, an owner skill) fits friend comparison. A fresh season gives everyone a comparable starting line.
- **Offline progress becomes the charge.** The charge already caps how much happens per real day. A bank cap keeps a long absence from turning into a huge backlog of unread weeks. Unlike idle games, the sim should not run unattended, because the decisions are the learning.

### Gaps
- I did not read Pecorella Part III or the GDC slide decks in full, so his specific advice on offline-progress caps and pacing curves is not captured here.
- No source was found that applies idle-game math specifically to management sims.

---

## 4. Onboarding: what do players complain about in games with many tabs and numbers, and which patterns work?

### Takeaway
Complaints cluster on two things: screens full of unexplained buttons (Trimps' "first hour figuring out the buttons") and text-wall tutorials that players skip. Openings that are too slow are the opposite failure (A Dark Room one-star reviews). Patterns that work: reveal one system at a time when it becomes relevant, teach with contextual hints triggered by play, give clear next goals, and offer hints only after a player struggles.

### Cited Findings
- Trimps reviewer: the entire first hour went to working out what each button did. — [itch.io devlog review](https://drhernandez1002.itch.io/system-design-blog/devlog/144095/incremental-game-review-trimps)
- A Dark Room: one-star reviews from players who quit before the fire lit. Rajan's iOS work focused on pacing so players stayed curious. — [PocketGamer.biz, 2014](http://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/)
- An indie case: feedback was glowing, but retention dropped after a tutorial that was a text dump with no interactive guidance. — [GDevelop blog](https://gdevelop.io/blog/improve-game-tutorials) (search summary)
- Practitioner guides recommend introducing each mechanic exactly when it is needed, one element at a time. They also suggest hints that appear only after repeated failure or after an action goes unused for a while. — [Wayline: Tutorial Tax](https://www.wayline.io/blog/the-tutorial-tax-how-overly-long-tutorials-are-killing-your-game) (practitioner blog; search summary)
- Roblox's official design docs describe contextual tutorials triggered by normal play, such as entering a new zone or picking up a new item. — [Roblox Creator Docs](https://create.roblox.com/docs/production/game-design/onboarding-techniques.md)
- Paperclips and A Dark Room grow the UI panel by panel (see Q1). Exploration in A Dark Room is gated behind getting a compass. — [if50](https://if50.substack.com/p/2017-universal-paperclips); [PocketGamer.biz](http://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/)
- Cookie Clicker's achievements provide long-term goals. — [Game Developer, 2013](https://www.gamedeveloper.com/design/the-recipe-behind-cookie-clicker)
- In incremental-dev feedback threads, information spread across many screens was called tiring, and a crowded interface was criticized as more complex than the concepts need. — (search summary of r/incremental_games and itch.io threads; individual posts not opened)

### Inferences
- **About ten tabs on day one is the main onboarding risk for this game.** Suggested reveal order (design inference):
  1. Status + Menu/Prices + a single "play week" button.
  2. Orders/Inventory, unlocked by the first supplier hint or the first stock-out.
  3. Staff, unlocked when demand exceeds capacity.
  4. Ledger, after the first week.
  5. Levers, after the first slow day.
  6. Post-mortem, after the first month.
  7. Learn/dex, after the first concept card drops.
- **New tabs should appear, not sit greyed out**, each with a one-line "why this matters now" bubble.
- **The chat bubbles (reviews, supplier hints) are the natural contextual tutor.** A supplier hint saying cheese prices are about to spike teaches inventory at the moment it matters. This is Roblox's "triggered by play" pattern.
- **Always show one current goal** ("this week: break even" or "find out why Tuesday was slow"). This replaces a tutorial wall and links the slow-day mystery mechanic to learning.
- **Hint after struggle:** if a slow day's cause is not found within a week, a bubble nudges toward the right tab.
- **Avoid A Dark Room's slow start.** The first 60–90 seconds should already include a customer review bubble and a pricing choice with a visible result.

### Gaps
- I could not open the r/incremental_games threads, which returned 403, to quote players verbatim. Complaint wording there comes from search summaries.
- I found no systematic study comparing reveal-by-unlock against full-UI-at-start for management sims. The evidence is case-based and from practitioners.

---

## 5. iPad/touch and PWA UX: touch targets, hover, orientation, install friction, iOS storage eviction, save loss, and export/import

### Takeaway
On iPad, every interactive element must work without hover, with targets of at least about 1 cm (Apple: 44 pt). The biggest technical risk for a localStorage save is WebKit's storage policy. In a Safari tab, script-writable storage can be deleted after seven days of Safari use without interaction with the site (2020 policy). Since Safari 17 (2023) origins can also be evicted least-recently-used under storage pressure, unless persistent storage is granted. Home Screen web apps have their own usage counter. Since iOS/iPadOS 26 (2025) any site added to the Home Screen opens as a web app by default. Mitigations: an Add-to-Home-Screen prompt, `navigator.storage.persist()`, and an export/import save code.

### Cited Findings

**iOS/Safari storage (dates labeled)**
- **2020-03-24 (Safari 13.1):**
  - WebKit deletes all of a site's script-writable storage after seven days of Safari use without user interaction on the site. This covers IndexedDB, LocalStorage, SessionStorage, media keys, and Service Worker registrations and cache.
  - Home Screen web apps are not part of Safari and have their own day counter, which tracks actual use of the web app.
  - WebKit said it did not expect first-party data in such apps to be deleted and would treat that as a serious bug.
  - — [WebKit blog: Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- The counter counts days of Safari use, not calendar days. Each visit to the site resets it. — [Search Engine Land](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519)
- **2020 bug report:** in a Home Screen web app, localStorage still held values after nine days. — [WebKit Bugzilla 211775](https://bugs.webkit.org/show_bug.cgi?id=211775) (search summary)
- **2022 bug thread:** script-set cookies are capped at 7-day expiry even when localStorage persists, so cookies are not a safe save location. — [WebKit Bugzilla 237350](https://bugs.webkit.org/show_bug.cgi?id=237350) (search summary)
- **2023-08-10 (Safari 17 / iOS 17 / iPadOS 17):**
  - Origin quota is up to 60% of disk for browser apps and 15% for other apps.
  - Eviction can occur when the overall quota is exceeded, under system storage pressure, or when a site goes unused for some time under ITP. WebKit says it deletes origins in least-recently-used order.
  - Origins with an active page or persistent storage are generally excluded.
  - `navigator.storage.persist()`, `persisted()` and `estimate()` are fully supported from Safari 17.0.
  - Home Screen web apps get the same quotas as Safari. Being opened as a Home Screen web app is one heuristic WebKit uses when deciding whether to grant persistence.
  - The post's sample code has typos.
  - — [WebKit blog: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- **iOS/iPadOS 26 (reported 2025-10):** every website added to the Home Screen now opens as a web app by default, whether or not it ships a manifest. Users can switch "Open as Web App" off in the add dialog. — [heise online](https://heise.de/-10749652); [Michael Tsai, 2025-10-03](https://mjtsai.com/blog/?p=49472)

**Save loss and export codes**
- Community guidance on save loss:
  - Private browsing blocks saving.
  - Each browser has its own separate storage.
  - Players should copy the game's exported save string somewhere outside the browser regularly (for example weekly) and label it with a date.
  - Players report losing saves on iOS Safari.
  - — (search summary of itch.io threads and save-guide pages; low-reliability sources, individual posts not opened)
- Cookie Clicker-style games offer a copy-paste export/import save string. — [ponderworthy guide](https://ponderworthy.com/cookie-clicker-import-codes-copy-and-paste-how-to-save-your-progress-without-losing-your-mind-14on) (low-reliability SEO page)
- Melvor Idle offers cloud-save compatibility. — [Nuuvem listing](https://www.nuuvem.com/-/item/melvor-idle)

**Touch targets**
- **NN/g (Aurora Harley, 2019-05-05):**
  - Minimum about 1 cm × 1 cm (physical size).
  - Primary or on-the-move targets should be larger (examples are about 2 cm).
  - Fingertips are 1.6–2 cm wide.
  - About 2 mm spacing is a common minimum, but spacing does not rescue undersized targets.
  - Stacked buttons invite slips.
  - Desktop-style tiny controls often fail on tablets.
  - Limiting the number of on-screen elements allows bigger targets.
  - — [NN/g: Touch Targets on Touchscreens](https://www.nngroup.com/articles/touch-target-size/)
- **Other standards** (secondary summary; Apple HIG not opened directly):
  - Apple: 44×44 pt.
  - WCAG 2.2 SC 2.5.5 (AAA): 44×44 CSS px.
  - WCAG 2.2 SC 2.5.8 (AA): 24×24 CSS px or 24 px spacing.
  - Material Design: 48×48 dp.
  - — [Adrian Roselli, 2019](https://adrianroselli.com/2019/06/target-size-and-2-5-5.html)

**Hover**
- Wrap hover styles in `@media (hover: hover)` to avoid "sticky hover" on touch, and give tap feedback through `:active` states instead. — [Stefan Judis](https://www.stefanjudis.com/blog/the-hover-media-query-can-help-to-remove-hover-styles-on-touch)
- In a 2020 test, iPadOS 13.4 always matched `hover: none` / `pointer: coarse`, even with a trackpad. This is one user's test on an old OS and needs re-verification. — [r/webdev mirror](https://redlib.hbubli.cc/r/webdev/duplicates/g5gdlz)

### Inferences
- **The most likely real-world failure.** Friends may play in a Safari tab, skip the game for a week or two while still using Safari, then find their shop gone. Or an iPad low on storage evicts the least-recently-used origin. Both are plausible under the documented policies, and the game's "check in daily" design makes a lapse likely sooner or later.
- **Save protection, defense in depth:**
  1. Call `navigator.storage.persist()` on first launch and store the result.
  2. Show a one-time, illustrated Korean "add to Home Screen" guide (Share → Add to Home Screen). On iPadOS 26 this automatically creates a web app.
  3. Add a "save code" export: copy to clipboard and share via the iOS share sheet, for example to KakaoTalk "나와의 채팅" (KakaoTalk's chat-with-yourself).
  4. Add an import box.
  5. Show a gentle weekly reminder in the ledger ("백업한 지 7일", "7 days since your last backup").
  6. The planned friend-comparison feature will need a server anyway. A small server-side snapshot of the save at each sync would be the strongest fix.
  7. Do not store anything important in cookies.
- **Tabs and touch.** At iPad landscape width, ten tabs at about 44 pt or more fit in one row, but grouping is better. Grouping also supports progressive disclosure, for example 운영 (Operations: menu, orders, inventory, staff, levers), 장부 (Ledger: sales, ledger, post-mortem) and 소식 (News: messages, learn).
- **The weekly fast-play button is the primary CTA** and should be about 2 cm or larger, per NN/g.
- **No hover-only information.** Tooltips on numbers (for example "why did margin fall?") should be tap-to-open popovers or inline "?" chips.
- **Orientation.** The 3D miniature shop suggests landscape-first, with the 3D view on one side and the active panel on the other, and a stacked portrait fallback. No source was found specific to this game type (see Gaps).

### Gaps
- **Current state as of Oct 2026:** I found no WebKit post newer than August 2023 on storage policy, and no Safari 26-specific statement on whether the 7-day ITP rule still applies or how `persist()` is granted on iPadOS 26. This needs on-device testing or a check of WebKit release notes.
- Whether a Home Screen web app shares storage with Safari on the same origin was not confirmed in this research. If they are separate, a Safari-tab save will not appear in the installed app and an export/import migration is needed. Test on device.
- Apple HIG's 44 pt figure was not read from Apple's page directly; it comes from secondary summaries.
- No source was found on iOS install friction, for example the absence of an install-prompt API on iOS, or on landscape vs portrait conventions for iPad web games.
- iOS Safari save-loss reports are anecdotal (itch.io threads were not opened individually).

---

## 6. "Juice": how much feedback (sounds, number pops, small animations) makes a numbers-heavy game feel alive?

### Takeaway
"Juice", meaning plentiful feedback on every interaction, measurably makes a game feel more alive and polished. Designers warn that too much feedback confuses players and hurts focus. For a numbers-heavy, learning-focused game, the evidence supports targeted juice: on the result of a decision, on milestones and on events, rather than on everything.

### Cited Findings
- In "Juice It or Lose It" (GDC Europe 2012), Martin Jonasson and Petri Purho took a dull Breakout clone and made it feel far better live on stage without changing its rules. They added color, tweening, screen flashes and similar effects, and argued that juicier games are more fun and feel more professional. — [roblog, 2024-03](https://roblog.co.uk/2024/03/juicy-games/); [Game Developer video post, 2013-08-23](https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-)
- A follow-up talk, "Don't Juice It or Lose It", argued that polish can cost immersion. Lars Doucet is cited as warning that too much feedback can confuse players. — [Game Developer](https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-) (search summary)
- Juice is one component of game feel, not all of it. — [EOLT: Game Feel](https://eolt.org/articles/game-feel/) (search summary)
- Paperclips is text-and-button only, yet press singled out its sudden music cues and its log. — [Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips)
- A Dark Room uses no sound or pictures. The dimming screen as the fire dies doubles as a save reminder. — [PocketGamer.biz, 2014](http://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/)
- Cookie Clicker's early dense feel-good moments and its news ticker supply liveliness without complex visuals. — [Game Developer, 2013](https://www.gamedeveloper.com/design/the-recipe-behind-cookie-clicker)

### Inferences
- **Minimal text-first hits show that a few well-timed cues beat constant effects.** Paperclips used rare music stings, and A Dark Room used a dimming fire.
- **Suggested juice budget for this game** (inference):
  - A count-up animation on weekly profit and loss.
  - A coin "pop" on each sale tick during fast-play, throttled.
  - A distinct short sting when the game auto-pauses on a big event.
  - A small celebration for milestones (first ₩1M month, new dex card).
  - The 3D miniature as ambient life (customers entering, oven glow).
  - Sound off by default or respecting the iPad mute switch, with a toggle.
  - No juice on routine form inputs.
- **Use color and motion to teach.** For example, flash the ledger line that changed most this week, so feedback points at the lesson rather than decorating it.

### Gaps
- I found no quantitative study on juice levels in management or idle games specifically. The academic AIIDE paper surfaced in search was not opened.
- No source was found on iOS PWA audio behavior, such as autoplay restrictions or the mute switch.

---

## 7. What concrete lessons apply to the Korean pizza-shop management PWA?

### Takeaway
Treat each real day as one Wordle-sized ritual: arrive, read what happened, make one to three decisions, fast-play the week, and get a result worth sharing. Grow the UI the way Paperclips and A Dark Room do, never punish absence, and protect the save as seriously as the gameplay.

### Cited Findings
These lessons build on the evidence above:
- The Wordle daily limit, shared puzzle and share grid. — [Thumbsticks, 2022](https://www.thumbsticks.com/wardle-on-wordle-simple-word-game-global-phenomenon/)
- The Paperclips panel-by-panel reveal and its Business panel. — [if50](https://if50.substack.com/p/2017-universal-paperclips)
- A Dark Room's slow reveal, and the cost of a slow start. — [PocketGamer.biz](http://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/)
- Virtonomics' turn-per-day = game-week precedent and its education praise. — [Virtonomics help](https://virtonomica.ru/help/index.php/General_information/en); [Trustpilot](https://www.trustpilot.com/review/virtonomics.com?page=6)
- Pecorella on generator relevance and prestige. — [Game Developer](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)
- WebKit storage policies. — [2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/); [2023](https://webkit.org/blog/14403/updates-to-storage-policy/)
- NN/g touch targets. — [NN/g](https://www.nngroup.com/articles/touch-target-size/)

### Inferences
**Session design**
1. **Use a fixed five-beat session that always fits in 5–10 minutes.**
   1. A "while you were away" card (charge available, 1–2 message bubbles).
   2. One focus question, for example "Why was Tuesday slow?"
   3. One to three decisions.
   4. Fast-play the week, with auto-pause only on big events. Aim for at most about two interrupts per week so the 5–10 minute promise holds.
   5. A weekly result card.
2. **Make the result shareable like Wordle's grid.** A spoiler-free share text, for example 7 colored squares for daily profit/loss plus weekly profit and a rating, which friends can paste into KakaoTalk. It costs little, gives the friend group a ritual now, and seeds the later asset-comparison feature.
3. **Share one seeded week for everyone, Wordle-style.** If all friends face the same weekly market event or supplier crisis on the same calendar week, they have a shared topic. Keep the per-shop simulation deterministic as it is now.
4. **Respectful charge.**
   - No decay while away, no streak rewards and no push nags.
   - Cap banked charge (for example 3–4 weeks), with an optional "auto-run my standing orders" catch-up that outputs one summary.
   - Always show when the next charge arrives.
   - Keep ledger, dex and messages browsable with zero charge.

**Progressive disclosure**
5. **Start with about three surfaces, not ten tabs.** Status (3D shop), Menu/Price and one big "play this week" button. Paperclips puts price and demand second, so price is the right first lever.
6. **Let story events unlock tabs, Dark Room/Paperclips-style.**
   - The first supplier hint unlocks Orders/Inventory.
   - The first queue overflow unlocks Staff.
   - Week one ends and unlocks Ledger.
   - The first slow day unlocks Levers.
   - Month one ends and unlocks Post-mortem.
   - The first concept unlocks Learn.
   - New tabs appear with a short message bubble explaining why now. Do not show locked or greyed tabs.
7. **Use the message bubbles as tutor and narrator**, as Paperclips' log and Cookie Clicker's ticker do. Customer reviews and supplier hints should foreshadow the next concept, with no modal tutorial walls.
8. **Let a business problem unlock each concept card.** Each plateau (rent hike, competitor, ingredient spike) solved by a new lever drops a dex card that names the concept, such as contribution margin, safety stock or price elasticity. This is Paperclips' "breakthrough to pass a plateau", applied to learning.
9. **Avoid a dominant lever (Pecorella's generator relevance).** Rotate which lever matters through seasons, events and customer segments so no single setting "solves" the shop.
10. **Avoid A Dark Room's slow start.** Within 60–90 seconds of first launch, the player should have set a price, seen a customer react in a bubble, and watched profit tick.
11. **Use a "new season" or "second branch" as soft prestige.** Carry over dex cards and owner perks. Seasons also give friends fair, comparable starting lines for the comparison feature.

**iPad/touch**
12. **Touch targets of at least 44 pt (about 1 cm or more), with the main play button larger (about 2 cm).** No stacked tiny buttons. Price steppers should use big +/− buttons, not small number fields.
13. **No hover-dependent information.** Every explanatory tooltip should be a tap-to-open popover or inline "?" chip, with hover styles inside `@media (hover: hover)`.
14. **Landscape-first layout** with the 3D shop on one side and the active panel on the other, and a stacked portrait fallback. Group the tabs into three or four clusters to keep targets large.

**Save safety (iPadOS, dated facts above)**
15. Call `navigator.storage.persist()` on launch (supported since Safari 17, 2023).
16. Show a one-time Korean Add-to-Home-Screen guide. On iPadOS 26 (2025) this creates a web app by default, which gets its own usage counter and a better chance of persistence.
17. Add a "save code" export and import using the clipboard and share sheet, with a weekly backup nudge in the ledger.
18. When the friends feature adds a server, snapshot saves server-side too.
19. Never rely on cookies for saves.
20. Test on a real iPad: Safari tab vs Home Screen app storage separation, and data survival after more than 7 days.

**Juice**
21. **Keep juice targeted:**
    - Profit count-up.
    - Throttled coin pops during fast-play.
    - A distinct auto-pause sting.
    - Milestone confetti.
    - Ambient 3D life.
    - Sound respecting mute, default low.
    - Highlight the number that changed most, so the effect teaches the lesson.

### Gaps
- None of these lessons has been user-tested with the actual ~100 friends. The bank cap, interrupt budget and unlock order are design hypotheses.
- No source on Korean-specific sharing conventions (for example KakaoTalk share text formats) was researched here.
