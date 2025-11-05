# 📋 PLANO DE AÇÃO - REFATORAÇÃO DO SISTEMA DE CRÉDITOS

## ✅ PROGRESSO ATUAL

### Concluído

1. ✅ **Estrutura de Dados**
   - Adicionados campos `subscription_period_start` e `subscription_period_end` em `credit_usage`
   - Tabela `credit_usage` preparada para ser fonte única da verdade

2. ✅ **Função RPC Atômica**
   - Criada função `create_shipment_with_credit` no PostgreSQL
   - Transação SQL garante atomicidade: shipment + credit_usage criados juntos ou nenhum

3. ✅ **Nova Edge Function**
   - Criada `create-shipment-with-credit` (deployada)
   - Lógica completa:
     - Verifica créditos mensais primeiro (via Stripe ou DB)
     - Se não houver mensais, verifica créditos extras (FIFO)
     - Cria shipment e registra consumo em uma única transação
     - Retorna sucesso com shipment_id e créditos restantes

### Pendente

1. ⏳ **Migração de Dados Históricos**
   - Criar registros em `credit_usage` baseados em:
     - Shipments existentes (source_type='monthly')
     - consumed_credits em credit_purchases (source_type='purchase')

2. ⏳ **Atualização do Frontend**
   - `ShipmentForm.tsx`: Usar nova função
   - `QuickShipmentForm.tsx`: Usar nova função
   - `Shipments.tsx`: Usar nova função para importação

3. ⏳ **Atualização de Cálculos**
   - `getAvailableCredits()`: Calcular via `credit_usage`
   - `getUsedCredits()`: Calcular via `credit_usage`

4. ⏳ **Remoção de `consumed_credits`**
   - Migration para remover coluna
   - Atualizar código que ainda usa

---

## 🎯 ARQUITETURA NOVA

### Fluxo de Consumo

```
Frontend → create-shipment-with-credit (Edge Function)
  ↓
1. Valida sessão
2. Verifica duplicata
3. Verifica créditos disponíveis:
   a. Mensais primeiro (via credit_usage WHERE source_type='monthly')
   b. Extras depois (via credit_usage WHERE source_type='purchase')
4. Chama RPC create_shipment_with_credit()
   ↓
   BEGIN TRANSACTION
     INSERT INTO shipments (...)
     INSERT INTO credit_usage (shipment_id, source_type, ...)
   COMMIT
   ↓
   Se erro → Rollback automático
   Se sucesso → Retorna shipment_id + créditos restantes
```

### Benefícios

- ✅ **Atomicidade**: Tudo ou nada
- ✅ **Rollback Automático**: Se shipment falhar, crédito não é consumido
- ✅ **Uma Fonte da Verdade**: `credit_usage` é único lugar de consumo
- ✅ **Auditoria Completa**: Cada consumo vinculado a um shipment
- ✅ **Prioridade Garantida**: Mensais sempre primeiro

---

## 📝 PRÓXIMOS PASSOS

### 1. Migração de Dados Históricos

```sql
-- Migrar shipments existentes para credit_usage (source_type='monthly')
INSERT INTO credit_usage (
  customer_id,
  shipment_id,
  tracking_code,
  credits_consumed,
  source_type,
  subscription_period_start,
  subscription_period_end
)
SELECT 
  s.customer_id,
  s.id,
  s.tracking_code,
  1,
  'monthly',
  sub.current_period_start,
  sub.current_period_end
FROM shipments s
JOIN subscriptions sub ON s.customer_id = sub.customer_id
WHERE sub.status = 'active'
  AND s.created_at >= sub.current_period_start
  AND s.created_at < sub.current_period_end
  AND NOT EXISTS (
    SELECT 1 FROM credit_usage cu WHERE cu.shipment_id = s.id
  );

-- Migrar consumed_credits para credit_usage (source_type='purchase')
-- (Mais complexo, precisa criar registros sem shipment_id)
```

### 2. Atualizar Frontend

**ShipmentForm.tsx**:
```typescript
// ANTES:
const creditResult = await consumeCredit(trackingCode);
if (!creditResult.success) return;
const { data: insertedData, error } = await supabase.from('shipments').insert(...);

// DEPOIS:
const { data, error } = await supabase.functions.invoke('create-shipment-with-credit', {
  body: { tracking_code, shipment_customer_id, auto_tracking }
});
if (error || !data.success) {
  // Tratar erro
}
// Shipment já criado e crédito consumido
```

### 3. Atualizar Cálculos

**getAvailableCredits()**:
```typescript
// Calcular via credit_usage
// Mensais: plan.monthly_credits - COUNT(credit_usage WHERE source_type='monthly' AND período)
// Extras: SUM(credit_purchases.credits_amount) - COUNT(credit_usage WHERE source_type='purchase')
```

### 4. Remover `consumed_credits`

```sql
ALTER TABLE credit_purchases DROP COLUMN consumed_credits;
```

---

## ⚠️ VALIDAÇÕES NECESSÁRIAS

Antes de fazer deploy completo:

1. ✅ Função RPC criada e testada
2. ✅ Edge function deployada
3. ⏳ Migração de dados históricos executada
4. ⏳ Frontend atualizado
5. ⏳ Cálculos atualizados
6. ⏳ Testes end-to-end

---

## 🧪 TESTES CRÍTICOS

1. **Consumo Mensal**: Criar shipment → deve criar registro em credit_usage com source_type='monthly'
2. **Consumo Extras**: Criar shipment sem mensais → deve criar com source_type='purchase'
3. **Rollback**: Tentar criar shipment inválido → nada deve ser criado
4. **Prioridade**: Com mensais + extras → deve consumir mensal primeiro
5. **Duplicata**: Tentar criar mesmo tracking_code → deve retornar erro

---

## 📊 STATUS ATUAL

- ✅ **Infraestrutura**: Pronta
- ✅ **Backend**: Função criada e deployada
- ⏳ **Dados**: Migração pendente
- ⏳ **Frontend**: Atualização pendente
- ⏳ **Testes**: Pendentes

**Próximo passo**: Atualizar frontend para usar nova função e depois executar migração de dados.

