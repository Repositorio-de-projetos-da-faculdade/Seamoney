import { REPO_URL } from '@/components/landing/site'
import type { LegalDocs } from '../types'

// Terms of use. Facts here must match the product: networks, fee (Pricing.java), roles and what is not offered yet.

export const terms: LegalDocs = {
  en: {
    title: 'Terms of use',
    intro:
      'These terms govern your use of the Seamoney website and application (together, “the service”). By using the service you agree to them. If you do not agree, please do not use it.',
    sections: [
      {
        id: 'service',
        heading: 'What Seamoney is',
        blocks: [
          'Seamoney is software that helps Brazilian importers pay suppliers abroad with stablecoins. It prices each order, reads the invoice, sends the payment with an opaque order code in the transfer memo, reconciles the payment against the blockchain and produces a proof page for the supplier and reports for the accountant.',
          'Seamoney is not a bank, a foreign exchange institution or a virtual asset service provider, and it does not hold customer funds.',
        ],
      },
      {
        id: 'stage',
        heading: 'Where the service runs today',
        blocks: [
          'For now the service runs only on test networks (the Tempo testnet and the Solana devnet), with test tokens that have no monetary value. Do not send real funds to any address shown in the service.',
          'The exchange from reais to dollars is not offered yet. It will only be offered through an institution authorized by the Banco Central do Brasil, after legal validation. The roadmap on the home page shows what comes next.',
        ],
      },
      {
        id: 'accounts',
        heading: 'Who may use it, and accounts',
        blocks: [
          'The service is meant for companies. You must be at least 18 years old and authorized to act for the company you use it for.',
          {
            list: [
              'Keep your password secret. You are responsible for what is done with your account.',
              'Roles limit what each person can do: owners and approvers can send payments; operators create orders and propose supplier wallets; accountants read and export.',
              'The company’s owner is responsible for granting and removing access for its team.',
            ],
          },
        ],
      },
      {
        id: 'duties',
        heading: 'Your responsibilities',
        blocks: [
          {
            list: [
              'Enter accurate data: invoices, amounts and supplier wallets.',
              'Review every field read from an invoice by AI before approving a payment.',
              'Confirm a supplier’s wallet address with the supplier through a separate channel before approving it.',
              'Comply with the laws that apply to your imports and foreign exchange, including Law 14.286/2021, the rules of the Banco Central do Brasil and tax and customs rules.',
              'Do not use the service for unlawful purposes, money laundering, terrorist financing or sanctions evasion.',
              'Do not try to access other companies’ accounts or data, or to disrupt or overload the service.',
            ],
          },
        ],
      },
      {
        id: 'blockchain',
        heading: 'Blockchain payments',
        blocks: [
          'Payments are recorded on public blockchains. Once confirmed, they cannot be reversed by Seamoney or by anyone else. A payment sent to a wrong address cannot be recovered by us.',
          'The memo of each payment is public. Seamoney writes only an opaque order code there, never the invoice number. The availability, speed and fees of each network depend on the network, not on Seamoney.',
        ],
      },
      {
        id: 'estimates',
        heading: 'Estimates and information',
        blocks: [
          'Figures from the calculator, the fee comparison and the savings are estimates, not quotes or offers. The bank cost of 3% is an assumption, and taxes such as IOF are not included.',
          'What the site says about laws and regulations is our reading of the official texts, with links to them. It is not legal, tax or financial advice.',
        ],
      },
      {
        id: 'fees',
        heading: 'Fees',
        blocks: [
          'The route fee is 1% of each payment, shown before the payment is approved. While the service runs on test networks, no real money is charged.',
        ],
      },
      {
        id: 'third-parties',
        heading: 'Third-party services',
        blocks: [
          'The service depends on third parties: the Tempo and Solana networks and their explorers, Google Firebase for hosting and, when invoice reading is turned on, Anthropic as the AI provider. Their own terms apply to them, and we are not responsible for their availability.',
        ],
      },
      {
        id: 'ip',
        heading: 'Intellectual property and your data',
        blocks: [
          'The Seamoney name, logo and site content belong to their authors. The source code is in a public repository, under the terms stated there.',
          'The data you enter remains yours. You allow us to process it only to provide the service, as described in the privacy policy.',
        ],
      },
      {
        id: 'availability',
        heading: 'Availability and changes to the service',
        blocks: [
          'The service is in development and is provided as it is. We may change, suspend or end features at any time. Data in the test environments may be reset without notice.',
        ],
      },
      {
        id: 'liability',
        heading: 'Limitation of liability',
        blocks: [
          'To the extent the law allows, and without limiting rights you have under the Consumer Defense Code where it applies, Seamoney is not liable for indirect damages or lost profits, for losses caused by inaccurate data you entered, or for failures of networks and services run by third parties.',
        ],
      },
      {
        id: 'suspension',
        heading: 'Suspension',
        blocks: ['We may suspend or close accounts that break these terms or put the service, other customers or third parties at risk.'],
      },
      {
        id: 'changes',
        heading: 'Changes to these terms',
        blocks: [
          'When we change these terms we update the date at the top of this page, and we announce material changes on the site. Using the service after a change means you accept the new terms.',
        ],
      },
      {
        id: 'law',
        heading: 'Governing law',
        blocks: ['These terms are governed by the laws of Brazil. Disputes go to the Brazilian courts, following the rules on jurisdiction that apply.'],
      },
      {
        id: 'contact',
        heading: 'Contact',
        blocks: [`Questions about these terms: write to the team through the project’s repository, ${REPO_URL}.`],
      },
    ],
  },
  pt: {
    title: 'Termos de uso',
    intro:
      'Estes termos regem o uso do site e do aplicativo da Seamoney (juntos, “o serviço”). Ao usar o serviço, você concorda com eles. Se não concordar, por favor não use o serviço.',
    sections: [
      {
        id: 'service',
        heading: 'O que é a Seamoney',
        blocks: [
          'A Seamoney é um software que ajuda importadoras brasileiras a pagar fornecedores no exterior com stablecoins. Ela precifica cada ordem, lê a fatura, envia o pagamento com um código opaco da ordem no memo da transferência, concilia o pagamento com a blockchain e gera a página de comprovante para o fornecedor e os relatórios para o contador.',
          'A Seamoney não é banco, instituição de câmbio nem prestadora de serviços de ativos virtuais, e não guarda recursos de clientes.',
        ],
      },
      {
        id: 'stage',
        heading: 'Onde o serviço roda hoje',
        blocks: [
          'Por enquanto o serviço roda só em redes de teste (a testnet do Tempo e a devnet da Solana), com tokens de teste sem valor monetário. Não envie recursos reais para nenhum endereço mostrado no serviço.',
          'O câmbio de reais para dólares ainda não é oferecido. Ele só será oferecido por meio de uma instituição autorizada pelo Banco Central do Brasil, depois de validação jurídica. O roadmap na página inicial mostra os próximos passos.',
        ],
      },
      {
        id: 'accounts',
        heading: 'Quem pode usar, e contas',
        blocks: [
          'O serviço é feito para empresas. Você precisa ter pelo menos 18 anos e estar autorizado a agir em nome da empresa para a qual o usa.',
          {
            list: [
              'Mantenha sua senha em segredo. Você responde pelo que for feito com a sua conta.',
              'Os papéis limitam o que cada pessoa pode fazer: donos e aprovadores enviam pagamentos; operadores criam ordens e propõem carteiras de fornecedor; contadores leem e exportam.',
              'O dono da empresa é responsável por dar e retirar o acesso da equipe.',
            ],
          },
        ],
      },
      {
        id: 'duties',
        heading: 'Suas responsabilidades',
        blocks: [
          {
            list: [
              'Informar dados corretos: faturas, valores e carteiras de fornecedores.',
              'Revisar cada campo lido de uma fatura por IA antes de aprovar um pagamento.',
              'Confirmar o endereço da carteira com o fornecedor por outro canal antes de aprová-la.',
              'Cumprir as leis que valem para as suas importações e para o câmbio, incluindo a Lei 14.286/2021, as normas do Banco Central do Brasil e as regras tributárias e aduaneiras.',
              'Não usar o serviço para fins ilícitos, lavagem de dinheiro, financiamento do terrorismo ou para driblar sanções.',
              'Não tentar acessar contas ou dados de outras empresas, nem atrapalhar ou sobrecarregar o serviço.',
            ],
          },
        ],
      },
      {
        id: 'blockchain',
        heading: 'Pagamentos na blockchain',
        blocks: [
          'Os pagamentos ficam registrados em blockchains públicas. Depois de confirmados, não podem ser revertidos pela Seamoney nem por ninguém. Um pagamento enviado a um endereço errado não pode ser recuperado por nós.',
          'O memo de cada pagamento é público. A Seamoney escreve nele só um código opaco da ordem, nunca o número da fatura. A disponibilidade, a velocidade e as taxas de cada rede dependem da rede, não da Seamoney.',
        ],
      },
      {
        id: 'estimates',
        heading: 'Estimativas e informações',
        blocks: [
          'Os números da calculadora, da comparação de tarifas e da economia são estimativas, não cotações nem ofertas. O custo bancário de 3% é uma premissa, e tributos como o IOF não estão incluídos.',
          'O que o site diz sobre leis e normas é a nossa leitura dos textos oficiais, com links para eles. Não é aconselhamento jurídico, tributário nem financeiro.',
        ],
      },
      {
        id: 'fees',
        heading: 'Tarifas',
        blocks: [
          'A tarifa da rota é de 1% de cada pagamento, mostrada antes de o pagamento ser aprovado. Enquanto o serviço roda em redes de teste, nenhum valor real é cobrado.',
        ],
      },
      {
        id: 'third-parties',
        heading: 'Serviços de terceiros',
        blocks: [
          'O serviço depende de terceiros: as redes Tempo e Solana e seus exploradores, o Google Firebase para hospedagem e, quando a leitura de faturas está ligada, a Anthropic como provedora de IA. Os termos de cada um valem para eles, e não respondemos pela disponibilidade deles.',
        ],
      },
      {
        id: 'ip',
        heading: 'Propriedade intelectual e seus dados',
        blocks: [
          'O nome, o logo e o conteúdo do site da Seamoney pertencem aos seus autores. O código-fonte está num repositório público, nos termos indicados nele.',
          'Os dados que você informa continuam seus. Você nos autoriza a tratá-los só para prestar o serviço, como descrito na política de privacidade.',
        ],
      },
      {
        id: 'availability',
        heading: 'Disponibilidade e mudanças no serviço',
        blocks: [
          'O serviço está em desenvolvimento e é oferecido no estado em que se encontra. Podemos mudar, suspender ou encerrar funcionalidades a qualquer momento. Os dados dos ambientes de teste podem ser apagados sem aviso.',
        ],
      },
      {
        id: 'liability',
        heading: 'Limitação de responsabilidade',
        blocks: [
          'Na medida em que a lei permite, e sem limitar direitos que você tenha pelo Código de Defesa do Consumidor quando ele se aplicar, a Seamoney não responde por danos indiretos ou lucros cessantes, por perdas causadas por dados incorretos informados por você, nem por falhas de redes e serviços operados por terceiros.',
        ],
      },
      {
        id: 'suspension',
        heading: 'Suspensão',
        blocks: ['Podemos suspender ou encerrar contas que descumpram estes termos ou ponham em risco o serviço, outros clientes ou terceiros.'],
      },
      {
        id: 'changes',
        heading: 'Mudanças nestes termos',
        blocks: [
          'Quando mudarmos estes termos, atualizamos a data no topo desta página e avisamos no site sobre mudanças relevantes. Continuar usando o serviço depois de uma mudança significa aceitar os novos termos.',
        ],
      },
      {
        id: 'law',
        heading: 'Lei aplicável',
        blocks: ['Estes termos seguem as leis do Brasil. Disputas vão para a Justiça brasileira, conforme as regras de competência aplicáveis.'],
      },
      {
        id: 'contact',
        heading: 'Contato',
        blocks: [`Dúvidas sobre estes termos: fale com o time pelo repositório do projeto, ${REPO_URL}.`],
      },
    ],
  },
}
