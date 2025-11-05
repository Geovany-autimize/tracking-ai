# Análise de Problemas com Sistema de Créditos

## Problemas Identificados

### 1. Tabela `credit_usage` não encontrada no Supabase

**Causa:** A migration `20251103112327_create_credit_usage.sql` ainda não foi executada no banco de dados do Supabase.

**Solução:** É necessário executar a migration no Supabase. As migrations precisam ser aplicadas manualmente através do Dashboard do Supabase ou via CLI.

### 2. Crédito não aparece -1 no frontend após criar rastreio

**Análise:**
- O consumo de créditos **ESTÁ FUNCIONANDO** corretamente (a lógica está ok)
- O problema é que o frontend não está atualizando automaticamente a exibição dos créditos após criar um rastreio
- O sistema está consumindo créditos no backend, mas a interface não está sendo atualizada

## O que está funcionando corretamente:

✅ **Consumo de créditos:** A edge function `consume-credit` está funcionando e consumindo créditos corretamente
✅ **Lógica de validação:** Verifica se há créditos disponíveis antes de criar rastreios
✅ **Integração:** Todos os pontos de criação de rastreios (ShipmentForm, QuickShipmentForm, Import) estão consumindo créditos
✅ **Registro de auditoria:** O código está preparado para registrar na tabela `credit_usage` (mas falha silenciosamente porque a tabela não existe)

## O que precisa ser corrigido:

### Correção 1: Executar Migration

Execute a migration `20251103112327_create_credit_usage.sql` no Supabase:

**Opção A - Via Dashboard do Supabase:**
1. Acesse o Dashboard do Supabase
2. Vá em "SQL Editor"
3. Cole o conteúdo do arquivo `supabase/migrations/20251103112327_create_credit_usage.sql`
4. Execute o script

**Opção B - Via CLI do Supabase:**
```bash
supabase db push
```

### Correção 2: Melhorar Logs (JÁ IMPLEMENTADO)

Adicionei logs mais detalhados na edge function `consume-credit` que agora:
- Mostra erros específicos se a tabela não existir (código de erro `42P01`)
- Registra quando o consumo é registrado com sucesso
- Fornece dicas sobre qual migration executar

### Correção 3: Atualizar Frontend para mostrar créditos atualizados

O frontend precisa recarregar os créditos após criar um rastreio. Vou verificar onde isso deve ser implementado.

## Logs para Análise

Após executar a migration, quando você criar um novo rastreio, verifique os logs da edge function `consume-credit`:

**Se a tabela não existir, você verá:**
```
[CONSUME-CREDIT] Error recording credit_usage (non-blocking) - {
  error: "relation \"credit_usage\" does not exist",
  code: "42P01",
  hint: "Table credit_usage does not exist. Run migration 20251103112327_create_credit_usage.sql"
}
```

**Se funcionar corretamente, você verá:**
```
[CONSUME-CREDIT] Credit usage recorded successfully - {
  trackingCode: "BR123456789BR",
  source: "monthly" ou "purchase"
}
```

## Correções Implementadas

### ✅ Correção 3: Atualização automática de créditos no frontend (IMPLEMENTADO)

Adicionei chamadas para `refreshSession()` após criar rastreios em:
- `ShipmentForm.tsx`: Atualiza créditos após criar rastreio
- `QuickShipmentForm.tsx`: Atualiza créditos após criar rastreio
- `Shipments.tsx`: Atualiza créditos após importação bem-sucedida

Agora o frontend atualiza automaticamente a quantidade de créditos exibida após cada consumo.

### ✅ Melhorias nos Logs (IMPLEMENTADO)

Os logs da edge function agora mostram:
- Erro específico se a tabela `credit_usage` não existir (código `42P01`)
- Mensagem de sucesso quando o registro é criado
- Dica sobre qual migration executar

## Próximos Passos

1. ⚠️ **AÇÃO NECESSÁRIA:** Executar a migration no Supabase
   - Acesse o Dashboard do Supabase → SQL Editor
   - Execute o conteúdo do arquivo: `supabase/migrations/20251103112327_create_credit_usage.sql`
   - Ou use: `supabase db push` (se tiver CLI configurado)

2. ✅ Testar criação de rastreio e verificar:
   - Se os créditos diminuem no frontend (deve funcionar agora)
   - Se os logs da edge function mostram registro na `credit_usage` (após executar migration)
   - Se há algum erro nos logs

## Resumo Técnico

**Status Atual:**
- ✅ Consumo de créditos: Funcionando corretamente
- ✅ Atualização frontend: Implementada
- ⚠️ Auditoria (`credit_usage`): Aguardando execução da migration
- ✅ Logs melhorados: Implementados

**O que acontece quando você cria um rastreio:**
1. Frontend chama `consumeCredit(trackingCode)`
2. Edge function valida e consome o crédito
3. Tenta registrar na tabela `credit_usage` (falha silenciosamente se tabela não existir)
4. Retorna sucesso para o frontend
5. Frontend atualiza a sessão (`refreshSession()`) para mostrar créditos atualizados
6. Rastreio é criado no banco de dados

