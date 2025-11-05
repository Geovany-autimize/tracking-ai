# 📋 PLANO DE AÇÃO: Refatoração do Sistema de Créditos

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. Arquitetura Atual (Problemática)
- ❌ `consumed_credits` em `credit_purchases` causa inconsistência
- ❌ Consumo ANTES de criar shipment (sem rollback)
- ❌ `credit_usage` não está sendo preenchido quando há erro
- ❌ Não há transação atômica entre consumo e criação
- ❌ Duas fontes da verdade (consumed_credits + shipments count)

### 2. Evidências do Problema
- Logs: `POST | 500 | consume-credit` (erro na função)
- `credit_usage`: 0 registros (não foi preenchido)
- `consumed_credits`: 1 crédito consumido dos extras
- Shipment não foi criado
- Frontend mostra erro mas crédito foi deduzido

---

## 🎯 SOLUÇÃO PROPOSTA: Arquitetura Baseada em `credit_usage`

### Princípios da Nova Arquitetura

1. **`credit_usage` como única fonte da verdade**
   - Todos os consumos registrados em `credit_usage`
   - Remover `consumed_credits` de `credit_purchases`
   - Cálculo de créditos disponíveis via queries em `credit_usage`

2. **Transação Atômica**
   - Criar shipment e registrar consumo em uma única transação
   - Rollback automático se qualquer parte falhar

3. **Prioridade Explícita**
   - Sempre consumir créditos mensais primeiro
   - Só usar créditos extras se mensais estiverem esgotados

4. **Consistência**
   - Shipment só é criado se crédito for consumido com sucesso
   - Crédito só é consumido se shipment for criado

---

## 📐 ARQUITETURA PROPOSTA

### Nova Estrutura de Dados

```sql
-- credit_usage (FONTE DA VERDADE)
- id
- customer_id
- shipment_id (FK para shipments) ← IMPORTANTE: sempre preencher
- tracking_code
- credits_consumed (sempre 1)
- source_type ('monthly' | 'purchase')
- purchase_id (NULL se for monthly)
- subscription_period_start (para rastrear período mensal)
- subscription_period_end
- created_at

-- credit_purchases (SEM consumed_credits)
- id
- customer_id
- credits_amount (total comprado)
- status
- expires_at
- created_at
-- REMOVER: consumed_credits ← não precisa mais
```

### Lógica de Cálculo

**Créditos Disponíveis**:
```sql
-- Mensais disponíveis
monthly_credits - COUNT(credit_usage WHERE source_type='monthly' AND período_atual)

-- Extras disponíveis  
SUM(credit_purchases.credits_amount) - COUNT(credit_usage WHERE purchase_id IN (purchases válidas))
```

### Fluxo de Consumo (Novo)

1. **Frontend**: Chama `create-shipment-with-credit` (nova função)
2. **Edge Function**: 
   - Valida créditos disponíveis
   - Cria shipment
   - Registra em `credit_usage` com `shipment_id`
   - Tudo em uma transação SQL
3. **Rollback**: Se qualquer parte falhar, tudo é revertido

---

## 🔧 IMPLEMENTAÇÃO

### Fase 1: Migração de Dados

1. Migrar `consumed_credits` existentes para `credit_usage`
2. Criar registros históricos baseados em shipments existentes
3. Validar integridade dos dados

### Fase 2: Nova Edge Function

Criar `create-shipment-with-credit` que:
- Recebe dados do shipment + tracking_code
- Valida créditos disponíveis
- Executa transação SQL:
  ```sql
  BEGIN;
    INSERT INTO shipments (...) RETURNING id;
    INSERT INTO credit_usage (shipment_id, ...) VALUES (...);
  COMMIT;
  ```
- Retorna sucesso/erro

### Fase 3: Atualizar Frontend

- Remover chamadas separadas de `consumeCredit()` + `insert shipment`
- Usar apenas `create-shipment-with-credit`
- Simplificar código

### Fase 4: Remover `consumed_credits`

- Migration para remover coluna
- Atualizar todas as queries
- Remover lógica antiga

### Fase 5: Atualizar Cálculos

- `getAvailableCredits()` calcula via `credit_usage`
- Views SQL para facilitar queries
- Remover dependência de `consumed_credits`

---

## 🧪 TESTES NECESSÁRIOS

### Teste 1: Consumo Mensal
- Cliente com 1500 créditos mensais, 0 usados
- Criar shipment → deve consumir mensal
- Verificar `credit_usage` criado com `source_type='monthly'`

### Teste 2: Consumo Extras
- Cliente sem créditos mensais
- Criar shipment → deve consumir extra
- Verificar `credit_usage` criado com `purchase_id`

### Teste 3: Rollback
- Criar shipment com dados inválidos
- Verificar que `credit_usage` NÃO foi criado
- Verificar que shipment NÃO foi criado

### Teste 4: Transação Atômica
- Simular erro após criar shipment mas antes de credit_usage
- Verificar rollback completo

### Teste 5: Prioridade
- Cliente com mensais + extras disponíveis
- Deve consumir mensal primeiro

### Teste 6: Importação em Lote
- Importar 10 rastreios com 5 créditos disponíveis
- Deve criar 5 e falhar nos outros 5
- Verificar que todos os 5 têm `credit_usage` registrado

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Dados Históricos Perdidos
- **Mitigação**: Migration para criar registros históricos em `credit_usage` antes de remover `consumed_credits`

### Risco 2: Performance
- **Mitigação**: Índices adequados em `credit_usage` (customer_id, source_type, created_at)
- Views materializadas se necessário

### Risco 3: Race Conditions
- **Mitigação**: Transações SQL com `SELECT FOR UPDATE`
- Lock de linha durante verificação

### Risco 4: Período Mensal Incorreto
- **Mitigação**: Armazenar `subscription_period_start/end` em `credit_usage`
- Facilita queries históricas

---

## 📊 BENEFÍCIOS DA NOVA ARQUITETURA

1. ✅ **Consistência**: Uma única fonte da verdade
2. ✅ **Auditoria**: Histórico completo em `credit_usage`
3. ✅ **Simplicidade**: Menos colunas, menos lógica
4. ✅ **Transações**: Atomicidade garantida
5. ✅ **Rollback**: Automático em caso de erro
6. ✅ **Rastreabilidade**: Cada consumo vinculado a um shipment

---

## 🚀 CRONOGRAMA PROPOSTO

### Etapa 1: Preparação (30min)
- Criar migration para adicionar campos em `credit_usage`
- Criar migration para migrar dados históricos

### Etapa 2: Nova Edge Function (1h)
- Criar `create-shipment-with-credit`
- Implementar transação SQL
- Testes unitários

### Etapa 3: Frontend (30min)
- Atualizar formulários para usar nova função
- Remover chamadas antigas

### Etapa 4: Migração (30min)
- Remover `consumed_credits`
- Atualizar queries

### Etapa 5: Validação (30min)
- Testes end-to-end
- Verificar integridade dos dados

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Todos os consumos históricos migrados para `credit_usage`
- [ ] Nova função criada e testada
- [ ] Frontend atualizado
- [ ] Rollback funcionando
- [ ] Prioridade mensal/extras funcionando
- [ ] Performance aceitável
- [ ] `consumed_credits` removido
- [ ] Queries atualizadas
- [ ] Testes passando

