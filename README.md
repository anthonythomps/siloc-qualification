# Fantrax Cup Qualifiers

A static public leaderboard for the eight tournament qualification awards.

## Rules implemented

Awards are resolved in the displayed order. The winner of an award qualifies and is removed from consideration for every later award. The app displays the three best still-eligible teams for each award. Ties use alphabetical team name order until the league agrees a different tie-breaker.

The card award totals negative Fantrax scoring points from Yellow Cards (`YC`) and Red Cards (`RC`); lower is better. The other statistic awards total the relevant Fantrax category across the imported gameweeks.

## Run locally

```bash
npm install
python3 scripts/ingest.py --period 1
npm run dev
```

To refresh the whole available season locally, run `python3 scripts/ingest.py --all`.

## Free deployment

1. Create a public GitHub repository and push this project.
2. In GitHub, enable **Settings → Pages → GitHub Actions** as the source. The included deployment workflow publishes the website whenever its data changes.
3. The included `update-scores.yml` workflow will fetch Fantrax every six hours, update the committed JSON history, and publish the new standings on the next Pages deployment.

For a manual refresh, select **Actions → Update Fantrax scores → Run workflow**.
