export const AWARDS = [
  { id: "week-score", name: "Highest individual week score", titleOptions: ["Points Demon","Double game week?!","Bruno’s Big Day Out"], description: "Highest Fantrax score in a single gameweek.", direction: "desc", value: team => team.score, format: (value, team) => `${number(value)} (GW ${team.scorePeriod})` },
  { id: "week-win", name: "Biggest individual week win", titleOptions: ["Nobody likes a show off", "Stop. He's already dead"], description: "Largest points margin over that week’s opponent.", direction: "desc", value: team => team.margin, format: (value, team) => `+${number(value)} (GW ${team.marginPeriod})` },
  { id: "discipline", name: "Best disciplinary record", titleOptions: ["It's levi-O-sa, not levio-SA!","The Ref’s Favourite","The Declan Nice Award"], description: "Fewest Fantrax points lost to yellow and red cards.", direction: "asc", value: team => team.cardPointsLost, format: value => number(value) },
  { id: "fouls-suffered", name: "Most fouls suffered", titleOptions: ["Pow... Right in the kisser", "Jean claude van damaged","The Tom Daley Award"], description: "Total fouls suffered.", direction: "desc", value: team => team.stats.FS ?? 0, format: value => number(value) },
  { id: "aerials-won", name: "Most headers", titleOptions: ["Tarka the Otter","Head, Shoulders, Knees and Goals"], description: "Aerials won.", direction: "desc", value: team => team.stats.AER ?? 0, format: value => number(value) },
  { id: "tackles-won", name: "Most tackles won", titleOptions: ["Ooh, you're 'ard","N’Golo Canteen"], description: "Total tackles won.", direction: "desc", value: team => team.stats.TkW ?? 0, format: value => number(value) },
  { id: "accurate-crosses", name: "Most accurate crosses", titleOptions: ["The Postman", "Signed, Sealed, Delivered"], description: "Total accurate crosses.", direction: "desc", value: team => team.stats.AC ?? 0, format: value => number(value) },
  { id: "average-joe", name: "The Average Joe", titleOptions: ["The Average Joe"], description: "Average position across awards.", direction: "asc", value: team => team.averageAwardPosition ?? 0, format: value => number(value) }
];

export function selectAwardTitles() {
  return Object.fromEntries(AWARDS.map(award => {
    const options = award.titleOptions?.length ? award.titleOptions : [award.name];
    return [award.id, options[Math.floor(Math.random() * options.length)]];
  }));
}

const number = value => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
const QUALIFICATION_STAT_KEYS = new Set(["FS", "AER", "TkW", "AC", "PKD", "YC", "RC"]);
const NOTABLE_STAT_PRIORITY = ["G", "A", "Sv", "KP", "SOT", "BCC", "CoS", "Int", "BS", "Tk", "CLRA", "AP", "FC", "BCM", "DIS"];

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

function rankingPositions(teams, definition) {
  const standings = sortTeams(teams, definition);
  const positionsByTeam = new Map();

  for (let start = 0; start < standings.length;) {
    let end = start + 1;
    const value = definition.value(standings[start]);
    while (end < standings.length && definition.value(standings[end]) === value) end += 1;

    // A tie spanning, for example, second and third is treated as 2.5th for both teams.
    const sharedPosition = ((start + 1) + end) / 2;
    standings.slice(start, end).forEach(team => positionsByTeam.set(team.teamId, sharedPosition));
    start = end;
  }

  return positionsByTeam;
}

export function buildAwards(gameweeks) {
  const allTeams = aggregate(gameweeks);
  // Award 8 is based only on the seven preceding awards. Ties share the average
  // numerical position they occupy, then each team's seven positions are averaged.
  const qualifyingAwards = AWARDS.slice(0, 7);
  const totals = new Map(allTeams.map(team => [team.teamId, 0]));
  qualifyingAwards.forEach(definition => {
    rankingPositions(allTeams, definition).forEach((position, teamId) => totals.set(teamId, totals.get(teamId) + position));
  });
  allTeams.forEach(team => { team.averageAwardPosition = qualifyingAwards.length ? totals.get(team.teamId) / qualifyingAwards.length : 0; });
  let eligible = [...allTeams];
  return AWARDS.map((definition, index) => {
    const standings = sortTeams(eligible, definition).slice(0, 3).map(team => ({ ...team, value: definition.value(team) }));
    const allStandings = sortTeams(allTeams, definition).map(team => ({ ...team, value: definition.value(team) }));
    if (standings[0]) eligible = eligible.filter(team => team.teamId !== standings[0].teamId);
    return { ...definition, order: index + 1, standings, allStandings };
  });
}

const teamLookup = awards => new Map(awards.flatMap(award => award.allStandings).map(team => [team.teamId, team]));

