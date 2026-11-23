/* POST /api/entrar  { email, senha, aparelho } */
import {
  erro, faltaConfig, normEmail, comprasPagas, lerAcesso, salvarAcesso, calcularPlano,
  conferirSenha, registrarAparelho, aparelhoValido, bloqueado, falhou, zerar, lerJson, respostaLogin,
} from '../_shared/acesso.js';

export async function onRequestPost({ request, env }) {
  if (faltaConfig(env).length) return erro('O acesso ainda está sendo configurado. Tente de novo em alguns minutos.', 503);
  const { email: e, senha, aparelho } = await lerJson(request);
  const email = normEmail(e);
  if (!email || !senha) return erro('Preencha o e-mail e a senha.');
  if (!aparelhoValido(aparelho)) return erro('Aparelho inválido. Recarregue a página.');

  const chave = 'entrar:' + email;
  if (await bloqueado(env, chave)) return erro('Muitas tentativas. Espere 15 minutos ou use "Esqueci a senha".', 429);

  const acesso = await lerAcesso(env, email);
  if (!acesso || !acesso.senha_hash) {
    const compras = await comprasPagas(env, email);
    return compras.length
      ? erro('Este é o seu primeiro acesso: crie a sua senha.', 409, { primeiroAcesso: true })
      : erro('Não encontramos compra com este e-mail. Use o mesmo e-mail do pagamento.', 404);
  }
  if (!(await conferirSenha(String(senha), acesso.senha_hash))) {
    const restam = await falhou(env, chave, 8, 15);
    return erro(restam > 0 ? 'Senha incorreta.' : 'Muitas tentativas. Espere 15 minutos ou use "Esqueci a senha".', restam > 0 ? 401 : 429);
  }
  await zerar(env, chave);

  const plano = calcularPlano(await comprasPagas(env, email));
  if (!plano) return erro('O acesso desta compra foi encerrado (reembolso ou cancelamento). Fale com o suporte se for engano.', 403);

  acesso.aparelhos = registrarAparelho(acesso.aparelhos, aparelho);
  await salvarAcesso(env, { email, aparelhos: acesso.aparelhos });
  return respostaLogin(env, email, acesso, plano);
}
