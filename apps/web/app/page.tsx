const metrics = [
  ["Registered villages", "—", "Provisioning starts in Phase 2"],
  ["Verified players", "—", "Identity review required"],
  ["Active tournaments", "0", "No tournaments created yet"],
  ["Live matches", "0", "Live scoring engine in Phase 4"],
];
export default function Home() {
  return <main className="shell">
    <header className="top"><div><div className="brand">🏏 RGMS Team Pro</div><div className="tag">Rural Game Management System</div></div><span className="status">Foundation preview</span></header>
    <section className="hero"><h1>Grassroots cricket, professionally managed.</h1><p>A unified platform for village leagues, verified players, tournament operations and live cricket scoring.</p></section>
    <h2 className="section">Platform overview</h2>
    <section className="grid">{metrics.map(([label,value,note])=><article className="card" key={label}><div className="muted">{label}</div><div className="metric">{value}</div><div className="muted">{note}</div></article>)}</section>
    <h2 className="section">Development modules</h2>
    <section className="card">
      {["Village hierarchy and tenant isolation","Player verification and permanent Sports ID","Teams, tournaments and fixtures","Ball-by-ball scoring and scorecards","Offline scoring and synchronization","Career statistics and public leaderboards","Append-only audit and compliance"].map((x,i)=><div className="list" key={x}><span>{x}</span><span className="muted">{i===0?"Foundation model":"Planned"}</span></div>)}
    </section>
    <p className="muted" style={{marginTop:24}}>Prototype only — connect the authenticated API and provision a development database before operational use.</p>
  </main>;
}
