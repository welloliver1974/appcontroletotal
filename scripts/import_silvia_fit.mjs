import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fxjdaqpfjdntbyjettun.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Vo2Dk5JtUa4wI_dYxaXRFA_j6aA2seP';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const entries = [
  {
    date: '2026-02-22',
    weight: 80.8,
    measurements: {}
  },
  {
    date: '2026-03-30',
    weight: 73.8,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 27,
      'Braço direito': 32,
      'Braço esquerdo': 33,
      'Coxa direita': 58,
      'Coxa esquerda': 58.5,
      'Panturrilha direita': 41.5,
      'Panturrilha esquerda': 40,
      'Cintura': 85,
      'Costas': 87,
      'Ombro': 37,
      'Quadril': 108
    }
  },
  {
    date: '2026-04-12',
    weight: 71.7,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26,
      'Braço direito': 34,
      'Braço esquerdo': 33,
      'Coxa direita': 59,
      'Coxa esquerda': 59,
      'Panturrilha direita': 36,
      'Panturrilha esquerda': 38,
      'Cintura': 81,
      'Costas': 88,
      'Ombro': 38,
      'Quadril': 105
    }
  },
  {
    date: '2026-04-26',
    weight: 71.3,
    measurements: {
      'Antebraço direito': 26.5,
      'Antebraço esquerdo': 27.5,
      'Braço direito': 33,
      'Braço esquerdo': 33.5,
      'Coxa direita': 58.5,
      'Coxa esquerda': 59,
      'Panturrilha direita': 40.5,
      'Panturrilha esquerda': 40,
      'Cintura': 79,
      'Costas': 89.5,
      'Ombro': 38,
      'Quadril': 104
    }
  },
  {
    date: '2026-05-10',
    weight: 69.8,
    measurements: {
      'Antebraço direito': 27,
      'Antebraço esquerdo': 27,
      'Braço direito': 33,
      'Braço esquerdo': 33,
      'Coxa direita': 59,
      'Coxa esquerda': 60,
      'Panturrilha direita': 39,
      'Panturrilha esquerda': 40,
      'Cintura': 81,
      'Costas': 90,
      'Ombro': 38,
      'Quadril': 104
    }
  },
  {
    date: '2026-05-17',
    weight: 68.8,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 27,
      'Braço direito': 33,
      'Braço esquerdo': 32,
      'Coxa direita': 60,
      'Coxa esquerda': 59,
      'Panturrilha direita': 39,
      'Panturrilha esquerda': 40,
      'Cintura': 81.5,
      'Costas': 88.5,
      'Ombro': 38.5,
      'Quadril': 101.5
    }
  },
  {
    date: '2026-05-24',
    weight: 68.8,
    measurements: {
      'Antebraço direito': 25,
      'Antebraço esquerdo': 26,
      'Braço direito': 33.5,
      'Braço esquerdo': 32.5,
      'Coxa direita': 59.5,
      'Coxa esquerda': 60,
      'Panturrilha direita': 39,
      'Panturrilha esquerda': 39,
      'Cintura': 80,
      'Costas': 88.5,
      'Ombro': 38,
      'Quadril': 100.5
    }
  },
  {
    date: '2026-05-31',
    weight: 67.85,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26.5,
      'Braço direito': 32.5,
      'Braço esquerdo': 32.5,
      'Coxa direita': 59.5,
      'Coxa esquerda': 60.5,
      'Panturrilha direita': 39,
      'Panturrilha esquerda': 39.5,
      'Cintura': 79.5,
      'Costas': 88.5,
      'Ombro': 39,
      'Quadril': 103.5
    }
  },
  {
    date: '2026-06-07',
    weight: 67.4,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26.5,
      'Braço direito': 33,
      'Braço esquerdo': 32,
      'Coxa direita': 60,
      'Coxa esquerda': 61,
      'Panturrilha direita': 38.5,
      'Panturrilha esquerda': 39,
      'Cintura': 78,
      'Costas': 90,
      'Ombro': 39,
      'Quadril': 102
    }
  },
  {
    date: '2026-06-14',
    weight: 67.1,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26,
      'Braço direito': 32,
      'Braço esquerdo': 31.5,
      'Coxa direita': 58.5,
      'Coxa esquerda': 59,
      'Panturrilha direita': 37,
      'Panturrilha esquerda': 36.5,
      'Cintura': 77,
      'Costas': 87,
      'Ombro': 40,
      'Quadril': 100.5
    }
  },
  {
    date: '2026-06-21',
    weight: 66.6,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26.5,
      'Braço direito': 32.5,
      'Braço esquerdo': 32,
      'Coxa direita': 61.5,
      'Coxa esquerda': 59.5,
      'Panturrilha direita': 38.5,
      'Panturrilha esquerda': 39,
      'Cintura': 80.5,
      'Costas': 88.5,
      'Ombro': 38,
      'Quadril': 100.5
    }
  },
  {
    date: '2026-06-28',
    weight: 66.6,
    measurements: {
      'Antebraço direito': 25.5,
      'Antebraço esquerdo': 26.5,
      'Braço direito': 33,
      'Braço esquerdo': 31.5,
      'Coxa direita': 58.5,
      'Coxa esquerda': 60,
      'Panturrilha direita': 39,
      'Panturrilha esquerda': 39.5,
      'Cintura': 79,
      'Costas': 91,
      'Ombro': 38,
      'Quadril': 100
    }
  },
  {
    date: '2026-07-12',
    weight: 66.2,
    measurements: {
      'Antebraço direito': 25.5,
      'Antebraço esquerdo': 26.5,
      'Braço direito': 31.5,
      'Braço esquerdo': 30.5,
      'Coxa direita': 57,
      'Coxa esquerda': 59,
      'Panturrilha direita': 36.5,
      'Panturrilha esquerda': 38.5,
      'Cintura': 75.5,
      'Costas': 90,
      'Ombro': 40,
      'Quadril': 100.5
    }
  },
  {
    date: '2026-07-19',
    weight: 65.8,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26,
      'Braço direito': 31.5,
      'Braço esquerdo': 31,
      'Coxa direita': 56.5,
      'Coxa esquerda': 57,
      'Panturrilha direita': 37,
      'Panturrilha esquerda': 38,
      'Cintura': 76,
      'Costas': 88,
      'Ombro': 40,
      'Quadril': 99
    }
  },
  {
    date: '2026-07-26',
    weight: 65.8,
    measurements: {
      'Antebraço direito': 25.5,
      'Antebraço esquerdo': 26,
      'Braço direito': 32,
      'Braço esquerdo': 31,
      'Coxa direita': 59,
      'Coxa esquerda': 58,
      'Panturrilha direita': 38,
      'Panturrilha esquerda': 38.5,
      'Cintura': 76,
      'Costas': 89,
      'Ombro': 40
    }
  },
  {
    date: '2026-08-02',
    weight: 65.8,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26.5,
      'Braço direito': 32,
      'Braço esquerdo': 31,
      'Coxa direita': 60,
      'Coxa esquerda': 58.5,
      'Panturrilha direita': 38,
      'Panturrilha esquerda': 38,
      'Cintura': 81,
      'Costas': 90,
      'Ombro': 37,
      'Quadril': 100
    }
  },
  {
    date: '2026-08-09',
    weight: 66.0,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26.5,
      'Braço direito': 32,
      'Braço esquerdo': 31,
      'Coxa direita': 59,
      'Coxa esquerda': 59,
      'Panturrilha direita': 38,
      'Panturrilha esquerda': 38.5,
      'Cintura': 78,
      'Costas': 89,
      'Quadril': 100.5
    }
  },
  {
    date: '2026-08-16',
    weight: 67.0,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26.5,
      'Braço direito': 32,
      'Braço esquerdo': 31,
      'Coxa direita': 61.5,
      'Coxa esquerda': 60,
      'Panturrilha direita': 37.5,
      'Panturrilha esquerda': 39,
      'Cintura': 78,
      'Costas': 88,
      'Quadril': 99.5
    }
  },
  {
    date: '2026-08-24',
    weight: 66.3,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26.5,
      'Braço direito': 32.5,
      'Braço esquerdo': 31.5,
      'Coxa direita': 60,
      'Coxa esquerda': 49.5,
      'Panturrilha direita': 38.5,
      'Panturrilha esquerda': 39.5,
      'Cintura': 76.5,
      'Costas': 90,
      'Quadril': 100
    }
  },
  {
    date: '2026-08-30',
    weight: 66.3,
    measurements: {
      'Antebraço direito': 26,
      'Antebraço esquerdo': 26.5,
      'Braço direito': 32.5,
      'Braço esquerdo': 30.5,
      'Coxa direita': 59,
      'Coxa esquerda': 58,
      'Panturrilha direita': 39,
      'Panturrilha esquerda': 39,
      'Cintura': 77,
      'Costas': 90.5,
      'Quadril': 100
    }
  },
  {
    date: '2026-09-04',
    weight: 66.3,
    measurements: {
      'Antebraço direito': 25,
      'Antebraço esquerdo': 26,
      'Braço direito': 31,
      'Braço esquerdo': 31.5,
      'Coxa direita': 56,
      'Coxa esquerda': 58,
      'Panturrilha direita': 39,
      'Panturrilha esquerda': 39.5,
      'Cintura': 75,
      'Costas': 98,
      'Quadril': 100.5
    }
  }
];

