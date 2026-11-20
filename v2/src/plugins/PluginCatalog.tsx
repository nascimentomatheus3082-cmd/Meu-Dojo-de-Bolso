import { BookOpen, Brain, ChartNoAxesCombined, ClipboardCheck, Users, Video, ShieldCheck, Puzzle } from "lucide-react";
import { pluginRegistry } from "./registry";

const icons = { "lesson-library": BookOpen, "belt-exam": ClipboardCheck, "progress-tracker": ChartNoAxesCombined, "dojo-sensei": Brain, "video-lab": Video, "family-dojo": Users, "dojo-admin": ShieldCheck } as const;

export default function PluginCatalog() {
  return <section className="plugin-section">
    <div className="section-heading"><div><p className="eyebrow dark">ECOSSISTEMA DO DOJÔ</p><h2>Seu dojo, do seu jeito.</h2><p className="muted">Módulos independentes que ampliam sua experiência de aprendizagem.</p></div><Puzzle /></div>
    <div className="plugin-grid">
      {pluginRegistry.map((plugin) => {
        const Icon = icons[plugin.id as keyof typeof icons] ?? Puzzle;
        return <article className="plugin-card" key={plugin.id}>
          <div className="plugin-icon"><Icon /></div>
          <div className="plugin-title"><h3>{plugin.name}</h3><span className={`status status-${plugin.status}`}>{plugin.status === "available" ? "Disponível" : plugin.status === "beta" ? "Beta" : "Em desenvolvimento"}</span></div>
          <p>{plugin.description}</p>
        </article>;
      })}
    </div>
  </section>;
}
