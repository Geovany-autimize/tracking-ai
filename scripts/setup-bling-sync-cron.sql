-- Script para configurar os cron jobs que sincronizam pedidos Bling automaticamente
-- Este script deve ser executado manualmente no SQL Editor do Supabase

-- Primeiro, habilitar as extensões necessárias (se ainda não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover jobs existentes se houver (para recriar)
SELECT cron.unschedule('bling-enqueue-sync');
SELECT cron.unschedule('bling-process-queue');

-- 1. Criar o cron job para adicionar clientes à fila a cada 2 horas
SELECT cron.schedule(
  'bling-enqueue-sync',
  '0 */2 * * *', -- A cada 2 horas (00:00, 02:00, 04:00, ...)
  $$
  SELECT
    net.http_post(
        url:='https://pvnwcxfnazwqpfasuztv.supabase.co/functions/v1/bling-enqueue-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bndjeGZuYXp3cXBmYXN1enR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNzE4OTcsImV4cCI6MjA3Njc0Nzg5N30.GnojnE5NgRBH9kvE9Ddkj7gel3YbyXvDtnYxUruFxaM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- 2. Criar o cron job para processar a fila a cada 15 minutos
-- Isso permite que a fila seja processada mais frequentemente, mas com rate limiting
SELECT cron.schedule(
  'bling-process-queue',
  '*/15 * * * *', -- A cada 15 minutos
  $$
  SELECT
    net.http_post(
        url:='https://pvnwcxfnazwqpfasuztv.supabase.co/functions/v1/bling-queue-processor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bndjeGZuYXp3cXBmYXN1enR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNzE4OTcsImV4cCI6MjA3Njc0Nzg5N30.GnojnE5NgRBH9kvE9Ddkj7gel3YbyXvDtnYxUruFxaM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Verificar se os jobs foram criados com sucesso
SELECT * FROM cron.job WHERE jobname IN ('bling-enqueue-sync', 'bling-process-queue');

-- Para ver os logs de execução dos crons:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid IN (
--   SELECT jobid FROM cron.job 
--   WHERE jobname IN ('bling-enqueue-sync', 'bling-process-queue')
-- ) 
-- ORDER BY start_time DESC LIMIT 20;

-- Para desabilitar os crons temporariamente (não execute isso agora):
-- SELECT cron.unschedule('bling-enqueue-sync');
-- SELECT cron.unschedule('bling-process-queue');
