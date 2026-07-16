#!/usr/bin/env sh
# Configure local Git to auto-merge data/calendar-events.json conflicts.
# Run once after cloning: sh scripts/setup-calendar-merge-driver.sh

set -e # Exit on first failure

git config merge.calendar-json.name "Merge calendar-events.json by combining items" # Human-readable merge driver label
git config merge.calendar-json.driver "node scripts/merge-calendar-events.js %O %A %B" # Resolve conflicts by unioning events

echo "Configured calendar-json merge driver for this repo." # Confirm setup completed
