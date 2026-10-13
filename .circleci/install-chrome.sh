#!/usr/bin/env bash
set -euo pipefail

# Resolve Stable on every run, using Google's automation distribution rather
# than the consumer .deb endpoint that stalls/resets on the CI runners.
download_dir=$(mktemp -d)
trap 'rm -f "$download_dir/stable.json" "$download_dir/chrome.zip"; rmdir "$download_dir"' EXIT

download() {
  curl --fail --show-error --location \
    --retry 5 --retry-all-errors --retry-max-time 300 \
    --connect-timeout 30 --max-time 180 --output "$2" "$1"
}

download \
  https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json \
  "$download_dir/stable.json"

chrome_version=$(jq -er '.channels.Stable.version | select(type == "string" and length > 0)' "$download_dir/stable.json")
chrome_url=$(jq -er '.channels.Stable.downloads.chrome[] | select(.platform == "linux64") | .url | select(type == "string" and startswith("https://storage.googleapis.com/chrome-for-testing-public/"))' "$download_dir/stable.json")
echo "Downloading Chrome for Testing Stable $chrome_version for Linux AMD64"
download "$chrome_url" "$download_dir/chrome.zip"

# Test the complete archive before installing it. Keep all files together:
# Chrome requires the libraries and resources shipped alongside its executable.
unzip -tq "$download_dir/chrome.zip"
sudo mkdir -p /opt/chrome-for-testing
sudo unzip -q -o "$download_dir/chrome.zip" -d /opt/chrome-for-testing
/opt/chrome-for-testing/chrome-linux64/chrome --version
