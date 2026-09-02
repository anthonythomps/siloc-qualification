import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { buildAwards, buildWeeklyReport, selectAwardTitles } from "./awards.js";
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

function FullStandings({ award, panelRef }) {
  return <aside className="full-standings" aria-live="polite" ref={panelRef} tabIndex="-1">
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

function WeeklyReport({ report, awardTitles }) {
  if (!report) return <section className="weekly-report report-empty"><p className="eyebrow">GAMEWEEK REPORT</p><strong>A report will appear after the second gameweek.</strong></section>;
  const awardName = awardId => awardTitles[awardId] ?? awardId;
  const teamNames = teams => teams.map(team => team.teamName).join(" and ");
  return <details className="weekly-report">
    <summary><div className="report-heading"><p className="eyebrow">GAMEWEEK {report.period} REPORT</p><h2>What changed this week</h2><p>Season-to-date standings compared with the end of the previous gameweek.</p></div><span className="report-toggle" /></summary>
    <div className="report-grid">
      <article><h3>Qualification changes</h3>{report.qualificationChanges.length ? <ul>{report.qualificationChanges.map(change => <li key={`${change.type}-${change.team.teamId}`}><b>{change.team.teamName}</b>{change.type === "qualified" ? <> qualified via <em>{awardName(change.awardId)}</em>.</> : change.type === "lost" ? <> dropped out of <em>{awardName(change.awardId)}</em>.</> : <> moved from <em>{awardName(change.previousAwardId)}</em> to <em>{awardName(change.awardId)}</em>.</>}</li>)}</ul> : <p>No qualification places changed.</p>}</article>
      <article><h3>New award leaders</h3>{report.leaderChanges.length ? <ul>{report.leaderChanges.map(change => <li key={change.awardId}>{change.currentLeaders.length > 1 ? <><b>{teamNames(change.newLeaders)}</b> {change.previousLeaders.some(previous => change.currentLeaders.some(current => current.teamId === previous.teamId)) ? <>joined {teamNames(change.previousLeaders)} in a joint lead of </> : <>moved into a joint lead of </>}<em>{awardName(change.awardId)}</em>.</> : <><b>{change.newLeaders[0].teamName}</b> took <em>{awardName(change.awardId)}</em> from {teamNames(change.previousLeaders)}.</>}</li>)}</ul> : <p>No award leaders changed.</p>}</article>
      <article><h3>Biggest movers</h3>{report.movers.length ? <ul>{report.movers.map(mover => <li key={`${mover.awardId}-${mover.team.teamId}`}><b>{mover.team.teamName}</b> {mover.movement > 0 ? "rose" : "fell"} {Math.abs(mover.movement)} place{Math.abs(mover.movement) === 1 ? "" : "s"} in <em>{awardName(mover.awardId)}</em> ({mover.from} → {mover.to}).</li>)}</ul> : <p>No team moved by two or more places.</p>}</article>
      <article><h3>New records</h3>{report.newRecords.length ? <ul>{report.newRecords.map(record => <li key={record.awardId}><b>{record.team.teamName}</b> raised the <em>{awardName(record.awardId)}</em> record from {number.format(record.previousValue)} to {number.format(record.value)}.</li>)}</ul> : <p>No new individual-week records.</p>}</article>
    </div>
  </details>;
}

function App() {
  const [season, setSeason] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [error, setError] = useState(null);
  const [gameweek, setGameweek] = useState("all");
  const [selectedAward, setSelectedAward] = useState(0);
  const fullStandingsRef = useRef(null);
  const [awardTitles] = useState(selectAwardTitles);

  useEffect(() => {
    const refreshKey = Date.now();
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/season.json?v=${refreshKey}`, { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject(new Error("Score data is unavailable."))),
      fetch(`${import.meta.env.BASE_URL}data/gameweeks.json?v=${refreshKey}`, { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject(new Error("Gameweek schedule is unavailable.")))
    ]).then(([seasonData, scheduleData]) => { setSeason(seasonData); setSchedule(scheduleData); }).catch(setError);
  }, []);

  const periods = season?.gameweeks ?? [];
  const availableGameweeks = schedule.filter(gameweek => gameweek.startsAt <= new Date().toISOString().slice(0, 10));
  const selectedWeeks = gameweek === "all" ? periods : periods.filter(week => String(week.period) === gameweek);
  const awards = useMemo(() => buildAwards(selectedWeeks), [selectedWeeks]);
  const displayAwards = awards.map(award => ({ ...award, name: awardTitles[award.id] ?? award.name }));
  const reportPeriod = gameweek === "all" ? Math.max(...periods.map(week => week.period), 0) : Number(gameweek);
  const weeklyReport = useMemo(() => buildWeeklyReport(periods, reportPeriod), [periods, reportPeriod]);
  const detailAward = displayAwards[selectedAward] ?? displayAwards[0];
  const qualifiedIds = new Set(displayAwards.map(award => award.standings[0]?.teamId).filter(Boolean));
  const notQualified = (displayAwards[0]?.allStandings ?? []).filter(team => !qualifiedIds.has(team.teamId));
  const showAll = index => {
    setSelectedAward(index);
    if (window.matchMedia("(max-width: 1710px)").matches) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fullStandingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        fullStandingsRef.current?.focus({ preventScroll: true });
      }));
    }
  };

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
          {availableGameweeks.map(gameweek => <option key={gameweek.period} value={gameweek.period}>Gameweek {gameweek.period}</option>)}
        </select>
        <small>Last updated {season.updatedAt ? new Date(season.updatedAt).toLocaleString("en-GB") : "—"}</small>
      </section>
      <section className="not-qualified" aria-label="Teams not yet qualified">
        <p className="eyebrow">PLATE QUALIFICATION</p>
        {notQualified.length ? <div>{notQualified.map(team => <span key={team.teamId}>{team.teamName}</span>)}</div> : <strong>Every team has qualified.</strong>}
      </section>
      <WeeklyReport report={weeklyReport} awardTitles={awardTitles} />
      <section className="content-layout">
        <section className="awards-grid">{displayAwards.map((award, index) => <AwardCard key={award.id} award={award} onShowAll={() => showAll(index)} />)}</section>
        {detailAward && <FullStandings award={detailAward} panelRef={fullStandingsRef} />}
      </section>
      <footer>Scores sourced from Fantrax. Ties are ordered alphabetically by team name until a league tie-breaker is agreed.</footer>
    </>}
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
