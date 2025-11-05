import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/integrations/supabase/types';

const SUPABASE_URL = "https://pvnwcxfnazwqpfasuztv.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!');
  console.log('\nPara executar este script, forneça a service role key:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui npx tsx scripts/get-active-customers.ts\n');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getActiveCustomers() {
  console.log('📊 Buscando clientes ativos e suas assinaturas...\n');

  // Buscar todos os clientes
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (customersError) {
    console.error('Erro ao buscar clientes:', customersError);
    return;
  }

  if (!customers || customers.length === 0) {
    console.log('Nenhum cliente encontrado.');
    return;
  }

  // Filtrar apenas clientes ativos (status null ou 'active')
  const activeCustomers = customers.filter(c => !c.status || c.status === 'active');

  console.log(`✅ Total de clientes encontrados: ${customers.length}`);
  console.log(`✅ Clientes ativos: ${activeCustomers.length}\n`);
  console.log('═'.repeat(80));

  // Para cada cliente ativo, buscar assinaturas e planos
  for (const customer of activeCustomers) {
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (subsError) {
      console.error(`Erro ao buscar assinaturas para ${customer.email}:`, subsError);
      continue;
    }

    console.log(`\n👤 Cliente: ${customer.name || 'Sem nome'}`);
    console.log(`   📧 Email: ${customer.email}`);
    console.log(`   📱 WhatsApp: ${customer.whatsapp_e164 || 'Não informado'}`);
    console.log(`   📅 Criado em: ${customer.created_at ? new Date(customer.created_at).toLocaleDateString('pt-BR') : 'N/A'}`);

    if (subscriptions && subscriptions.length > 0) {
      console.log(`   \n   📋 Assinaturas ativas: ${subscriptions.length}`);
      
      subscriptions.forEach((sub, index) => {
        const plan = sub.plans as any;
        console.log(`   \n   ${index + 1}. Plano: ${plan?.name || sub.plan_id}`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Créditos mensais: ${plan?.monthly_credits || 0}`);
        console.log(`      Período atual: ${sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString('pt-BR') : 'N/A'} até ${sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : 'N/A'}`);
        if (sub.cancel_at_period_end) {
          console.log(`      ⚠️  Cancelamento agendado para o fim do período`);
        }
      });
    } else {
      console.log(`   ⚠️  Sem assinaturas ativas`);
    }

    console.log('─'.repeat(80));
  }

  // Resumo geral
  console.log('\n\n📈 RESUMO GERAL:');
  console.log('═'.repeat(80));
  
  const { data: allSubs } = await supabase
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (allSubs) {
    const planCounts: Record<string, number> = {};
    allSubs.forEach(sub => {
      const plan = sub.plans as any;
      const planName = plan?.name || sub.plan_id;
      planCounts[planName] = (planCounts[planName] || 0) + 1;
    });

    console.log(`\nTotal de assinaturas ativas: ${allSubs.length}`);
    console.log('\nDistribuição por plano:');
    Object.entries(planCounts).forEach(([plan, count]) => {
      console.log(`  • ${plan}: ${count} cliente(s)`);
    });
  }

  console.log('\n');
}

getActiveCustomers().catch(console.error);
