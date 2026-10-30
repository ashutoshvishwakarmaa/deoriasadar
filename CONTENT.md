# Editing the Deoria guide's content

This guide is for people who want to fix or add information on the site but do not write code. You only need a free GitHub account and a web browser.

All the site's content (places, officials, phone numbers, transport, history, photos) lives in plain text files in [`src/data`](src/data). Each file is JSON: a list of entries written as `"field": value` pairs. When you change one and your change is accepted, the site updates on the next deploy.

If you would rather not edit files at all, use **Suggest an edit** on any place page, or open a [content correction issue](https://github.com/ashutoshvishwakarmaa/deoriasadar/issues/new?template=content-correction.yml) and a maintainer will make the change.

## Edit a file on github.com

1. Open the file, for example [`src/data/places.json`](src/data/places.json).
2. Click the **pencil icon** (Edit this file) at the top right of the file.
3. Make your change. Keep the quotes, commas and brackets exactly as they are around it.
4. Click **Commit changes…**, write one line saying what you changed (for example "Fix phone number for District Hospital"), and click **Propose changes**.
5. On the next screen click **Create pull request**. GitHub makes a copy of the project (a fork) and a branch for you automatically.
6. Fill in the checklist in the pull request description. Our automatic checks (CI) run in a few minutes. A maintainer reviews and merges it.

You can keep editing the same pull request: open the file from your branch and click the pencil again.

## What the fields mean

Every piece of text has two versions, `en` (English) and `hi` (Hindi), and **both must be filled in**:

```json
"name": { "en": "Hanuman Mandir", "hi": "हनुमान मंदिर" }
```

### Places (`places.json`)

| Field          | Required? | Meaning                                                                                                                        |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `slug`         | yes       | The address of the page: lowercase letters, numbers and dashes only, e.g. `hanuman-mandir` → `/en/explore/hanuman-mandir`.     |
| `categories`   | yes       | One or more of `faith`, `health`, `transport`, `offices`, `education`. Decides the map layer and listing.                      |
| `name`         | yes       | Name of the place (en + hi).                                                                                                   |
| `area`         | yes       | Neighbourhood or town (en + hi).                                                                                               |
| `summary`      | yes       | One or two sentences about the place (en + hi).                                                                                |
| `verified`     | yes       | Date someone last checked the facts, as `"YYYY-MM-DD"` (e.g. `"2026-10-31"`), or `null` if not yet checked.                    |
| `sources`      | yes       | List of source ids from [`sources.json`](src/data/sources.json), e.g. `["deoria-tourist-places"]`. Use `[]` if there are none. |
| `aliases`      | no        | Other spellings people search for, e.g. `["dudheshwar", "dugdheswar"]`. English letters are fine.                              |
| `distance`     | no        | Distance from the city centre (en + hi), e.g. `"~35 km"` / `"~35 किमी"`.                                                       |
| `tips`         | no        | Practical advice for visitors (en + hi).                                                                                       |
| `phone`        | no        | Phone number as text, e.g. `"05568-222222"`.                                                                                   |
| `coords`       | no        | Map position as `[latitude, longitude]`, e.g. `[26.5024, 83.7791]`.                                                            |
| `coordsApprox` | no        | Set to `true` unless the coordinates were surveyed on site. The page then says "Approximate location".                         |
| `featured`     | no        | `true` shows the place on the home page.                                                                                       |
| `schemaType`   | no        | Type for search engines, e.g. `HinduTemple`, `Hospital`, `TrainStation`. Leave it out if unsure.                               |
| `photoId`      | no        | Id of a photo in `photos.json`.                                                                                                |
| `photo`        | no        | Short label shown in the grey box when there is no photo yet, e.g. `"temple exterior"`.                                        |

### Officials (`officials.json`)

- `role`, `name`, `meta` (party, year, office): all en + hi.
- `verified`: `true` or `false`. Keep it `false` until you have confirmed the person from an official source. The site then shows a **Re-check** badge, and the assistant warns that the entry is unconfirmed.

### Emergency numbers (`emergency.json`)

- `number`: digits and dashes only, e.g. `"112"` or `"05568-222222"`.
- `label`: what the number is for (en + hi).
- `featured`: exactly **one** entry has `"featured": true`; it is shown largest. Do not add `featured` to any other entry.

### Transport (`transport.json`)

- `mode`: e.g. Rail, Bus, Air (en + hi).
- `head`: the headline, e.g. the station name (en + hi).
- `body`: the details (en + hi).

### Photos (`photos.json`)

Adding a photo also needs the image file uploaded under `public/images/photos/`, so ask a maintainer if you are unsure. Each entry has:

- `id`: lowercase letters, numbers and dashes, e.g. `hanuman-mandir-pond`.
- `src`: the image path, starting with `/images/`, e.g. `"/images/photos/hanuman-mandir-pond.jpg"`.
- `width`, `height`: the image size in pixels.
- `caption`: en + hi.
- `author`, `license`, `licenseUrl`, `sourceUrl`: who took it, its licence, a link to the licence and a link to where it came from. **Only use photos you are allowed to use** (your own, or e.g. Wikimedia Commons under CC BY / BY-SA / CC0). Credits are shown on the site.
- `focus` (optional): which part to keep when cropping, e.g. `"50% 30%"`. `fit` (optional): `"contain"` to show the whole image uncropped.

History, people and the city facts are in `city.json` and `people.json`. They follow the same en + hi pattern.

## Example: fix a place's phone number

Say the phone number for a hospital has changed (the numbers below are made up). In `places.json`, find the place (press Ctrl+F / Cmd+F and type its name), and change only the number and the date you checked it:

```diff
-    "phone": "05568-222222",
+    "phone": "05568-233333",
-    "verified": "2026-03-14",
+    "verified": "2026-10-31",
```

In the pull request, link where you found the new number (for example the hospital's page on deoria.nic.in). If that source is not in `sources.json` yet, add it there and list its id in the place's `sources`.

## Example: add a new place

Add a new entry to the list in `places.json` (this one is only an illustration; use the real details). Put it after another entry's closing `}` and **add a comma** between the two:

```json
  },
  {
    "slug": "shiv-mandir-ramnath",
    "categories": ["faith"],
    "name": { "en": "Shiv Mandir", "hi": "शिव मंदिर" },
    "aliases": ["shiv temple", "shiva mandir"],
    "area": { "en": "Ramnath", "hi": "रामनाथ" },
    "summary": {
      "en": "A neighbourhood Shiva temple, busiest during Sawan and Mahashivratri.",
      "hi": "मोहल्ले का शिव मंदिर, सावन और महाशिवरात्रि में सबसे अधिक भीड़ रहती है।"
    },
    "coords": [26.5024, 83.7791],
    "coordsApprox": true,
    "verified": null,
    "sources": []
  }
]
```

The `slug` must not already be used by another place. Leave out optional fields you do not know rather than guessing.

## What the automatic checks do

Every pull request runs our CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): type checks, lint, formatting, tests and a full build. The tests and the build read every content file and check it field by field, so a mistake cannot reach the live site.

If something is wrong you will see a red ✗ next to **CI** on the pull request. Click **Details** and look for a message like:

```
Error: Invalid content in src/data/places.json:
✖ expected YYYY-MM-DD
  → at [1].verified
✖ Invalid input: expected string, received undefined
  → at [1].name.hi
```

This says that in `places.json`, entry number **1** (counting from 0, so the second entry) has a date in the wrong format and is missing its Hindi name. Other messages you may see:

- `Place "…" cites unknown source "…"`: add that source to `sources.json` or fix the id.
- `Duplicate place slug "…"`: choose a different `slug`.
- `Unknown photo id "…"`: the `photoId` does not match any entry in `photos.json`.
- `emergency.json must mark exactly one number as featured`.
- A formatting (Prettier) failure: usually spacing or a missing comma; a maintainer can fix this for you.

Fix the file on your branch (pencil icon again) and CI runs again automatically. If you are stuck, leave a comment on the pull request.

## How visitors' corrections reach editors

Visitors who do not use GitHub can still report problems:

- **Suggest a correction form** (About page): each submission is saved in the Redis list `corrections` (newest first, visible in the Upstash data browser) and emailed to the editors when email is set up.
- **Assistant feedback**: 👍 / 👎 ratings on the assistant's answers go to the Redis list `feedback`, and questions the guide could not answer go to `gaps`. These are anonymous; phone numbers and email addresses are removed.
- **Suggest an edit** (place pages): opens the GitHub content correction form with the place already filled in.

A maintainer with the Redis credentials runs `npm run feedback` to print the most common unanswered questions (content to add) and the latest 👎 answers. Turn the useful ones into issues or pull requests.

## Typing in Hindi

Every text needs a Hindi version. You do not need a Hindi keyboard:

- **Google Input Tools** ([google.com/inputtools/try](https://www.google.com/inputtools/try/)): type the word in English letters, e.g. `mandir`, and it suggests `मंदिर`. Copy the result into the file.
- On a phone, add the **Hindi** language to Gboard or the iOS keyboard and use its transliteration (Hinglish) mode.
- On Windows, add **Hindi (India)** with the **Hindi Phonetic** keyboard; on a Mac, use **Devanagari – QWERTY**.

Write the Hindi people in Deoria would actually use rather than a word-for-word translation, and keep proper names as they are locally spelled. If you cannot write the Hindi, say so in the pull request and a maintainer will help.
