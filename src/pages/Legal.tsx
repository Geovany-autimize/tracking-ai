import { useSearchParams, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

export default function Legal() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "privacy" ? "privacy" : "terms";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Documentos Legais</h1>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="terms" className="flex-1">Termos de Uso</TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1">Política de Privacidade</TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="mt-6 prose prose-sm dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold">Termos de Uso</h2>
            <p className="text-muted-foreground text-sm">Última atualização: 26 de fevereiro de 2026</p>

            <h3>1. Aceitação dos Termos</h3>
            <p>Ao acessar e utilizar a plataforma Tracking AI ("Plataforma"), operada pela Autimize (CNPJ: 40.204.528/0001-05), você concorda com estes Termos de Uso. Caso não concorde, não utilize a Plataforma.</p>

            <h3>2. Descrição do Serviço</h3>
            <p>A Tracking AI é uma plataforma de rastreamento logístico inteligente que oferece:</p>
            <ul>
              <li>Rastreamento automatizado de envios;</li>
              <li>Notificações automáticas via WhatsApp;</li>
              <li>Integração com ERPs e marketplaces;</li>
              <li>Painel de controle e relatórios analíticos.</li>
            </ul>

            <h3>3. Cadastro e Conta</h3>
            <p>Para utilizar a Plataforma, o usuário deve criar uma conta fornecendo informações verdadeiras e completas. O usuário é responsável por manter a confidencialidade de suas credenciais de acesso.</p>

            <h3>4. Planos e Pagamento</h3>
            <p>A Plataforma oferece planos com diferentes limites de créditos. O pagamento é processado por meio de parceiros de pagamento seguros. Os créditos adquiridos possuem validade conforme descrito no momento da compra.</p>

            <h3>5. Uso Aceitável</h3>
            <p>O usuário se compromete a:</p>
            <ul>
              <li>Não utilizar a Plataforma para fins ilegais;</li>
              <li>Não tentar acessar dados de outros usuários;</li>
              <li>Não realizar engenharia reversa ou modificar a Plataforma;</li>
              <li>Respeitar os limites de uso do seu plano contratado.</li>
            </ul>

            <h3>6. Propriedade Intelectual</h3>
            <p>Todo o conteúdo da Plataforma, incluindo marca, logotipos, textos e código-fonte, é de propriedade da Autimize e protegido pelas leis de propriedade intelectual.</p>

            <h3>7. Limitação de Responsabilidade</h3>
            <p>A Tracking AI não se responsabiliza por eventuais indisponibilidades temporárias, atrasos de transportadoras ou informações incorretas fornecidas por terceiros (transportadoras, ERPs, etc.).</p>

            <h3>8. Rescisão</h3>
            <p>O usuário pode cancelar sua conta a qualquer momento. A Autimize reserva-se o direito de suspender ou encerrar contas que violem estes Termos.</p>

            <h3>9. Alterações nos Termos</h3>
            <p>A Autimize pode atualizar estes Termos a qualquer momento, notificando os usuários por e-mail ou pela Plataforma.</p>

            <h3>10. Foro</h3>
            <p>Fica eleito o foro da Comarca de Goiânia/GO para dirimir quaisquer questões decorrentes destes Termos.</p>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6 prose prose-sm dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold">Política de Privacidade</h2>
            <p className="text-muted-foreground text-sm">Última atualização: 26 de fevereiro de 2026</p>

            <h3>1. Introdução</h3>
            <p>A Autimize ("nós") está comprometida com a proteção dos dados pessoais dos usuários da plataforma Tracking AI, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).</p>

            <h3>2. Dados Coletados</h3>
            <p>Coletamos os seguintes dados:</p>
            <ul>
              <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone/WhatsApp;</li>
              <li><strong>Dados de uso:</strong> logs de acesso, interações com a plataforma;</li>
              <li><strong>Dados de envio:</strong> códigos de rastreamento, informações de destinatários;</li>
              <li><strong>Dados de pagamento:</strong> processados por terceiros (Stripe), não armazenamos dados de cartão.</li>
            </ul>

            <h3>3. Finalidade do Tratamento</h3>
            <p>Utilizamos seus dados para:</p>
            <ul>
              <li>Prestação do serviço de rastreamento e notificações;</li>
              <li>Comunicação sobre atualizações e novidades;</li>
              <li>Melhoria contínua da plataforma;</li>
              <li>Cumprimento de obrigações legais.</li>
            </ul>

            <h3>4. Compartilhamento de Dados</h3>
            <p>Seus dados podem ser compartilhados com:</p>
            <ul>
              <li>APIs de rastreamento para consulta de status dos envios;</li>
              <li>Processadores de pagamento (Stripe);</li>
              <li>Serviços de comunicação (WhatsApp Business API);</li>
              <li>Autoridades competentes, quando exigido por lei.</li>
            </ul>

            <h3>5. Armazenamento e Segurança</h3>
            <p>Os dados são armazenados em servidores seguros com criptografia. Utilizamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou destruição.</p>

            <h3>6. Direitos do Titular</h3>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul>
              <li>Acessar seus dados pessoais;</li>
              <li>Corrigir dados incompletos ou desatualizados;</li>
              <li>Solicitar a exclusão dos seus dados;</li>
              <li>Revogar o consentimento;</li>
              <li>Portabilidade dos dados.</li>
            </ul>

            <h3>7. Cookies</h3>
            <p>Utilizamos cookies essenciais para o funcionamento da plataforma e cookies analíticos para melhorar a experiência do usuário.</p>

            <h3>8. Retenção de Dados</h3>
            <p>Os dados são mantidos enquanto a conta estiver ativa ou conforme necessário para cumprir obrigações legais. Após a exclusão da conta, os dados serão removidos em até 30 dias.</p>

            <h3>9. Contato</h3>
            <p>Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato:</p>
            <ul>
              <li><strong>E-mail:</strong> contato@tracking-ai.com.br</li>
              <li><strong>Endereço:</strong> Av. 85, 2054, Setor Marista, Goiânia/GO, 74160-010</li>
            </ul>

            <h3>10. Alterações</h3>
            <p>Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas por e-mail ou pela Plataforma.</p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