function buildStatPodiums(gameweeks) {
  const performancesByStat = new Map();
  for (const week of gameweeks) {
    for (const team of week.teams ?? []) {
      for (const [statKey, value] of Object.entries(team.stats ?? {})) {
        if (QUALIFICATION_STAT_KEYS.has(statKey)) continue;
        const performances = performancesByStat.get(statKey) ?? [];
        performances.push({
          statKey,
          statName: week.statNames?.[statKey] ?? statKey,
          teamId: team.teamId,
          teamName: team.teamName,
          value,
          period: week.period
        });
        performancesByStat.set(statKey, performances);
      }
    }
  }
  return [...performancesByStat.values()].map(performances => performances
    .sort((a, b) => b.value - a.value || a.teamName.localeCompare(b.teamName) || a.period - b.period)
    .slice(0, 3));
}

export function buildWeeklyReport(gameweeks, period) {
  const orderedWeeks = [...gameweeks].sort((a, b) => a.period - b.period);
  const targetIndex = orderedWeeks.findIndex(week => week.period === period);
  if (targetIndex < 1) return null;

  const previousAwards = buildAwards(orderedWeeks.slice(0, targetIndex));
  const currentAwards = buildAwards(orderedWeeks.slice(0, targetIndex + 1));
  const previousById = new Map(previousAwards.map(award => [award.id, award]));
  const previousTeams = teamLookup(previousAwards);
  const currentTeams = teamLookup(currentAwards);

  const leaderChanges = currentAwards.flatMap(award => {
    const previousLeaders = previousById.get(award.id).allStandings.filter(team => team.value === previousById.get(award.id).allStandings[0].value);
    const currentLeaders = award.allStandings.filter(team => team.value === award.allStandings[0].value);
    const newLeaders = currentLeaders.filter(team => !previousLeaders.some(previous => previous.teamId === team.teamId));
    return newLeaders.length ? [{ awardId: award.id, previousLeaders, currentLeaders, newLeaders }] : [];
  });

  const previousQualifications = new Map(previousAwards.map(award => [award.standings[0]?.teamId, award.id]).filter(([teamId]) => teamId));
  const currentQualifications = new Map(currentAwards.map(award => [award.standings[0]?.teamId, award.id]).filter(([teamId]) => teamId));
  const qualificationChanges = [...new Set([...previousQualifications.keys(), ...currentQualifications.keys()])].flatMap(teamId => {
    const previousAwardId = previousQualifications.get(teamId);
    const currentAwardId = currentQualifications.get(teamId);
    if (!previousAwardId && currentAwardId) return [{ type: "qualified", team: currentTeams.get(teamId), awardId: currentAwardId }];
    if (previousAwardId && !currentAwardId) return [{ type: "lost", team: previousTeams.get(teamId), awardId: previousAwardId }];
    if (previousAwardId !== currentAwardId) return [{ type: "changed", team: currentTeams.get(teamId), previousAwardId, awardId: currentAwardId }];
    return [];
  });

  const movers = currentAwards.flatMap(award => {
    const previousPositions = new Map(previousById.get(award.id).allStandings.map((team, index) => [team.teamId, index + 1]));
    return award.allStandings.flatMap((team, index) => {
      const from = previousPositions.get(team.teamId);
      const to = index + 1;
      const movement = from - to;
      return Math.abs(movement) >= 2 ? [{ awardId: award.id, team, from, to, movement }] : [];
    });
  }).sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement) || a.team.teamName.localeCompare(b.team.teamName)).slice(0, 6);

  const newRecords = currentAwards.slice(0, 2).flatMap(award => {
    const previousLeader = previousById.get(award.id).allStandings[0];
    const currentLeader = award.allStandings[0];
    return currentLeader.value > previousLeader.value ? [{ awardId: award.id, team: currentLeader, previousValue: previousLeader.value, value: currentLeader.value }] : [];
  });

  // A record book of the three best single-gameweek performances for every
  // non-qualification stat. The report surfaces fresh entries from this week's book.
  const notableStats = buildStatPodiums(orderedWeeks.slice(0, targetIndex + 1))
    .flatMap(podium => podium.map((performance, index) => ({ ...performance, position: index + 1 })))
    .filter(performance => performance.period === period)
    .sort((a, b) => a.position - b.position || (NOTABLE_STAT_PRIORITY.indexOf(a.statKey) === -1 ? Infinity : NOTABLE_STAT_PRIORITY.indexOf(a.statKey)) - (NOTABLE_STAT_PRIORITY.indexOf(b.statKey) === -1 ? Infinity : NOTABLE_STAT_PRIORITY.indexOf(b.statKey)) || a.statName.localeCompare(b.statName) || b.value - a.value)
    .slice(0, 5);

  return { period, leaderChanges, qualificationChanges, movers, newRecords, notableStats };
}
