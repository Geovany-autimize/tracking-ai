# 🔍 ANÁLISE COMPLETA DO PROBLEMA

## Problemas Identificados

### 1. ❌ Erro 500 na Edge Function
- Log: `POST | 500 | consume-credit`
- A função está falhando durante execução
- Crédito foi consumido mas função retornou erro

### 2. ❌ Inconsistência de Dados
- `credit_usage`: 0 registros (não foi preenchido)
- `consumed_credits`: 1 crédito consumido
- Shipment não foi criado
- Frontend mostra crédito deduzido mas shipment não existe

### 3. ❌ Problema de Arquitetura
- Consumo ANTES de criar shipment (sem rollback)
- Duas fontes da verdade (`consumed_credits` + `shipments count`)
- Sem transação atômica
- `credit_usage` não é preenchido quando há erro

### 4. ❌ Prioridade Incorreta
- Deveria consumir créditos mensais primeiro (1500 disponíveis)
- Mas consumiu créditos extras primeiro (10 créditos)
- Indica que verificação de mensais falhou silenciosamente

---

## 🎯 SOLUÇÃO: Refatoração Completa

### Arquitetura Nova (Baseada em `credit_usage`)

**Princípio**: `credit_usage` é a única fonte da verdade

### Fluxo Novo:

```
1. Frontend → Nova Edge Function: create-shipment-with-credit
2. Edge Function:
   a. Valida créditos disponíveis (via credit_usage)
   b. Determina fonte (mensal ou extra)
   c. Executa transação SQL:
      BEGIN;
        INSERT INTO shipments (...) RETURNING id;
        INSERT INTO credit_usage (shipment_id, source_type, ...);
      COMMIT;
   d. Retorna sucesso com shipment_id
3. Se falhar → Rollback automático
```

### Benefícios:
- ✅ Atomicidade: tudo ou nada
- ✅ Rollback automático em caso de erro
- ✅ Uma única fonte da verdade
- ✅ Auditoria completa
- ✅ Simplificação do código

---

## 📋 PLANO DE IMPLEMENTAÇÃO

### ETAPA 1: Preparar Estrutura de Dados

1. **Adicionar campos em `credit_usage`**:
   - `subscription_period_start` (para rastrear período mensal)
   - `subscription_period_end`
   - Garantir que `shipment_id` seja sempre preenchido

2. **Migrar dados históricos**:
   - Criar registros em `credit_usage` baseados em:
     - Shipments existentes (source_type='monthly')
     - consumed_credits em credit_purchases (source_type='purchase')

### ETAPA 2: Criar Nova Edge Function

**Nome**: `create-shipment-with-credit`

**Lógica**:
```typescript
1. Validar sessão
2. Verificar créditos disponíveis:
   - Mensais: plan.monthly_credits - COUNT(credit_usage WHERE source_type='monthly' AND período_atual)
   - Extras: SUM(credit_purchases.credits_amount) - COUNT(credit_usage WHERE purchase_id IN purchases)
3. Determinar fonte (mensal primeiro, depois extras)
4. Executar transação SQL:
   BEGIN;
     INSERT INTO shipments (...) RETURNING id;
     INSERT INTO credit_usage (shipment_id, source_type, ...) VALUES (...);
   COMMIT;
5. Retornar sucesso com shipment_id
```

### ETAPA 3: Atualizar Frontend

- Remover chamadas separadas de `consumeCredit()`
- Usar apenas `create-shipment-with-credit`
- Simplificar código

### ETAPA 4: Remover `consumed_credits`

- Migration para remover coluna
- Atualizar todas as queries
- Remover lógica antiga

### ETAPA 5: Atualizar Funções de Cálculo

- `getAvailableCredits()` calcula via `credit_usage`
- `getUsedCredits()` calcula via `credit_usage`
- Views SQL para facilitar

---

## 🧪 TESTES CRÍTICOS

### Teste 1: Consumo Mensal
- Cliente com 1500 créditos mensais
- Criar shipment → deve criar registro em credit_usage com source_type='monthly'
- Verificar shipment_id preenchido

### Teste 2: Consumo Extras
- Cliente sem créditos mensais
- Criar shipment → deve criar registro com source_type='purchase' e purchase_id

### Teste 3: Rollback
- Tentar criar shipment com dados inválidos
- Verificar que NADA foi criado (nem shipment nem credit_usage)

### Teste 4: Prioridade
- Cliente com mensais + extras
- Deve consumir mensal primeiro

### Teste 5: Erro durante criação
- Simular erro após criar shipment mas antes de credit_usage
- Verificar rollback completo

---

## ⚠️ HIPÓTESES DE PROBLEMA ATUAL

### Hipótese 1: Erro no Stripe
- Verificação Stripe falha silenciosamente
- Vai para fallback DB mas também falha
- Consome créditos extras por engano

### Hipótese 2: Período Incorreto
- Stripe pode ter período diferente do DB
- Query não encontra créditos mensais disponíveis

### Hipótese 3: Race Condition
- Múltiplas requisições simultâneas
- Ambas verificam créditos disponíveis
- Ambas consomem

### Hipótese 4: Erro na Query
- Query de contagem de shipments falha
- Retorna erro mas crédito já foi consumido

---

## ✅ VALIDAÇÕES NECESSÁRIAS

Antes de implementar, validar:
1. Por que a função retornou 500?
2. Por que consumiu créditos extras em vez de mensais?
3. Por que credit_usage não foi preenchido?
4. Qual foi o erro exato na função?


