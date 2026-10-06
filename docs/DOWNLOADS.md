# Downloads

Native builds of ibl.ai/crm are produced by the release workflows in
[`.github/workflows/`](../.github/workflows/) and attached to GitHub Releases:

| Surface                            | Workflow                                                                            | Trigger                                | Artifact                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| macOS (Universal)                  | [`tauri-release-macos-dmg.yml`](../.github/workflows/tauri-release-macos-dmg.yml)   | push an `app-v*` tag (or run manually) | signed & notarized `.dmg`                 |
| Windows x64/arm64                  | [`tauri-release-windows.yml`](../.github/workflows/tauri-release-windows.yml)       | push an `app-v*` tag (or run manually) | signed NSIS `-setup.exe`                  |
| Windows MSIX                       | [`tauri-build-windows-msix.yml`](../.github/workflows/tauri-build-windows-msix.yml) | run manually                           | `.msix` for sideloading / Microsoft Store |
| Linux · macOS · Windows (unsigned) | [`tauri-build-desktop.yml`](../.github/workflows/tauri-build-desktop.yml)           | run manually                           | `.deb`, AppImage, `.app`, `.exe`          |
| iOS                                | [`tauri-build-ios.yml`](../.github/workflows/tauri-build-ios.yml)                   | run manually                           | `.ipa` (App Store Connect export)         |

The native app is versioned independently of the web app (its own `app-v<X>`
line, from `src-tauri/tauri.conf.json`).

## Releases

**Web app:** every push to main is released automatically by [release-it](../.release-it.json) through [`release.yml`](../.github/workflows/release.yml) — a `v<version>` tag and a [GitHub Release](https://github.com/iblai/crm/releases) whose notes are the CHANGELOG entry generated from the commits.

**Native builds:** manual until crm.ibl.ai is live (the shells load it). Push an `app-v<version>` tag — `<version>` from `src-tauri/tauri.conf.json`, currently `0.2.0` — to run the macOS and Windows release workflows, which attach the installers to that tag's release; or run any build workflow from the Actions tab.

| Version    | Date | Download                                                               |
| ---------- | ---- | ---------------------------------------------------------------------- |
| app-v0.2.0 | —    | Push the `app-v0.2.0` tag to publish the first macOS + Windows builds. |
