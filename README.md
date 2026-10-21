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

## Tauri automatic updates

Production desktop builds check the configured GitHub Releases endpoint when PandaFlow starts. Available updates are downloaded only after confirmation, and the app restarts after installation.

To publish a signed update:

1. Add the private updater key file contents to the GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY`.
2. Add the private key's password to the GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
3. Never commit or share the private key or its password. The public key is configured in `src-tauri/tauri.conf.json`.
4. Update the versions in `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`, then push a matching `app-v<version>` tag (for example `app-v1.2.1`). The repository must be public for the configured GitHub Releases update endpoint.

The release workflow builds and signs update packages for Windows, Linux, and Intel/Apple Silicon macOS, then publishes the updater manifest with the release.
