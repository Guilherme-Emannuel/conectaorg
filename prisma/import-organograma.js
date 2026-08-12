// Importa data/organograma.json para a tabela org_units.
// Rodar com: npm run import:organograma
// ATENÇÃO: apaga as unidades existentes e importa do zero.
require('dotenv').config();

const prisma = require('../src/lib/prisma');
const dados = require('../data/organograma.json');

async function criarUnidade(node, parentId, ordem) {
  const unidade = await prisma.orgUnit.create({
    data: {
      nome: node.nome,
      sigla: node.sigla || null,
      gestor: node.gestor || null,
      ordem,
      parentId,
    },
  });

  const filhos = node.subordinados || [];
  for (let i = 0; i < filhos.length; i++) {
    const filho = filhos[i];

    // Grupos "categoria/itens" viram um nó agrupador com os itens como filhos
    if (filho.categoria && filho.itens) {
      const grupo = await prisma.orgUnit.create({
        data: { nome: filho.categoria, ordem: i, parentId: unidade.id },
      });
      for (let j = 0; j < filho.itens.length; j++) {
        await criarUnidade(filho.itens[j], grupo.id, j);
      }
    } else {
      await criarUnidade(filho, unidade.id, i);
    }
  }

  return unidade;
}

async function main() {
  await prisma.orgUnit.deleteMany();

  const raiz = await criarUnidade(dados.chefe_executivo, null, 0);
  const total = await prisma.orgUnit.count();

  console.log(`Importado: "${raiz.nome}" e mais ${total - 1} unidades (total ${total}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
