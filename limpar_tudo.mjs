import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxjdaqpfjdntbyjettun.supabase.co';
const supabaseKey = 'sb_publishable_Vo2Dk5JtUa4wI_dYxaXRFA_j6aA2seP';
const supabase = createClient(supabaseUrl, supabaseKey);

async function limparTudo() {
  console.log('🚀 INICIANDO LIMPEZA COMPLETA...\n');

  // 1. Busca todos os eventos
  const { data: todosEventos, error: erroBusca } = await supabase
    .from('events')
    .select('id, title, date, time_start, time_end, category, location, created_at');

  if (erroBusca) {
    console.error('❌ Erro ao buscar:', erroBusca.message);
    return;
  }

  console.log(`📊 Total de eventos encontrados: ${todosEventos.length}`);

  // 2. Agrupa por título + data + horário (ignorando ID)
  const grupos = {};
  for (const evento of todosEventos) {
    const chave = `${evento.title?.toLowerCase().trim()}|${evento.date}|${evento.time_start}`;
    if (!grupos[chave]) {
      grupos[chave] = [];
    }
    grupos[chave].push(evento);
  }

  // 3. Identifica duplicatas
  const idsParaManter = [];
  const idsParaRemover = [];

  for (const [chave, lista] of Object.entries(grupos)) {
    if (lista.length > 1) {
      // Ordena por created_at (mais antigo primeiro)
      lista.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      // Mantém o mais antigo, remove o resto
      idsParaManter.push(lista[0].id);
      for (let i = 1; i < lista.length; i++) {
        idsParaRemover.push(lista[i].id);
      }
    } else {
      idsParaManter.push(lista[0].id);
    }
  }

  console.log(`\n🔍 Análise:`);
  console.log(`   Eventos únicos: ${idsParaManter.length}`);
  console.log(`   Duplicatas para remover: ${idsParaRemover.length}`);

  if (idsParaRemover.length === 0) {
    console.log('\n✅ Não há duplicatas para remover.');
    return;
  }

  // 4. Remove em lotes de 100
  console.log(`\n🗑️  Removendo ${idsParaRemover.length} duplicatas...`);
  let removidos = 0;
  let erros = 0;

  for (let i = 0; i < idsParaRemover.length; i += 100) {
    const lote = idsParaRemover.slice(i, i + 100);
    const { error } = await supabase
      .from('events')
      .delete()
      .in('id', lote);

    if (error) {
      erros += lote.length;
      console.warn(`  ⚠️ Erro no lote ${i/100 + 1}: ${error.message}`);
    } else {
      removidos += lote.length;
      console.log(`  ✅ Lote ${Math.floor(i/100) + 1}: ${removidos}/${idsParaRemover.length} removidos`);
    }
  }

  // 5. Verificação final
  const { data: eventosFinais, error: erroFinal } = await supabase
    .from('events')
    .select('id');

  if (erroFinal) {
    console.error('❌ Erro na verificação:', erroFinal.message);
    return;
  }

  console.log(`\n✅ LIMPEZA CONCLUÍDA!`);
  console.log(`   Antes: ${todosEventos.length} eventos`);
  console.log(`   Depois: ${eventosFinais.length} eventos`);
  console.log(`   Removidos: ${todosEventos.length - eventosFinais.length} duplicatas`);
  console.log('\n🎉 AGORA: Feche o navegador completamente e abra novamente!');
}

limparTudo();
