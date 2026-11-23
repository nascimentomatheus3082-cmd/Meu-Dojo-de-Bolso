/* POST /api/ativar  { email, digitos, senha, aparelho }
   Primeiro acesso e "esqueci a senha": confere o e-mail da compra + os 4 últimos dígitos
   do celular (ou do CPF) informado no checkout e grava a senha nova.
   Trocar a senha desconecta os outros aparelhos. */
import {
  json, erro, faltaConfig, normEmail, soDigitos, comprasPagas, lerAcesso, salvarAcesso,
  calcularPlano, hashSenha, registrarAparelho, aparelhoValido, bloqueado, falhou, zerar, lerJson, respostaLogin,
} from '../acesso.js';

export async function onRequestPost({ request, env }) {
  if (faltaConfig(env).length) return erro('O acesso ainda está sendo configurado. Tente de novo em alguns minutos.', 503);
  const { email: e, digitos, senha, aparelho } = await lerJson(request);
  const email = normEmail(e), dig = soDigitos(digitos);
  if (!/^\S+@\S+\.\S+$/.test(email)) return erro('Confira o e-mail.');
  if (dig.length !== 4) return erro('Digite os 4 últimos números do celular usado na compra.');
  if (String(senha || '').length < 6) return erro('A senha precisa ter pelo menos 6 caracteres.');
  if (!aparelhoValido(aparelho)) return erro('Aparelho inválido. Recarregue a página.');

  const chave = 'ativar:' + email;
  if (await bloqueado(env, chave)) return erro('Muitas tentativas. Espere 1 hora ou fale com o suporte.', 429);

  const compras = await comprasPagas(env, email);
  if (!compras.length) {
    await falhou(env, chave, 5, 60);
    return erro('Não encontramos compra aprovada com este e-mail. Use o mesmo e-mail do pagamento. Se o Pix acabou de ser pago, espere 1 minuto.', 404);
  }
  const confere = compras.some(c => (c.telefone && c.telefone.endsWith(dig)) || (c.documento && c.documento.endsWith(dig)));
  if (!confere) {
    const restam = await falhou(env, chave, 5, 60);
    return erro(restam > 0
      ? `Os números não batem com o celular da compra. Restam ${restam} tentativas.`
      : 'Muitas tentativas. Espere 1 hora ou fale com o suporte.', restam > 0 ? 403 : 429);
  }
  await zerar(env, chave);

  const antes = await lerAcesso(env, email);
  const acesso = {
    email,
    senha_hash: await hashSenha(String(senha)),
    faixa_plano: antes ? antes.faixa_plano : null,
    aparelhos: registrarAparelho([], aparelho),          // senha nova: só este aparelho fica conectado
    versao: antes ? antes.versao + 1 : 1,
  };
  await salvarAcesso(env, acesso);
  return respostaLogin(env, email, acesso, calcularPlano(compras));
}
