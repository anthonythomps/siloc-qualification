#!/usr/bin/env python3
"""Fetch Fantrax gameweek scores and store the award inputs as static JSON."""
import argparse
import json
import ssl
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

LEAGUE_ID = "0zvgg7ncms4vefat"
ENDPOINT = "https://www.fantrax.com/fxea/general/getMatchupScores"
DATA_FILE = Path(__file__).parents[1] / "public" / "data" / "season.json"
STAT_KEYS = {"FS", "AER", "TkW", "AC", "PKD"}
CARD_KEYS = {"YC", "RC"}
SYSTEM_CERTIFICATE_BUNDLE = Path("/etc/ssl/cert.pem")


def ssl_context():
    """Use macOS's bundled CA file when the Python installation cannot find it."""
    if SYSTEM_CERTIFICATE_BUNDLE.exists():
        return ssl.create_default_context(cafile=SYSTEM_CERTIFICATE_BUNDLE)
    return ssl.create_default_context()

def fetch(period):
    query = urlencode({"leagueId": LEAGUE_ID, "period": period})
    request = Request(f"{ENDPOINT}?{query}", headers={"User-Agent": "fantrax-cup-qualifiers/1.0"})
    with urlopen(request, timeout=30, context=ssl_context()) as response:
        return json.load(response)

def value(category, side):
    return float(category.get(side, {}).get("value", 0) or 0)

def points(category, side):
    return float(category.get(side, {}).get("points", 0) or 0)

def extract(period, payload):
    teams = []
    for matchup in payload.get("matchups", []):
        for side, opponent in (("home", "away"), ("away", "home")):
            raw_team = matchup.get(side)
            raw_opponent = matchup.get(opponent)
            if not raw_team or not raw_team.get("teamId"):
                continue
            stats, card_points_lost = {}, 0
            for category in matchup.get("categories", []):
                key = category.get("shortName")
                if key in STAT_KEYS:
                    stats[key] = stats.get(key, 0) + value(category, side)
                if key in CARD_KEYS:
                    card_points_lost += max(0, -points(category, side))
            score, opponent_score = float(raw_team.get("score", 0) or 0), float(raw_opponent.get("score", 0) or 0)
            teams.append({"teamId": raw_team["teamId"], "teamName": raw_team.get("teamName", "Unknown team"), "score": score, "margin": score - opponent_score, "cardPointsLost": card_points_lost, "stats": stats})
    return {"period": period, "fetchedAt": datetime.now(UTC).isoformat(), "teams": teams}

def save(snapshot):
    data = json.loads(DATA_FILE.read_text()) if DATA_FILE.exists() else {"leagueId": LEAGUE_ID, "gameweeks": []}
    weeks = {week["period"]: week for week in data.get("gameweeks", [])}
    weeks[snapshot["period"]] = snapshot
    data["leagueId"], data["updatedAt"] = LEAGUE_ID, snapshot["fetchedAt"]
    data["gameweeks"] = [weeks[key] for key in sorted(weeks)]
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(data, indent=2) + "\n")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--period", type=int, help="A single Fantrax gameweek")
    parser.add_argument("--all", action="store_true", help="Try all 38 Premier League gameweeks")
    args = parser.parse_args()
    periods = range(1, 39) if args.all else [args.period] if args.period else []
    if not periods:
        parser.error("Specify --period GAMEWEEK or --all")
    for period in periods:
        snapshot = extract(period, fetch(period))
        if snapshot["teams"]:
            save(snapshot)
            print(f"Stored gameweek {period}: {len(snapshot['teams'])} teams")
        else:
            print(f"Skipped gameweek {period}: no matchup data")
        time.sleep(0.15)

if __name__ == "__main__":
    main()
