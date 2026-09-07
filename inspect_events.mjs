import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxjdaqpfjdntbyjettun.supabase.co';
const supabaseKey = 'sb_publishable_Vo2Dk5JtUa4wI_dYxaXRFA_j6aA2seP';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectarEventos() {
  // Primeiro, verifica a estrutura da tabela
  const { data: infoTabela, error: erroInfo } = await supabase
    .from('events')
    .select('*')
    .limit(1);

  if (erroInfo) {
    console.error('Erro ao buscar estrutura:', erroInfo.message);
    return;
  }

  console.log('📋 Estrutura da tabela events:');
  console.log(Object.keys(infoTabela[0]).join(', '));
  console.log('');

  // Busca todos os eventos
  const { data: eventos, error } = await supabase
    .from('events')
    .select('*');

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  console.log(`📊 Total de eventos: ${eventos.length}`);
  console.log('\n=== Primeiros 15 eventos ===\n');

  eventos.slice(0, 15).forEach((e, i) => {
    console.log(`${i + 1}. ID: ${e.id}`);
    console.log(`   Título: ${e.title}`);
    console.log(`   Data: ${e.date} | Hora: ${e.time_start} - ${e.time_end}`);
    console.log(`   Categoria: ${e.category}`);
    console.log(`   Localização: ${e.location || '(sem local)'}`);
    console.log('');
  });

  // Procura por eventos com mesmo título, data e horário (possíveis duplicatas)
  console.log('\n=== Procurando duplicatas potenciais ===\n');
  const porChave = {};
  for (const e of eventos) {
    // Cria uma chave baseada nos campos relevantes
    const chave = `${e.title?.toLowerCase().trim()}|${e.date || ''}|${e.time_start || ''}|${e.category || ''}`;
    if (!porChave[chave]) {
      porChave[chave] = [];
    }
    porChave[chave].push(e);
  }

  let encontrouDup = false;
  for (const [chave, lista] of Object.entries(porChave)) {
    if (lista.length > 1) {
      encontrouDup = true;
      console.log(`🔴 DUPLICATA (${lista.length}x): ${chave}`);
      lista.forEach((e, idx) => {
        console.log(`   [${idx + 1}] ID: ${e.id}`);
      });
      console.log('');
    }
  }

  if (!encontrouDup) {
    console.log('✅ Nenhuma duplicata exata encontrada.');
  }

  // Conta eventos por prefixo de ID
  console.log('\n=== Eventos por tipo de ID ===\n');
  const gcalCount = eventos.filter(e => e.id?.startsWith('gcal-')).length;
  const outroCount = eventos.length - gcalCount;
  console.log(`Eventos com ID "gcal-*": ${gcalCount}`);
  console.log(`Outros eventos: ${outroCount}`);
}

inspectarEventos();
