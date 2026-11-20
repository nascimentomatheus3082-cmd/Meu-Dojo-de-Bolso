import { supabase } from "../lib/supabase";
import type { AgentRequest, AgentResponse } from "./contracts";

/** A IA só é chamada por Edge Function. Segredos e chaves de provedores nunca entram no bundle do navegador. */
export async function askDojoAI(request: AgentRequest): Promise<AgentResponse> {
  if (!supabase) throw new Error("Conecte o Supabase antes de usar o Sensei Digital.");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Entre na sua conta para conversar com o Sensei Digital.");

  const { data, error } = await supabase.functions.invoke("dojo-ai", { body: request });
  if (error) throw new Error("Não foi possível consultar o Sensei Digital agora.");
  if (!data || typeof data.answer !== "string") throw new Error("Resposta inválida do serviço de IA.");
  return data as AgentResponse;
}
