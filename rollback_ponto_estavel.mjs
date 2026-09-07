import { execSync } from 'child_process';

console.log('🔄 Iniciando Rollback para o Ponto Estável: ponto-estavel-2026-09-07-completo...');

try {
  execSync('git reset --hard ponto-estavel-2026-09-07-completo', { stdio: 'inherit' });
  console.log('✅ Código local restaurado com sucesso!');
  
  execSync('git push origin main --force', { stdio: 'inherit' });
  console.log('🚀 Código em produção (Vercel) restaurado com sucesso!');
  console.log('🎉 Rollback concluído com sucesso!');
} catch (error) {
  console.error('❌ Erro durante o rollback:', error?.message || error);
}
