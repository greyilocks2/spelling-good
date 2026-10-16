# Frog Spelling — installable offline PWA

A static, no-server-runtime spelling trainer for primary school children. The source word list is `tricky-words.txt` (included), deduplicated **within each year** into `words.json` (45 words from the KS1 section, 64 from the KS2 section).

## Publish with GitHub Pages

1. Create a public GitHub repository and upload **all files**, preserving the `icons` folder.
2. Open **Settings → Pages**, select **Deploy from a branch**, choose `main` and `/ (root)`, and save.
3. Open the HTTPS URL GitHub gives you. On Android/desktop Chrome use **Install app**; on iPhone/iPad Safari use **Share → Add to Home Screen**.
4. Open the app online once to cache its files. Later, tests and results work offline. The device must have a usable English text-to-speech voice installed for offline audio.

To try locally, do not open `index.html` using `file://`. Run `python3 -m http.server 8000` in this directory and visit `http://localhost:8000` (or use any local static web server).

## Storage and privacy

Profiles and every attempt are stored in **IndexedDB in that browser on that device**. No data is sent to a server. The app records submitted spelling, correctness, elapsed milliseconds, and date/time. Results are not shared between devices. Use **Export backup** regularly. Import appends attempts, so do not import the same backup twice. Clearing site data, changing browser, or uninstalling the app may delete progress.

## Selection and marking

- Random: any words from selected year(s).
- Least tested: fewest attempts first, ties random.
- Most difficult: highest wrong-answer percentage first, average time breaks ties; never-attempted words follow attempted words (including fully correct words). You can use least-tested to introduce new words.
- 5/10/20: cap to available words; All matching words: entire selected year(s), regardless of selection mode.
- Word is spoken, never shown before checking. Speech repeat does not affect score. Timer begins as the question appears; time includes listening/repeats.
- Check stores the attempt immediately; Next advances. Exact spelling comparison is case-insensitive and ignores surrounding whitespace; no spellcheck/autocorrect.

## Limitations

Browser text-to-speech quality and offline voices depend on OS/browser. For consistently pronounced tricky words on every device, a future release could include recorded audio files. Backups are JSON; importing does not deduplicate previous attempts. The app is intentionally static, with no Go/SQLite server.

## Version 2: clearer speech

Two buttons play the word and a short example sentence, at 0.68 speech rate using an available British English voice. The word remains hidden until checked. The selection labels are now KS1 and KS2 **as requested**, but please note the original uploaded source actually contains Year 1 and Year 2 lists (both normally KS1). The KS2-labelled selection currently contains the original Year 2 words, **not a genuine KS2 word list**. Replace/add KS2 words when supplied.

The service worker cache is updated to v2. Refresh the published page (possibly twice) to activate the new version; existing IndexedDB progress is preserved.

## Version 3

The test displays an example sentence with the target word replaced by a fixed-width blank. The child can hear the word or full example sentence. Voice selection and a 60–110% speed slider (default 85%) are provided and remembered on the device. Available voices depend on browser and installed system voices. On localhost the app unregisters its service worker to make development updates easier; previously cached pages may require a one-time unregister and hard refresh. IndexedDB progress is retained.


## Version 4 additions

The stage selector now shows Year 1, Year 2, Years 3/4, and Years 5/6.
The Years 3/4 and Years 5/6 words were transcribed from the two supplied school images.
Words printed with parenthesised endings (e.g. accident(ally)) have been expanded into separate spellings where appropriate.
Every new word has a sentence with the spelling masked in the quiz.
Existing progress is retained; the IndexedDB schema is unchanged. The offline cache name was updated to v4.
