import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxjdaqpfjdntbyjettun.supabase.co';
const supabaseKey = 'sb_publishable_Vo2Dk5JtUa4wI_dYxaXRFA_j6aA2seP';
const supabase = createClient(supabaseUrl, supabaseKey);

async function pararSincronizacao() {
  console.log('🛑 Desativando sincronização automática do Google Calendar...\n');

  // Busca todas as configs do Google Calendar
  const { data: configs, error } = await supabase
    .from('app_settings')
    .select('*')
    .like('id', 'gcal_config_%');

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  console.log(`Encontradas ${configs?.length || 0} configurações de Google Calendar:\n`);

  if (!configs || configs.length === 0) {
    console.log('Nenhuma configuração encontrada.');
    return;
  }

  // Desativa autoSync em todas as configurações
  for (const config of configs) {
    const currentConfig = config.data;
    console.log(`📍 Configurando: ${config.id}`);
    console.log(`   autoSync atual: ${currentConfig.autoSync}`);

    // Desativa a sincronização automática
    const newConfig = {
      ...currentConfig,
      autoSync: false,
    };

    const { error: erroUpdate } = await supabase
      .from('app_settings')
      .update({ data: newConfig })
      .eq('id', config.id);

    if (erroUpdate) {
      console.error(`   ❌ Erro ao atualizar: ${erroUpdate.message}`);
    } else {
      console.log(`   ✅ autoSync desativado!`);
    }
  }

  // Limpa também os eventos duplicados da app_settings se existirem
  console.log('\n🧹 Verificando eventos duplicados na app_settings...\n');

  const { data: eventosSettings, error: erroBusca } = await supabase
    .from('app_settings')
    .select('*')
    .like('id', 'events_%');

  if (erroBusca) {
    console.error('Erro na busca:', erroBusca.message);
    return;
  }

  if (eventosSettings && eventosSettings.length > 0) {
    console.log(`Encontrados ${eventosSettings.length} registros de eventos em app_settings:`);
    for (const s of eventosSettings) {
      const arr = s.data;
      console.log(`  - ${s.id}: ${Array.isArray(arr) ? arr.length : 0} eventos`);
    }

    const { error: erroDelete } = await supabase
      .from('app_settings')
      .delete()
      .in('id', eventosSettings.map(s => s.id));

    if (erroDelete) {
      console.error('\n❌ Erro ao remover:', erroDelete.message);
    } else {
      console.log(`\n✅ ${eventosSettings.length} registros removidos!`);
    }
  } else {
    console.log('✅ Nenhum registro de eventos encontrado em app_settings.');
  }

  // Verifica eventos na tabela events
  console.log('\n📊 Verificando tabela events...\n');
  const { data: eventos, error: erroCount } = await supabase
    .from('events')
    .select('id', { count: 'exact' });

  if (erroCount) {
    console.error('Erro na contagem:', erroCount.message);
    return;
  }

  console.log(`Total de eventos na tabela events: ${eventos?.length || 0}`);
  console.log('\n✅ Sincronização automática DESATIVADA e eventos corruptos LIMPOS!');
  console.log('\n📱 AGORA: Feche o navegador completamente, aguarde 10 segundos e abra novamente.');
}

pararSincronizacao();
