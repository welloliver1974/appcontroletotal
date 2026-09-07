import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxjdaqpfjdntbyjettun.supabase.co';
const supabaseKey = 'sb_publishable_Vo2Dk5JtUa4wI_dYxaXRFA_j6aA2seP';
const supabase = createClient(supabaseUrl, supabaseKey);

async function resolverTudo() {
  console.log('🚀 Iniciando correção...\n');

  // 1. Busca TODOS os eventos
  const { data: todosEventos, error: erroBusca } = await supabase
    .from('events')
    .select('*');

  if (erroBusca) {
    console.error('❌ Erro ao buscar:', erroBusca.message);
    return;
  }

  console.log(`📊 Total de eventos no Supabase: ${todosEventos.length}`);

  // 2. Agrupa por título + data + horário (sem considerar o ID)
  const grupos = {};
  for (const evento of todosEventos) {
    const chave = `${evento.title?.toLowerCase().trim()}|${evento.date}|${evento.time_start}`;
    if (!grupos[chave]) {
      grupos[chave] = [];
    }
    grupos[chave].push(evento);
  }

  // 3. Encontra duplicatas (grupos com mais de 1 evento)
  const duplicatas = [];
  const eventosUnicos = [];

  for (const [chave, lista] of Object.entries(grupos)) {
    if (lista.length > 1) {
      // Mantém o primeiro, remove o resto
      eventosUnicos.push(lista[0]);
      for (let i = 1; i < lista.length; i++) {
        duplicatas.push(lista[i]);
      }
    } else {
      eventosUnicos.push(lista[0]);
    }
  }

  console.log(`\n🔍 Análise:`);
  console.log(`   Eventos únicos: ${eventosUnicos.length}`);
  console.log(`   Duplicatas para remover: ${duplicatas.length}`);

  if (duplicatas.length === 0) {
    console.log('\n✅ Não há duplicatas no Supabase!');
    console.log('\n⚠️  O problema pode ser no LOCALSTORAGE do navegador.');
    console.log('   Execute no console do navegador (F12):');
    console.log('   localStorage.clear(); location.reload();');
    return;
  }

  // 4. Remove as duplicatas
  console.log(`\n🗑️  Removendo ${duplicatas.length} duplicatas...`);

  const idsParaRemover = duplicatas.map(e => e.id);
  const { error: erroDelete } = await supabase
    .from('events')
    .delete()
    .in('id', idsParaRemover);

  if (erroDelete) {
    console.error('❌ Erro ao remover:', erroDelete.message);
    return;
  }

  // 5. Verifica o resultado
  const { data: eventosFinal, error: erroVerifica } = await supabase
    .from('events')
    .select('id');

  if (erroVerifica) {
    console.error('❌ Erro na verificação:', erroVerifica.message);
    return;
  }

  console.log(`\n✅ SUCESSO!`);
  console.log(`   Eventos antes: ${todosEventos.length}`);
  console.log(`   Eventos depois: ${eventosFinal.length}`);
  console.log(`   Removidos: ${todosEventos.length - eventosFinal.length}`);
  console.log('\n🎉 Agora feche o navegador, limpe o cache e abra novamente!');
}

resolverTudo();
