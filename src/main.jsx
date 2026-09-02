import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { buildAwards, AWARDS } from "./awards.js";
import "./styles.css";

const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

function AwardCard({ award, onShowAll }) {
  const winner = award.standings[0];
  return <article className="award-card">
    <p className="award-order">Award {award.order}</p>
    <h2>{award.name}</h2>
    <p className="award-description">{award.description}</p>
    {winner ? <>
      <div className="winner">
        <span className="trophy" aria-hidden="true">🏆</span>
        <div><p>Qualified</p><strong>{winner.teamName}</strong></div>
        <b>{award.format(winner.value, winner)}</b>
      </div>
      <ol className="podium">
        {award.standings.map((team, index) => <li key={team.teamId} className={index === 0 ? "first" : ""}>
          <span>{index + 1}</span><span>{team.teamName}</span><strong>{award.format(team.value, team)}</strong>
        </li>)}
      </ol>
      <button className="show-all" type="button" onClick={() => onShowAll(award)}>Show all 10 <span aria-hidden="true">→</span></button>
    </> : <p className="empty">No scores have been imported yet.</p>}
  </article>;
}

function FullStandings({ award }) {
  return <aside className="full-standings" aria-live="polite">
    <p className="award-order">FULL STANDINGS · AWARD {award.order}</p>
    <h2>{award.name}</h2>
    <p>{award.description}</p>
    <ol>
      {award.allStandings.map((team, index) => <li key={team.teamId}>
        <span>{index + 1}</span><strong>{team.teamName}</strong><b>{award.format(team.value, team)}</b>
      </li>)}
    </ol>
    <small>These rankings include every team, including teams already qualified through an earlier award.</small>
  </aside>;
}

function App() {
  const [season, setSeason] = useState(null);
  const [error, setError] = useState(null);
  const [gameweek, setGameweek] = useState("all");
  const [selectedAward, setSelectedAward] = useState(0);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/season.json`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Score data is unavailable.")))
      .then(setSeason).catch(setError);
  }, []);

  const periods = season?.gameweeks ?? [];
  const selectedWeeks = gameweek === "all" ? periods : periods.filter(week => String(week.period) === gameweek);
  const awards = useMemo(() => buildAwards(selectedWeeks), [selectedWeeks]);
  const detailAward = awards[selectedAward] ?? awards[0];

  return <main>
    <header className="hero">
      <div><p className="eyebrow">FANTASY PREMIER LEAGUE</p><h1>Siloc Qualification</h1><p>Eight routes into the tournament. One qualification per team.</p></div>
      <div className="rule"><strong>How it works</strong><span>Awards are decided in order. A winning team is removed from later awards.</span></div>
    </header>
    {error && <p className="notice">{error}</p>}
    {!season && !error && <p className="notice">Loading league data…</p>}
    {season && <>
      <section className="controls" aria-label="Gameweek selector">
        <label htmlFor="gameweek">View</label>
        <select id="gameweek" value={gameweek} onChange={event => setGameweek(event.target.value)}>
          <option value="all">Season to date</option>
          {periods.map(week => <option key={week.period} value={week.period}>Gameweek {week.period}</option>)}
        </select>
        <small>Last updated {season.updatedAt ? new Date(season.updatedAt).toLocaleString("en-GB") : "—"}</small>
      </section>
      <section className="content-layout">
        <section className="awards-grid">{awards.map((award, index) => <AwardCard key={award.id} award={award} onShowAll={() => setSelectedAward(index)} />)}</section>
        {detailAward && <FullStandings award={detailAward} />}
      </section>
      <footer>Scores sourced from Fantrax. Ties are ordered alphabetically by team name until a league tie-breaker is agreed.</footer>
    </>}
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
