Nuvori release notes.

## 1.3.1 · Soft Trails (web)

- Eight new ElevenLabs grass footfalls with shuffled playback, plus remade selection, confirm, back, error, notification, reorder, purchase and customization cues.
- Shorter, softly leveled effects with filtered harsh frequencies, clean attacks and faded tails. Versioned audio filenames refresh cached sounds.
- Seamless repeating terrain materials, irregular blended path and paving edges, rounded corners, and curved shoreline washes. Bridge decks remain sharply defined.
- Terrain composition is cached and bounded to two regions. Existing paths, collision rules, encounters and saves remain compatible.

## 1.3.0 · Living Auralis (web)

- A cinematic main menu starring Solunelle, with a layered starlit sanctuary, animated creature artwork, drifting particles, pointer parallax and a shimmering Nuvori logo.
- An illustrated, animated 100-tier pass gallery with keeper cosmetic previews, reward claims, XP boosts and a guest preview before character creation.
- Daily wheel and reset countdown, global/local chat, friends and requests, in-game update history, account controls, settings, crew, journal and world atlas directly from the lobby.
- Responsive menu layouts, keyboard-accessible controls and reduced-motion support. The world stops rendering while covered by the lobby.
- Four directional facings for all 312 Nuvo forms, with walking, hopping, flying, swimming, crawling or floating movement and idle, attack, damage, faint, summon and recall actions.
- Animated followers and ordered wild/trainer battle scenes; Champions animations follow confirmed multiplayer updates.
- More expressive keeper walk/sprint strides, with existing customization retained.
- Eight new town building styles, twelve decorative props, animated fountain water and wandering residents with conversations.
- Complete sprite bounds, battle ordering and resident navigation checks. Existing saves remain compatible; no database migration is required.

## 1.2.2 · Illustrated Auralis (web)

- Remade customized keepers and NPCs with illustrated layered sprites, four facings, walking/sprinting and all existing appearance choices.
- Detailed terrain textures, tall grass, cave entrances, town furniture and twelve landmark illustrations matched to Nuvo art.
- Distinct nursery, tailor, barber and Champions buildings, four residential styles, and furnished interiors with timber floors and decorated walls.
- Full silhouette measurements prevent adjacent sprites from leaking into crops. Existing adventures and online compatibility are preserved.

## 1.2.1 · Wild Paths (web)

- Six new connected regions: Brookbend Crossing, Bramble Labyrinth, Echohollow Caverns, Glassvein Tunnel, Lantern Lake, and Rimewind Pass.
- Rivers, traversable bridges, cave chambers, lake islands, maze walls and switchback terraces across new and existing wild regions.
- Every original Nuvo has at least two genuine wild habitats. Towns no longer advertise wild spawns; Nuvopedia habitat text comes from the encounter tables.
- Terrain-accurate minimap and area atlas with route connections, landmarks and species lists. Cave encounters use gravel beds; roads and bridges remain safe.
- Existing saves relocate safely if changed terrain covers the keeper; local chat supports the new regions.

## 1.2.0 · First Light (web)

- Full-screen exploration, main menu, Esc pause and Tab journal.
- Four-times-larger regions, smooth camera, tall-grass encounters and residential town districts.
- Expanded directional character customization, stronger type-specific battle SFX/VFX, and a skippable evolution cinematic.
- Free 100-tier Season 1 with timed XP boosts, supplies, coins, four exclusive cosmetics, and the new mythical Solunelle.
- Existing adventures retained; online catalog and keeper appearance support updated.


- Male and female Nuvo, with stable assignments for existing companions.
- Walkable nurseries in all five towns. Pair opposite-sex Nuvo from the same family, including different branches, for a level-1 base-form offspring. Rarity, levels and evolution stages determine the wait. Signed-in visits persist across devices and use the server clock.
- Five-stage starter families with branching at the first, third and final evolution. Other families have varied depths and branch patterns.
- Mythical Dreamweaver: four stages and 85 forms, with four choices at every evolution. Catch one wild male and one wild female per adventure; their nursery descendants can explore additional paths.
- 311 playable forms across 27 families, 135 new creature illustrations, complete sprite crops, animated followers, and an updated Nuvopedia path browser.
- Existing adventures, companion identities, Prismatic status and desktop settings are preserved.

All 67 gameplay, PostgreSQL, audio, rendering and desktop regression checks pass. The nursery migrations are installed on the live backend. Local browser checks cover pairing, timers, cancellation, collection and evolution browsing.

Add **FennXWeb/Nuvori** in SMOG and install the latest release. The portable archive is **Nuvori-1.1.0-windows-x64.zip**. To launch manually, extract the entire ZIP and run `smog_launch.bat` or `Nuvori.exe`. Node.js and a separate browser runtime are not required. F11 toggles fullscreen.

Guest adventures work offline. Google/Discord sign-in opens your default browser; after consent, click **Return to Nuvori**. Accounts, cloud saves and multiplayer require internet access. Desktop saves live in `%APPDATA%\FennXWeb\Nuvori`, outside SMOG's versioned installation folder. Close the game before updating through SMOG.

This early-access Windows build is not code-signed. All five SMOG files are included at the archive root. `SHA256SUMS.txt` records the build checksum.
