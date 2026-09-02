export const AWARDS = [
  { id: "week-score", name: "Points Demon", originalName: "Highest individual week score", titleOptions: ["Points Demon", "Highest individual week score"], description: "Highest Fantrax score in a single gameweek.", direction: "desc", value: team => team.score, format: (value, team) => `${number(value)} (GW ${team.scorePeriod})` },
  { id: "week-win", name: "Nobody likes a show off", originalName: "Biggest individual week win", titleOptions: ["Nobody likes a show off", "Biggest individual week win"], description: "Largest points margin over that week’s opponent.", direction: "desc", value: team => team.margin, format: (value, team) => `+${number(value)} (GW ${team.marginPeriod})` },
  { id: "discipline", name: "It's levi-O-sa, not levio-SA!", originalName: "Best disciplinary record", titleOptions: ["It's levi-O-sa, not levio-SA!", "Best disciplinary record"], description: "Fewest Fantrax points lost to yellow and red cards.", direction: "asc", value: team => team.cardPointsLost, format: value => number(value) },
  { id: "fouls-suffered", name: "Pow... Right in the kisser", originalName: "Most fouls suffered", titleOptions: ["Pow... Right in the kisser", "Most fouls suffered"], description: "Total fouls suffered.", direction: "desc", value: team => team.stats.FS ?? 0, format: value => number(value) },
  { id: "aerials-won", name: "Tarka the Otter", originalName: "Most headers", titleOptions: ["Tarka the Otter", "Most headers"], description: "Aerials won.", direction: "desc", value: team => team.stats.AER ?? 0, format: value => number(value) },
  { id: "tackles-won", name: "Ooh, you're 'ard", originalName: "Most tackles won", titleOptions: ["Ooh, you're 'ard", "Most tackles won"], description: "Total tackles won.", direction: "desc", value: team => team.stats.TkW ?? 0, format: value => number(value) },
  { id: "accurate-crosses", name: "The Postman", originalName: "Most accurate crosses", titleOptions: ["The Postman", "Most accurate crosses"], description: "Total accurate crosses.", direction: "desc", value: team => team.stats.AC ?? 0, format: value => number(value) },
  { id: "penalties-drawn", name: "The Gravity's Victim Award", originalName: "Most penalty kicks drawn", titleOptions: ["The Gravity's Victim Award", "Most penalty kicks drawn"], description: "Total penalty kicks drawn.", direction: "desc", value: team => team.stats.PKD ?? 0, format: value => number(value) }
];

export function selectAwardTitles() {
  return Object.fromEntries(AWARDS.map(award => {
    const options = award.titleOptions?.length ? award.titleOptions : [award.name];
    return [award.id, options[Math.floor(Math.random() * options.length)]];
  }));
}

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
