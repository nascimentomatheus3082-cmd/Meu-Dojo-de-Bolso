import type { DojoPlugin } from "./types";

export const pluginRegistry: DojoPlugin[] = [
  { id: "lesson-library", name: "Biblioteca Técnica", description: "Aulas e técnicas organizadas por graduação.", version: "1.0.0", category: "learning", status: "available", permissions: ["lessons:read"], enabledByDefault: true },
  { id: "belt-exam", name: "Preparação para Exames", description: "Trilhas de estudo e simulados por faixa.", version: "1.0.0", category: "assessment", status: "beta", permissions: ["lessons:read", "progress:read", "progress:write"], enabledByDefault: true },
  { id: "progress-tracker", name: "Evolução do Judoca", description: "Histórico, metas e acompanhamento do aprendizado.", version: "1.0.0", category: "learning", status: "beta", permissions: ["progress:read", "progress:write"], enabledByDefault: true },
  { id: "dojo-sensei", name: "Sensei Digital", description: "Tutor de IA para dúvidas e explicações de judô.", version: "1.0.0", category: "ai", status: "planned", permissions: ["ai:invoke", "lessons:read"], enabledByDefault: false },
  { id: "video-lab", name: "VideoLab", description: "Biblioteca de demonstrações e análise assistida de movimentos.", version: "1.0.0", category: "learning", status: "planned", permissions: ["media:read", "ai:invoke"], enabledByDefault: false },
  { id: "family-dojo", name: "Dojo Família", description: "Gestão de perfis de alunos vinculados a um responsável.", version: "1.0.0", category: "community", status: "planned", permissions: ["profile:read", "progress:read"], enabledByDefault: false },
  { id: "dojo-admin", name: "Painel Administrativo", description: "Gestão de alunos, conteúdos e permissões.", version: "1.0.0", category: "admin", status: "planned", permissions: [], enabledByDefault: false },
];

export function getPlugin(id: string) {
  return pluginRegistry.find((plugin) => plugin.id === id);
}
