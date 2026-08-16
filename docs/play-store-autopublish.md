# Play Store autopublish (Google service account key)

`npm run release:android` already ends in
`eas build … --auto-submit-with-profile production --non-interactive`, so the
only missing piece for hands-off publishing is a **Google Play service account
JSON key**. It has to be created inside your own Google account — nobody else
can mint it for you — but it is a five-minute, one-time job.

Facts you need while clicking through:

| Thing | Value |
| --- | --- |
| Play app | Moonraker's Analytics |
| Android package | `com.fochizzy.moonrakers` |
| Play developer account | Fochizzy — ID `7665582709279482429` |
| EAS account / project | `fochizzy` / `moonrakers-app` |
| gcloud (this machine) | `C:\Users\izzyh\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin` |

## 1. Find the API access page

Google keeps moving this one. As of Aug 2026 the old
`/console/u/0/developers/<devId>/api-access` URL redirects to the app list, and
it is not under **Settings** or the top of **Developer account** — look for
**Settings → Developer account → API access**, or reach the service account
list through **Users and permissions**.

Linking a Google Cloud project is no longer required just to use the Play
Developer API. What matters is step 3: the service account has to appear under
**Users and permissions** with release rights on the app.

## 2. Create the service account and its key

Google Cloud Console → **IAM & Admin → Service Accounts → Create service
account**:

- Name: `eas-submit` (anything works)
- Skip the "Grant this service account access to project" step — no Cloud IAM
  roles are needed. Play permissions are granted separately in step 3.
- Create, then open the account → **Keys → Add key → Create new key → JSON**.

The browser downloads a file like `moonrakers-abc123.json`. **That download is
the JSON.** Keep it — Google will not show the private key again.

Or do the same thing from the terminal with the Cloud SDK, which is scriptable
and writes the key straight to the gitignored path:

```bash
gcloud auth login
```

```bash
gcloud config set project PROJECT_ID && gcloud services enable androidpublisher.googleapis.com && gcloud iam service-accounts create eas-submit --display-name "EAS Play submissions"
```

```bash
gcloud iam service-accounts keys create credentials/play-service-account.json --iam-account eas-submit@PROJECT_ID.iam.gserviceaccount.com
```

### What exists today (set up 2026-08-16 — this is all done)

- Cloud project `moonrakers-app` (number 732389506518), `androidpublisher.googleapis.com` enabled
- Service account **`eas-submit@moonrakers-app.iam.gserviceaccount.com`**
- Key written to `C:\Users\izzyh\.secrets\moonrakers-play-service-account.json`
  (canonical copy, outside every git repo) and copied to
  `credentials/play-service-account.json`, which `eas.json` points at
- Invited under Play **Users and permissions**, scoped to Moonraker's Analytics
  only, with view app information + all three release permissions (production,
  testing tracks, manage tester lists)
- Verified end to end: the service account opened a Play edit and discarded it,
  which proves auth without publishing anything. Repeat that check any time
  with `edits.insert` followed by `edits.delete`.

To rotate or add a key later:

```bash
gcloud iam service-accounts keys create credentials/play-service-account.json --iam-account eas-submit@moonrakers-app.iam.gserviceaccount.com --project moonrakers-app
```

## 3. Grant it Play permissions

Play Console → **Users and permissions → Invite new users**. Paste the service
account's email (`eas-submit@<project>.iam.gserviceaccount.com`), restrict it to
Moonraker's Analytics, and give it at minimum:

- View app information and download bulk reports
- Manage testing track releases
- Manage testing tracks and edit tester lists
- Manage production releases *(only if you ever want `track: "production"`)*

Invite, then wait a minute or two — permissions take a moment to propagate.

## 4. Hand the key to EAS

Preferred, because the key then lives on Expo's servers and never sits in the
repo or in a machine backup:

```bash
eas credentials --platform android
```

Pick the `production` build profile → **Google Service Account** → *Manage your
Google Service Account Key for Play Store Submissions* → **Set up a new key** →
give it the path to the downloaded JSON. After that, `eas submit` authenticates
non-interactively from any machine, including CI.

Alternative, if you would rather keep the key on disk: drop it somewhere outside
the repo (or at `credentials/play-service-account.json`, which `.gitignore`
already covers) and add the path to the submit profile in `eas.json`:

```json
"submit": {
  "production": {
    "android": {
      "track": "internal",
      "serviceAccountKeyPath": "./credentials/play-service-account.json"
    }
  }
}
```

## 5. Ship

```bash
npm run release:android
```

Bumps the patch version, builds the AAB on EAS, and submits it to the
**production** track with no prompts. Production submissions go through full
Play review and, once approved, make the app publicly available — the app sat on
Closed testing until this was set. Change `track` in `eas.json` to `internal`,
`alpha` (closed), or `beta` (open) to aim a release at testers instead.

## Notes

- The Play Developer API cannot create the *first* release for a package. That
  one had to be uploaded by hand — already done for
  `com.fochizzy.moonrakers`, so every later release can go through the API.
- Treat the JSON as a live credential: it can publish to your store listing.
  Don't paste it into chat, a PR, or a shared drive. If it leaks, delete the key
  in Cloud Console → Service Accounts → Keys and create a new one.
- Revoking is symmetric: remove the service account user in Play Console to cut
  off publishing without touching the Cloud project.