async function importData() {
  const email = 'silvinhamsa@gmail.com';
  const settingId = 'fit_profile_' + email;

  const weights = [];
  const measurements = [];

  let weightId = 1;
  let measId = 1;

  for (const entry of entries) {
    if (entry.weight) {
      weights.push({
        id: `w-silvia-${weightId++}`,
        weight_kg: entry.weight,
        log_date: entry.date,
        created_at: new Date(entry.date + 'T12:00:00.000Z').toISOString()
      });
    }

    if (entry.measurements) {
      for (const [label, val] of Object.entries(entry.measurements)) {
        measurements.push({
          id: `m-silvia-${measId++}`,
          label,
          value_cm: Number(val),
          log_date: entry.date,
          created_at: new Date(entry.date + 'T12:00:00.000Z').toISOString()
        });
      }
    }
  }

  // Sort descending by date (most recent first)
  weights.sort((a, b) => b.log_date.localeCompare(a.log_date));
  measurements.sort((a, b) => b.log_date.localeCompare(a.log_date));

  const payload = {
    weights,
    measurements,
    sessions: [],
    bioimpedance: [],
    templates: [
      { id: 'tpl-1', name: 'Treino A — Superiores & Abdômen' },
      { id: 'tpl-2', name: 'Treino B — Glúteos & Pernas' },
      { id: 'tpl-3', name: 'Treino C — Costas & Cardio' }
    ],
    userHeightCm: 165,
    measurementGoals: {
      'Cintura': 70,
      'Quadril': 98,
      'Braço direito': 30
    }
  };

  const { error } = await supabase.from('app_settings').upsert({
    id: settingId,
    data: payload,
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error('Error importing:', error);
  } else {
    console.log('✅ Importação concluída com sucesso!');
    console.log(`Total de Pesos importados: ${weights.length}`);
    console.log(`Total de Medições importadas: ${measurements.length}`);
    console.log('Primeiro registro:', entries[0].date, `(${entries[0].weight}kg)`);
    console.log('Último registro:', entries[entries.length - 1].date, `(${entries[entries.length - 1].weight}kg)`);
  }
}

importData();
