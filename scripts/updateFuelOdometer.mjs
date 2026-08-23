import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fxjdaqpfjdntbyjettun.supabase.co"
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_Vo2Dk5JtUa4wI_dYxaXRFA_j6aA2seP"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('Conectando ao Supabase para buscar registros de manutenção...')
  const { data: records, error } = await supabase.from('maintenance').select('*')
  if (error) {
    console.error('Erro ao consultar maintenance:', error)
    return
  }

  console.log('Registros encontrados em maintenance:', records.length)
  console.log(records)

  // Encontrar o registro com custo 50 ou título de abastecimento
  const target = records.find(r => Math.abs(Number(r.cost) - 50) < 0.01 || (r.title && r.title.includes('50')))

  if (target) {
    console.log('Registro de 50,00 encontrado:', target)
    const { data: updated, error: updateErr } = await supabase
      .from('maintenance')
      .update({ odometer_km: 149218 })
      .eq('id', target.id)
      .select()

    if (updateErr) {
      console.error('Erro ao atualizar:', updateErr)
    } else {
      console.log('Registro atualizado com sucesso no Supabase!', updated)
    }
  } else {
    console.log('Nenhum registro com valor exato de 50.00 encontrado. Listando todos:')
    for (const r of records) {
      console.log(`ID: ${r.id} | Titulo: ${r.title} | Custo: ${r.cost} | Odometro: ${r.odometer_km}`)
    }
  }
}

main()
