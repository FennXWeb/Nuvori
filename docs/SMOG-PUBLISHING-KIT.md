# Publish a game to SMOG

Give this file to the agent building your game. SMOG is a Windows desktop launcher using GitHub Releases to distribute portable game builds.

## Five-file contract

Put these files at the repository root and include them in the build ZIP alongside the game executable:

| File | Purpose |
| --- | --- |
| `smog_icon.ico` | Multi-size Windows game icon, ideally 16, 32, 48, and 256 px. |
| `smog_logo.png` | Transparent title/wordmark; recommended 1200 × 400 px. |
| `smog_header.png` | Landscape game artwork; recommended 2400 × 1000 px. |
| `smog_meta.xml` | Metadata using the schema in the supplied template. |
| `smog_launch.bat` | Launch entry point, run with the game directory as its working directory. |

The included artwork is SMOG-branded placeholder art. Replace all three artwork files with your own game's art. The launcher requires `smog_meta.xml` in the repository and `smog_launch.bat` in the build. Unavailable artwork uses a fallback.

## Metadata

Use the supplied `smog_meta.xml`. Its root must be `<smog>`. `title`, `description`, `developer`, `genre`, `version`, `accent`, `tags/tag`, and `release/asset` are supported. Use UTF-8. Escape XML characters such as `&` as `&amp;`. DTDs and custom entities are not allowed. `accent` accepts a six-digit hexadecimal color. Asset names support `*` wildcards, so `*windows*.zip` matches `my-game-windows-x64.zip`.

Repository metadata and artwork come from the default branch. The latest published non-prerelease GitHub Release is the source of truth for the available version; the XML `version` is descriptive. If multiple ZIP assets exist and no pattern matches, the player chooses a build.

## Portable build

1. Build a portable Windows x64 game, including runtime files and assets. An installer EXE alone is not a portable build.
2. Copy the five SMOG files into the build directory. Edit the BAT file to invoke the actual game executable. Use a direct invocation rather than `start`, so the batch process waits for the game and SMOG can record play time.
3. Store saves in `%APPDATA%\YourStudio\YourGame` or `%LOCALAPPDATA%\YourStudio\YourGame`, never in the versioned installation directory. The launcher does not migrate game-specific save formats.
4. ZIP the build files. `smog_launch.bat` must be at the ZIP root, or inside a single top-level folder containing the game. Nested executable paths can be launched by the BAT file.
5. Publish a GitHub Release tagged `v1.0.0`, and attach `my-game-windows-x64.zip`. GitHub's automatic source archives do not count as built games.
6. Add `owner/repository` to SMOG, inspect the metadata, choose the release ZIP, and add it to the library. Install, then Play.
7. For updates, publish a new release such as `v1.0.1` with another ZIP. SMOG checks on launch, every 30 minutes while open, and when the player clicks Check for updates. The player chooses when to install updates.

## Build layout

```text
my-game-windows-x64.zip
├── smog_icon.ico
├── smog_logo.png
├── smog_header.png
├── smog_meta.xml
├── smog_launch.bat
├── MyGame.exe
└── data/
```

Private repositories require a fine-grained GitHub token with Contents: read access, configured in the SMOG desktop app. Public repositories do not require a token. Artwork must be served by the GitHub Contents API and each file must stay under 8 MB. Use real files rather than Git LFS pointer files.

ZIP downloads are limited to 10 GB, extracted content to 30 GB / 100,000 entries. Symlinks, traversal paths, alternate data streams, and Windows reserved filenames are rejected. GitHub SHA-256 digests are checked when supplied. Updates stage in a separate directory and only become active after validation. Prior versions remain on disk for recovery. Uninstall removes every version and any saves stored inside those directories.
