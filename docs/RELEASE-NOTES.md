Nuvori's first portable Windows release for SMOG includes the current Auralis adventure, all 176 Nuvo forms, branching evolutions, trainers, Champions League co-op, friends and chat, the daily wheel, five Suno music themes, and 104 sound effects/ambience clips.

Add **FennXWeb/Nuvori** in SMOG. The launcher selects **Nuvori-1.0.0-windows-x64.zip**. Install and Play. To launch manually, extract the entire ZIP and run `smog_launch.bat` or `Nuvori.exe`. Node.js and a separate browser runtime are not required. F11 toggles fullscreen.

Guest adventures work offline. Google/Discord sign-in opens your default browser; after provider consent, click **Return to Nuvori** to finish in the game. Internet access is required for accounts, cloud saves and multiplayer. Existing browser guest saves stay in that browser; signing into the same account loads its cloud adventure.

Desktop saves and settings live in `%APPDATA%\FennXWeb\Nuvori`, outside SMOG's versioned game folder, and survive game updates. Close the game before installing updates through SMOG. The compiled game and audio are bundled locally; it does not stream the web game or change itself when the website updates.

This early-access release is not code-signed. All three original SMOG artwork files, metadata and launch script are included both in the repository and at the ZIP root. `SHA256SUMS.txt` records the build checksum.
