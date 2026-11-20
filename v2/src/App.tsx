import { useState } from "react";
import {
  Activity, Award, BookOpen, Brain, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleHelp, Clock3, Flame, GraduationCap, Home, LogOut, Menu, Play, Search,
  Settings, ShieldCheck, Sparkles, Target, Trophy, Users, Video, X, Zap
} from "lucide-react";
import PluginCatalog from "./plugins/PluginCatalog";

type Tab = "Visão geral" | "Aulas" | "Técnicas" | "Simulados" | "Minha evolução";
const tabs: {label:Tab;icon:typeof Home}[] = [
  {label:"Visão geral",icon:Home},{label:"Aulas",icon:Play},{label:"Técnicas",icon:BookOpen},
  {label:"Simulados",icon:GraduationCap},{label:"Minha evolução",icon:Activity}
];
const lessons = [
  {title:"Fundamentos do judô",meta:"Aula 04 · 12 min",tag:"Em andamento",progress:72,art:"一"},
  {title:"O Goshi — grande projeção de quadril",meta:"Técnica · Faixa azul",tag:"Próxima aula",progress:0,art:"腰"},
  {title:"Defesas e movimentação",meta:"Aula 06 · 18 min",tag:"Recomendado",progress:0,art:"道"}
];
const techniques = ["O Goshi","Ippon Seoi Nage","Tai Otoshi","De Ashi Harai","Osoto Gari","Kesa Gatame"];
function App(){
  const [active,setActive]=useState<Tab>("Visão geral");
  const [mobileOpen,setMobileOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [showAI,setShowAI]=useState(false);
  const [question,setQuestion]=useState("");
  const [sent,setSent]=useState(false);
  const [selected,setSelected]=useState("O Goshi");
  const [showProfile,setShowProfile]=useState(false);
  const filtered=techniques.filter(t=>t.toLowerCase().includes(query.toLowerCase()));
  return <div className="app-shell">
    <aside className={mobileOpen?"sidebar open":"sidebar"}>
      <div className="brand"><div className="brand-mark">道</div><div><b>DOJO DE BOLSO</b><span>VERSÃO 2.0</span></div><button className="mobile-close" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div>
      <div className="nav-label">MENU PRINCIPAL</div>
      <nav>{tabs.map(({label,icon:Icon})=><button key={label} className={active===label?"nav-item active":"nav-item"} onClick={()=>{setActive(label);setMobileOpen(false)}}><Icon size={18}/><span>{label}</span>{label==="Simulados"&&<span className="nav-count">3</span>}</button>)}</nav>
      <div className="sidebar-divider"/>
      <div className="nav-label">SUA JORNADA</div>
      <div className="belt-card"><div className="belt-top"><span className="belt-swatch"/> <b>FAIXA AZUL</b><span>68%</span></div><div className="progress-track"><i style={{width:"68%"}}/></div><small>Continue treinando para avançar.</small></div>
      <button className="nav-item" onClick={()=>setShowAI(true)}><Brain size={18}/><span>Sensei Virtual</span><span className="premium-dot"/></button>
      <button className="nav-item" onClick={()=>setActive("Minha evolução")}><Trophy size={18}/><span>Conquistas</span></button>
      <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={18}/><b>Precisa de ajuda?</b><small>Estamos aqui para você.</small></div><button className="nav-item"><Settings size={18}/><span>Configurações</span></button><div className="user-mini"><div className="avatar">M</div><div><b>Matheus</b><small>Aluno · Faixa azul</small></div><button onClick={()=>setShowProfile(!showProfile)}><ChevronDown size={16}/></button></div>{showProfile&&<div className="profile-pop">Perfil de aluno<br/>Preferências<br/>Sair da conta</div>}</div>
    </aside>
    {mobileOpen&&<button className="scrim" onClick={()=>setMobileOpen(false)} aria-label="Fechar menu"/>}
    <main className="main-area">
      <header className="topbar"><button className="menu-button" onClick={()=>setMobileOpen(true)}><Menu/></button><div className="crumb">DOJO <ChevronRight size={14}/> <b>{active.toUpperCase()}</b></div><div className="top-actions"><label className="searchbox"><Search size={16}/><input placeholder="Buscar aulas, técnicas..." value={query} onChange={e=>{setQuery(e.target.value);if(e.target.value)setActive("Técnicas")}}/><kbd>⌘ K</kbd></label><button className="icon-button"><CalendarDays size={18}/></button><button className="icon-button notification"><span/> <Activity size={18}/></button><div className="avatar top-avatar">M</div></div></header>
      <div className="content">
        {active==="Visão geral"&&<><section className="welcome-row"><div><p className="eyebrow"><span className="live-dot"/> SUA JORNADA NO JUDÔ</p><h1>Olá, Matheus<span className="gold">.</span></h1><p className="subhead">Cada treino é um passo a mais na sua evolução. Vamos nessa?</p></div><div className="date-pill"><CalendarDays size={15}/> QUINTA-FEIRA, 19 NOV</div></section>
          <section className="stats-grid"><Stat icon={<Flame/>} label="SEQUÊNCIA ATUAL" value="12 dias" note="Você está no ritmo!" accent="orange"/><Stat icon={<Zap/>} label="PONTOS DE EXPERIÊNCIA" value="3.450 XP" note="+240 XP nesta semana" accent="gold"/><Stat icon={<Award/>} label="SUA GRADUAÇÃO" value="Faixa azul" note="68% para a próxima etapa" accent="blue"/></section>
          <section className="dashboard-grid"><div className="panel lessons-panel"><div className="panel-heading"><div><p className="eyebrow">CONTINUE DE ONDE PAROU</p><h2>Seu próximo treino</h2></div><button className="text-link" onClick={()=>setActive("Aulas")}>Ver todas <ChevronRight size={15}/></button></div><div className="lesson-list">{lessons.map((l,i)=><article className="lesson-row" key={l.title}><div className={"lesson-art art-"+i}>{l.art}</div><div className="lesson-info"><span className="lesson-tag">{l.tag}</span><h3>{l.title}</h3><p><Clock3 size={13}/>{l.meta}</p>{l.progress>0&&<div className="mini-progress"><i style={{width:l.progress+"%"}}/></div>}</div><button className="round-play" onClick={()=>setActive("Aulas")}><Play size={15} fill="currentColor"/></button></article>)}</div></div>
          <div className="panel ai-panel"><div className="ai-orb"><Brain size={29}/><Sparkles className="orb-spark" size={16}/></div><span className="ai-label">DOJO AI · SENSEI VIRTUAL</span><h2>Aprenda com orientação inteligente.</h2><p>Tire dúvidas sobre técnicas, prepare-se para exames e receba orientações para evoluir.</p><button className="primary-button" onClick={()=>setShowAI(true)}>Conversar com o Sensei <ChevronRight size={16}/></button><small><ShieldCheck size={13}/> Conteúdo educativo com foco em segurança.</small></div></section>
          <section className="panel path-panel"><div className="panel-heading"><div><p className="eyebrow">SEU CAMINHO</p><h2>Trilha de evolução</h2></div><button className="text-link" onClick={()=>setActive("Minha evolução")}>Ver progresso <ChevronRight size={15}/></button></div><div className="belt-path">{["Branca","Amarela","Laranja","Verde","Azul","Roxa","Marrom"].map((b,i)=><div className={"belt-step "+(i<4?"done":i===4?"current":"")} key={b}><div className="belt-node">{i<4?<Check size={15}/>:i===4?<Target size={15}/>:<span>{i+1}</span>}</div><small>{b}</small></div>)}</div><div className="path-foot"><span><span className="status-dot"/> Você está na faixa azul</span><span>Próximo objetivo: faixa roxa</span></div></section>
          <PluginCatalog/>
        </>}
        {active==="Técnicas"&&<section className="page-section"><p className="eyebrow">BIBLIOTECA TÉCNICA</p><h1>Domine cada movimento<span className="gold">.</span></h1><p className="subhead">Explore as técnicas por faixa e aprenda cada fase do movimento.</p><div className="tech-grid">{filtered.map((t,i)=><button className={"tech-card "+(selected===t?"selected":"")} onClick={()=>setSelected(t)} key={t}><div className="tech-symbol">{["腰","背","落","足","外","固"][i%6]}</div><div><b>{t}</b><small>Projeção · Faixa azul</small></div><ChevronRight size={17}/></button>)}</div><div className="panel technique-detail"><div><p className="eyebrow">TÉCNICA SELECIONADA</p><h2>{selected}</h2><p>Estude o movimento em três etapas: desequilíbrio, preparação e execução.</p></div><div className="phase-list"><span><b>01</b> Kuzushi <small>Desequilíbrio</small></span><span><b>02</b> Tsukuri <small>Preparação</small></span><span><b>03</b> Kake <small>Execução</small></span></div></div></section>}
        {active==="Aulas"&&<section className="page-section"><p className="eyebrow">SALA DE TREINAMENTO</p><h1>Suas aulas<span className="gold">.</span></h1><p className="subhead">Conteúdo organizado para acompanhar sua evolução.</p><div className="lesson-cards">{lessons.map((l,i)=><div className="panel lesson-card" key={l.title}><div className={"lesson-art art-"+i}>{l.art}</div><span className="lesson-tag">{l.tag}</span><h3>{l.title}</h3><p>{l.meta}</p><button className="primary-button" onClick={()=>setActive("Técnicas")}>Abrir aula <ChevronRight size={16}/></button></div>)}</div></section>}
        {active==="Simulados"&&<section className="page-section"><p className="eyebrow">PREPARAÇÃO PARA GRADUAÇÃO</p><h1>Treine para seu exame<span className="gold">.</span></h1><p className="subhead">Teste seus conhecimentos e identifique onde pode melhorar.</p><div className="exam-grid"><div className="panel exam-card"><GraduationCap/><h2>Simulado de faixa azul</h2><p>20 questões · Teoria e fundamentos</p><button className="primary-button">Iniciar simulado <ChevronRight size={16}/></button></div><div className="panel exam-card"><ClipboardIcon/><h2>Revisão de técnicas</h2><p>15 questões · Nomenclatura e execução</p><button className="primary-button">Começar revisão <ChevronRight size={16}/></button></div></div></section>}
        {active==="Minha evolução"&&<section className="page-section"><p className="eyebrow">ACOMPANHAMENTO</p><h1>Sua evolução<span className="gold">.</span></h1><p className="subhead">Consistência é o caminho para a maestria.</p><div className="stats-grid"><Stat icon={<Flame/>} label="SEQUÊNCIA" value="12 dias" note="Recorde: 18 dias" accent="orange"/><Stat icon={<Zap/>} label="EXPERIÊNCIA" value="3.450 XP" note="Nível 8 · Aprendiz avançado" accent="gold"/><Stat icon={<Trophy/>} label="CONQUISTAS" value="14" note="Continue desbloqueando" accent="blue"/></div><div className="panel path-panel"><h2>Progresso de graduação</h2><div className="large-progress"><i style={{width:"68%"}}/></div><p className="muted">Faixa azul · 68% do conteúdo concluído</p></div></section>}
        <footer className="footer"><span>© 2026 DOJO DE BOLSO 2.0</span><span>FEITO PARA QUEM VIVE O JUDÔ <span className="gold">✦</span></span></footer>
      </div>
    </main>
    {showAI&&<div className="modal-backdrop" onClick={()=>setShowAI(false)}><div className="ai-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowAI(false)}><X/></button><div className="ai-orb"><Brain size={26}/></div><p className="eyebrow">DOJO AI · SENSEI VIRTUAL</p><h2>Como posso ajudar no seu treino?</h2><p className="muted">O ambiente de IA está sendo preparado. Em breve você poderá conversar com agentes especializados em técnicas, exames e evolução.</p><div className="coming-soon"><Sparkles size={16}/> IA premium em implantação</div><textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Escreva sua dúvida para guardar..." rows={3}/><button className="primary-button full" onClick={()=>{setSent(true);setQuestion("")}} disabled={!question.trim()}>{sent?"Anotação registrada":"Guardar minha dúvida"} <ChevronRight size={16}/></button><small className="muted">Esta prévia ainda não envia mensagens a um modelo de IA.</small></div></div>}
  </div>;
}
function Stat({icon,label,value,note,accent}:{icon:React.ReactNode;label:string;value:string;note:string;accent:string}){return <div className="stat-card"><div className={"stat-icon "+accent}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>}
function ClipboardIcon(){return <ShieldCheck/>}
export default App;