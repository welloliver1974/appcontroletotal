import { createClient } from '@supabase/supabase-js';

// Credenciais do Supabase
const supabaseUrl = 'https://fxjdaqpfjdntbyjettun.supabase.co';
const supabaseKey = 'sb_publishable_Vo2Dk5JtUa4wI_dYxaXRFA_j6aA2seP';

const supabase = createClient(supabaseUrl, supabaseKey);

async function removerDuplicatas() {
  try {
    console.log('🔍 Buscando eventos no Supabase...\n');

    // Busca TODOS os eventos
    const { data: todosEventos, error: erroBusca } = await supabase
      .from('events')
      .select('id, title, date, time_start, time_end, category, location');

    if (erroBusca) throw erroBusca;

    console.log(`📊 Total de eventos encontrados: ${todosEventos.length}`);

    // Separa eventos do Google Calendar (começam com 'gcal-')
    const eventosGCal = todosEventos.filter(e => e.id && e.id.startsWith('gcal-'));
    const eventosNaoGCal = todosEventos.filter(e => !e.id || !e.id.startsWith('gcal-'));

    console.log(`📅 Eventos do Google Calendar: ${eventosGCal.length}`);
    console.log(`📝 Eventos normais (não-GC): ${eventosNaoGCal.length}`);

    if (eventosGCal.length === 0) {
      console.log('\n✅ Nenhum evento do Google Calendar encontrado.');
      return;
    }

    // Encontra duplicatas pelo título + data + horário + categoria
    const chaveUnica = (e) => `${e.title}|${e.date || ''}|${e.time_start || ''}|${e.time_end || ''}|${e.category || ''}|${e.location || ''}`;

    const eventosPorChave = new Map();
    const idsParaRemover = [];

    for (const evento of eventosGCal) {
      const chave = chaveUnica(evento);

      if (eventosPorChave.has(chave)) {
        // Já existe esse evento -> é duplicado
        idsParaRemover.push(evento.id);
      } else {
        // Primeiro evento com essa combinação -> mantém
        eventosPorChave.set(chave, evento.id);
      }
    }

    console.log(`\n🧹 Duplicatas encontradas: ${idsParaRemover.length}`);
    console.log(`📊 Eventos únicos que serão mantidos: ${eventosPorChave.size}`);

    if (idsParaRemover.length === 0) {
      console.log('\n✅ Não há duplicatas para remover.');
      return;
    }

    // Remove cada duplicata individualmente
    console.log('\n🗑️  Removendo duplicatas...');
    let removidos = 0;
    let erros = 0;

    for (const id of idsParaRemover) {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        erros++;
        console.warn(`  ⚠️ Erro ao remover ${id}: ${error.message}`);
      } else {
        removidos++;
      }
    }

    console.log(`\n✅ Removidos: ${removidos}`);
    if (erros > 0) {
      console.log(`⚠️ Erros: ${erros}`);
    }

    // Verificação final
    console.log('\n🔍 Verificação final...');
    const { data: eventosFinais, error: erroFinal } = await supabase
      .from('events')
      .select('id');

    if (erroFinal) throw erroFinal;

    const gcalFinais = eventosFinais.filter(e => e.id && e.id.startsWith('gcal-'));
    console.log(`📊 Eventos GC após limpeza: ${gcalFinais.length}`);
    console.log('\n🎉 Limpeza concluída com sucesso!');

  } catch (erro) {
    console.error('\n❌ ERRO:', erro.message);
    process.exit(1);
  }
}

removerDuplicatas();
