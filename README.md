<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1983f341-313b-49b7-b999-b621ecf8bfc0

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Tauri desktop and mobile releases

For a new AI Studio project, run the preparation scripts once, in this order:

The Python helper scripts are intentionally excluded from GitHub. Keep the local copies in the project folder; they are needed to prepare the project and create releases from that local checkout, but GitHub Actions does not run them.

1. Download the project from AI Studio.
2. Set the app/repository identity and updater public key in `prepare-tauri.py`, then run `python prepare-tauri.py`.
3. Run `python prepare-workflow.py` once. This adds the Tauri updater integration and creates the combined workflow for Windows, Linux, Intel/Apple Silicon macOS, Android, and iOS simulator builds.
4. Create an **empty** GitHub repository, add it as the `origin` remote, and configure the Actions secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. The private signing key must match the public key in `src-tauri/tauri.conf.json`; never commit or share it.
5. Run `python py-version.py` for the first release and again for each subsequent release. It updates the frontend, Rust, and Tauri versions together, commits the prepared project, and pushes one `v<version>` tag. The first run initializes the empty remote branch.

The combined workflow builds one draft release with desktop updater bundles, `latest.json`, and mobile artifacts from the same commit and version. It publishes the release only after all selected builds succeed. Windows, Linux, and Intel/Apple Silicon macOS updates use Tauri's signed updater. Android builds upload release APKs. The iOS job uses Xcode 16.4 to build and upload a simulator archive; this does not require an Apple signing certificate. Publishing production Android/iOS builds to Google Play or the Apple App Store requires the respective signing credentials and store-upload configuration, which are not included.

The configured GitHub Releases endpoint must be anonymously reachable by installed apps; a private repository cannot serve updater manifests to unauthenticated clients. Do not run both `tauri-build.yml` and a separate updater release workflow for the same tag. The combined workflow uses only `v*` tags, and GitHub Actions merges the per-platform desktop entries into the release's `latest.json`.
