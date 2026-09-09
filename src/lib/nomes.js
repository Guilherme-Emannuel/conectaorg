// Padronização de nomes de gestores. Usado na edição/criação de setores
// e na importação do organograma, para manter o mesmo padrão sempre.

// nomes que não representam um gestor real (não são padronizados)
const SEM_GESTOR = ['VACANTE', 'NÃO INFORMADO', 'NÃO ADICIONADO'];

function gestorValido(nome) {
  return Boolean(nome && nome.trim() && !SEM_GESTOR.includes(nome.trim().toUpperCase()));
}

// conectivos que ficam em minúsculo no meio do nome (padrão pt-BR)
const CONECTIVOS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

// "LEONARDO DA COSTA felipe Martins" -> "Leonardo da Costa Felipe Martins"
// Não mexe em valores especiais como "VACANTE".
function padronizarNomeGestor(nome) {
  const bruto = (nome || '').trim();
  if (!bruto || !gestorValido(bruto)) return bruto;

  return bruto
    .split(/\s+/)
    .map((palavra, indice) => {
      const minuscula = palavra.toLocaleLowerCase('pt-BR');
      if (indice > 0 && CONECTIVOS.has(minuscula)) return minuscula;
      return minuscula.charAt(0).toLocaleUpperCase('pt-BR') + minuscula.slice(1);
    })
    .join(' ');
}

module.exports = { SEM_GESTOR, gestorValido, padronizarNomeGestor };
