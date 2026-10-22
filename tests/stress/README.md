# Stress test: a 300-file pack

Not part of `npm test`: it needs ~450 MB of disk and a few minutes.

```bash
npm run test:e2e -- tests/e2e/landing.spec.ts   # once, to generate tests/e2e/.artifacts/fixtures
mkdir -p /tmp/lr-stress && node tests/stress/generate.mjs /tmp/lr-stress 120   # 120 camera-size photos, 150 statements, 20 screenshots, 10 locked PDFs
npm run build && npx next start -p 3200 &
node tests/stress/run.mjs /tmp/lr-stress
```

Result on 22 Oct 2026 (4-core Linux VM, headless Chromium, desktop viewport): 300 files (424 MB) checked in 10 s,
built in 27 s into 8 attachments (all under 5,000,000 bytes, every page present), renderer memory peaked at about
690 MB, JavaScript heap under 60 MB. Real phones (especially older iPhones in Safari) still need checking by hand.
