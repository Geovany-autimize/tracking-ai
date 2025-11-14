-- Script para configurar o cron job que atualiza rastreamentos ativos automaticamente
-- Este script deve ser executado manualmente no SQL Editor do Supabase

-- Primeiro, habilitar as extensões necessárias (se ainda não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job existente se houver (para recriar)
SELECT cron.unschedule('refresh-active-trackings');

-- Criar o cron job para executar a cada 6 horas
-- Isso vai chamar a edge function que atualiza os rastreamentos ativos
SELECT cron.schedule(
  'refresh-active-trackings',
  '0 */6 * * *', -- A cada 6 horas (00:00, 06:00, 12:00, 18:00)
  $$
  SELECT
    net.http_post(
        url:='https://pvnwcxfnazwqpfasuztv.supabase.co/functions/v1/refresh-active-trackings',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bndjeGZuYXp3cXBmYXN1enR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNzE4OTcsImV4cCI6MjA3Njc0Nzg5N30.GnojnE5NgRBH9kvE9Ddkj7gel3YbyXvDtnYxUruFxaM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Verificar se o job foi criado com sucesso
SELECT * FROM cron.job WHERE jobname = 'refresh-active-trackings';

-- Para ver os logs de execução do cron:
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-active-trackings') ORDER BY start_time DESC LIMIT 10;

-- Para desabilitar o cron temporariamente (não execute isso agora):
-- SELECT cron.unschedule('refresh-active-trackings');
