import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxjdaqpfjdntbyjettun.supabase.co';
const supabaseKey = 'sb_publishable_Vo2Dk5JtUa4wI_dYxaXRFA_j6aA2seP';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugarAppSettings() {
  console.log('🔍 Buscando app_settings...\n');

  const { data: settings, error } = await supabase
    .from('app_settings')
    .select('*');

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  console.log(`📊 Total de registros em app_settings: ${settings?.length || 0}\n`);

  if (!settings || settings.length === 0) {
    console.log('Nenhum registro encontrado.');
    return;
  }

  for (const setting of settings) {
    console.log(`═══ ID: ${setting.id} ═══`);
    const data = setting.data;

    if (Array.isArray(data)) {
      console.log(`   Tipo: ARRAY com ${data.length} itens`);
      if (data.length > 0 && typeof data[0] === 'object') {
        console.log(`   Primeiro item keys: ${Object.keys(data[0]).join(', ')}`);
        if (data[0].id?.startsWith('gcal-')) {
          console.log(`   ⚠️  ESTE É O PROBLEMA! Contém eventos do Google Calendar!`);
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      console.log(`   Tipo: OBJETO`);
      console.log(`   Keys: ${Object.keys(data).join(', ')}`);
    } else {
      console.log(`   Tipo: ${typeof data}`);
    }
    console.log('');
  }

  // Limpa os app_settings que contêm eventos do Google Calendar
  console.log('\n🧹 Limpando app_settings que contêm eventos GC...\n');

  const { data: gcalSettings, error: erroBusca } = await supabase
    .from('app_settings')
    .select('id')
    .like('id', 'events_%');

  if (erroBusca) {
    console.error('Erro na busca:', erroBusca.message);
    return;
  }

  if (gcalSettings && gcalSettings.length > 0) {
    console.log(`Encontrados ${gcalSettings.length} registros de eventos em app_settings:`);
    for (const s of gcalSettings) {
      console.log(`  - ${s.id}`);
    }

    const { error: erroDelete } = await supabase
      .from('app_settings')
      .delete()
      .in('id', gcalSettings.map(s => s.id));

    if (erroDelete) {
      console.error('\n❌ Erro ao limpar:', erroDelete.message);
    } else {
      console.log(`\n✅ ${gcalSettings.length} registros removidos de app_settings!`);
    }
  } else {
    console.log('Nenhum registro de eventos encontrado em app_settings.');
  }
}

debugarAppSettings();
