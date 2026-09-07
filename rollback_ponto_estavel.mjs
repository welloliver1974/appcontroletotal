import { execSync } from 'child_process';

console.log('🔄 Iniciando Rollback para o Ponto Estável: ponto-estavel-agenda-2026-09-07 (Commit db2fdf7)...');

try {
  execSync('git reset --hard ponto-estavel-agenda-2026-09-07', { stdio: 'inherit' });
  console.log('✅ Código local restaurado com sucesso!');
  
  execSync('git push origin main --force', { stdio: 'inherit' });
  console.log('🚀 Código em produção (Vercel) restaurado com sucesso!');
  console.log('🎉 Rollback concluído com sucesso!');
} catch (error) {
  console.error('❌ Erro durante o rollback:', error.message);
}
