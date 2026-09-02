export const AWARDS = [
  { id: "week-score", name: "Highest individual week score", description: "Highest Fantrax score in a single gameweek.", direction: "desc", value: team => team.score, format: (value, team) => `${number(value)} (GW ${team.scorePeriod})` },
  { id: "week-win", name: "Biggest individual week win", description: "Largest points margin over that week’s opponent.", direction: "desc", value: team => team.margin, format: (value, team) => `+${number(value)} (GW ${team.marginPeriod})` },
  { id: "discipline", name: "Best disciplinary record", description: "Fewest Fantrax points lost to yellow and red cards.", direction: "asc", value: team => team.cardPointsLost, format: value => number(value) },
  { id: "fouls-suffered", name: "Most fouls suffered", description: "Total fouls suffered.", direction: "desc", value: team => team.stats.FS ?? 0, format: value => number(value) },
  { id: "aerials-won", name: "Most headers", description: "Aerials won.", direction: "desc", value: team => team.stats.AER ?? 0, format: value => number(value) },
  { id: "tackles-won", name: "Most tackles won", description: "Total tackles won.", direction: "desc", value: team => team.stats.TkW ?? 0, format: value => number(value) },
  { id: "accurate-crosses", name: "Most accurate crosses", description: "Total accurate crosses.", direction: "desc", value: team => team.stats.AC ?? 0, format: value => number(value) },
  { id: "penalties-drawn", name: "Most penalty kicks drawn", description: "Total penalty kicks drawn.", direction: "desc", value: team => team.stats.PKD ?? 0, format: value => number(value) }
];

const number = value => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);

function aggregate(gameweeks) {
  const teams = new Map();
  for (const week of gameweeks) for (const entry of week.teams ?? []) {
    const current = teams.get(entry.teamId) ?? { teamId: entry.teamId, teamName: entry.teamName, score: -Infinity, margin: -Infinity, cardPointsLost: 0, stats: {} };
    if ((entry.score ?? 0) > current.score) {
      current.score = entry.score ?? 0;
      current.scorePeriod = week.period;
    }
    if ((entry.margin ?? 0) > current.margin) {
      current.margin = entry.margin ?? 0;
      current.marginPeriod = week.period;
    }
    current.cardPointsLost += entry.cardPointsLost ?? 0;
    Object.entries(entry.stats ?? {}).forEach(([key, value]) => { current.stats[key] = (current.stats[key] ?? 0) + value; });
    teams.set(entry.teamId, current);
  }
  return [...teams.values()];
}

function sortTeams(teams, definition) {
  return [...teams].sort((a, b) => {
    const difference = definition.value(a) - definition.value(b);
    return (definition.direction === "asc" ? difference : -difference) || a.teamName.localeCompare(b.teamName);
  });
}

export function buildAwards(gameweeks) {
  const allTeams = aggregate(gameweeks);
  let eligible = [...allTeams];
  return AWARDS.map((definition, index) => {
    const standings = sortTeams(eligible, definition).slice(0, 3).map(team => ({ ...team, value: definition.value(team) }));
    const allStandings = sortTeams(allTeams, definition).map(team => ({ ...team, value: definition.value(team) }));
    if (standings[0]) eligible = eligible.filter(team => team.teamId !== standings[0].teamId);
    return { ...definition, order: index + 1, standings, allStandings };
  });
}
