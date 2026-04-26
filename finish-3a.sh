#!/bin/zsh
# Finish chunk 3a — build, commit, push.
# Run with: bash /Users/marco/CCP/finish-3a.sh

set -e
cd /Users/marco/CCP

echo "=== Step 1/4: status ==="
git status --short

echo "=== Step 2/4: build ==="
npm run build

echo "=== Step 3/4: stage + commit ==="
git add -A
git commit -m 'chunk 3a: scope text-size slider to body content, add Menu Size chrome preset - bug fix: drop the global h1-h4 multiplier rule; body slider now only scales chapter, threads, markdown, annotation body, journal Tiptap content, card-body paragraphs. New feature: --chrome-text-scale CSS var driven by Menu Size preset (S/M/L/XL = 0.875/1/1.15/1.35); applied via .chrome-scoped opt-in ancestor + .text-display-* / .text-eyebrow utilities. Persists in localStorage as ccp-chrome-text-scale. Chrome surfaces opted in: DesktopSidebar, MobileTabBar, MobileMoreDrawer, ReadingToolbar panel, JournalToolbar, AnnotationPanel, ReferenceModal, QuoteFromReadingModal. Cleanup: deleted dead ccp-font-size localStorage key + onFontSizeChange prop in ChapterReader/ReadingToolbar.'

echo "=== Step 4/4: push ==="
git push origin main

echo ""
echo "=== Done. ==="
git log -1 --oneline
