import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Como conecto minha loja ou ERP?",
    answer: "O processo é simples e guiado. Após criar sua conta, você escolhe sua plataforma (Bling, Tiny, Shopify, Nuvemshop, etc.), insere as credenciais de API e pronto. Todo o processo leva menos de 10 minutos e temos documentação completa para cada integração.",
  },
  {
    question: "Posso usar apenas WhatsApp ou apenas e-mail?",
    answer: "Sim! Você tem controle total sobre os canais de notificação. Pode escolher enviar apenas por WhatsApp, apenas por e-mail, ou ambos. Também é possível configurar regras diferentes para cada etapa da jornada.",
  },
  {
    question: "Quais transportadoras são suportadas?",
    answer: "Suportamos as principais transportadoras do Brasil: Correios, Jadlog, Total Express, Azul Cargo, Sequoia, Loggi, entre outras. Também integramos com plataformas de frete como Melhor Envio. Se precisar de uma transportadora específica, entre em contato.",
  },
  {
    question: "Vocês cobram por mensagem enviada?",
    answer: "Não! Nossos planos são baseados em número de rastreios por mês, não em mensagens. Você pode enviar quantas notificações quiser para cada pedido sem custos adicionais. O que conta é o número de pedidos rastreados.",
  },
  {
    question: "Posso personalizar as mensagens?",
    answer: "Sim! Oferecemos templates completamente customizáveis tanto para WhatsApp quanto para e-mail. Você pode usar variáveis dinâmicas, adicionar sua marca, ajustar o tom de voz e criar diferentes mensagens para cada etapa da entrega.",
  },
  {
    question: "Tem contrato de fidelidade?",
    answer: "Não temos fidelidade. Nossos planos são mensais e você pode cancelar a qualquer momento com um único clique no painel. Se cancelar, você mantém acesso até o fim do período pago.",
  },
  {
    question: "É fácil cancelar?",
    answer: "Muito fácil! Basta ir em Configurações > Assinatura > Cancelar. Não pedimos motivo (mas adoraríamos saber para melhorar) e processamos imediatamente. Seus dados ficam disponíveis por 30 dias caso queira voltar.",
  },
  {
    question: "Vocês possuem API para integrações avançadas?",
    answer: "Sim! Oferecemos API REST completa e webhooks nos planos Pro e Enterprise. Com eles você pode integrar o TrackingAI com seus sistemas internos, criar automações personalizadas e construir experiências sob medida.",
  },
];

export const FAQ = () => {
  return (
    <section className="py-24 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-16 space-y-4 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold">
            Perguntas{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              frequentes
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Tudo que você precisa saber sobre o TrackingAI
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, idx) => (
            <AccordionItem
              key={idx}
              value={`item-${idx}`}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-6 data-[state=open]:border-primary/30 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <AccordionTrigger className="text-left font-semibold hover:no-underline py-6">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
