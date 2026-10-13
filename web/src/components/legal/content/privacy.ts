import { REPO_URL } from '@/components/landing/site'
import type { LegalDocs } from '../types'

// Privacy policy (LGPD, Law 13.709/2018). Facts here must match the code: cookies (lib/session.ts, lib/gate.ts,
// lib/i18n/client.tsx), the audit log (rules-api AuditService), the public proof page and what goes on-chain (memo.py).

export const privacy: LegalDocs = {
  en: {
    title: 'Privacy policy',
    intro:
      'This policy explains what personal data Seamoney processes, why, with whom it is shared and what rights you have under Brazil’s General Data Protection Law (LGPD, Law 13.709/2018).',
    sections: [
      {
        id: 'controller',
        heading: 'Who is responsible',
        blocks: [`The Seamoney team is the controller of the personal data processed through the service. For privacy requests, contact the team through the project’s repository, ${REPO_URL}.`],
      },
      {
        id: 'data',
        heading: 'What we collect',
        blocks: [
          'On the website: there is no account and no form, and we use no analytics or advertising trackers. The hosting provider processes technical data (IP address, browser and the pages requested) to deliver the site and protect it from abuse. A cookie stores the language you choose.',
          'In the application, when you sign in:',
          {
            list: [
              'Account: your email, your company and your role. Your password is stored only as a one-way hash (bcrypt), never as plain text.',
              'Audit trail: sign-ins, failed sign-ins, company switches and every decision on orders and supplier wallets, with the time and the IP address it came from.',
              'Business data you enter: suppliers and their wallet addresses, invoices (number, amounts and items), orders and payment records.',
              'Invoice files you upload to be read by AI.',
            ],
          },
          'In the application without signing in, the data you enter stays in your browser’s local storage and is not sent to us.',
        ],
      },
      {
        id: 'purposes',
        heading: 'Why we use it',
        blocks: [
          {
            list: [
              'To provide the service you asked for: sign-in, orders, payments, reconciliation, proof and reports (LGPD, art. 7, V).',
              'To keep the service secure, prevent fraud and keep an audit trail of who did what (legitimate interest, art. 7, IX, and legal obligations, art. 7, II, where they apply).',
              'To remember your language (legitimate interest).',
            ],
          },
          'We do not sell personal data and do not use it for advertising.',
        ],
      },
      {
        id: 'blockchain',
        heading: 'What goes on the blockchain',
        blocks: [
          'Payments are recorded on public blockchains, where anyone can see them and nobody can delete them. What is recorded: the sending and receiving wallet addresses, the token, the amount, the time and the memo.',
          'The memo carries only an opaque order code. We never write the invoice number, the company’s name or personal data on the blockchain.',
        ],
      },
      {
        id: 'sharing',
        heading: 'Who we share it with',
        blocks: [
          {
            list: [
              'Google (Firebase and Google Cloud), which hosts the site and the application.',
              'Anthropic, the AI provider, when invoice reading is turned on: the invoice file is sent to it to extract the fields.',
              'The Tempo and Solana networks, with the public payment data described above.',
              'Public authorities, when the law or a court order requires it.',
            ],
          },
          'The proof page of a payment shows the supplier’s name, the invoice number, the amount and the wallet to anyone who has its link. Share that link only with your supplier.',
        ],
      },
      {
        id: 'transfer',
        heading: 'International transfer',
        blocks: ['Some of these providers process data outside Brazil, for example in the United States. These transfers follow the mechanisms of article 33 of the LGPD.'],
      },
      {
        id: 'retention',
        heading: 'How long we keep it',
        blocks: [
          {
            list: [
              'Account data and the audit trail: while the account is active, and afterwards for as long as the law requires.',
              'Data in the test environments: it may be erased at any time.',
              'Data in your browser’s local storage: until you clear it.',
              'Data on the blockchain: permanently, since public blockchains cannot be erased.',
            ],
          },
        ],
      },
      {
        id: 'security',
        heading: 'Security',
        blocks: [
          'Passwords are hashed with bcrypt. The session lives in a cookie that page scripts cannot read and that expires after one hour. Each company sees only its own data, roles limit what each person can do, and repeated failed sign-ins are blocked for a while.',
          'No system is completely secure. If you find a problem, please tell us through the contact above.',
        ],
      },
      {
        id: 'rights',
        heading: 'Your rights',
        blocks: [
          'Under article 18 of the LGPD you can ask us to confirm that we process your data; to access it; to correct it; to anonymize, block or delete data that is unnecessary or processed unlawfully; to port it; to know with whom we share it; and to withdraw consent where processing depends on it. You can also complain to the National Data Protection Authority (ANPD).',
          'Data already recorded on a public blockchain cannot be changed or deleted, by us or by anyone.',
        ],
      },
      {
        id: 'cookies',
        heading: 'Cookies and local storage',
        blocks: [
          'We use no third-party or advertising cookies. Only these:',
          {
            list: [
              'lang: the language you chose. Kept for one year.',
              'seamoney_api: your signed-in session in the application. Unreadable by page scripts; expires after one hour.',
              'seamoney_session: access to a private environment, when one is protected by a password. Expires after 12 hours.',
              'seamoney.demo (local storage): the data you enter in the application without signing in. It stays in your browser.',
            ],
          },
        ],
      },
      {
        id: 'children',
        heading: 'Children and teenagers',
        blocks: ['The service is meant for companies and is not directed to people under 18.'],
      },
      {
        id: 'changes',
        heading: 'Changes to this policy',
        blocks: ['When we change this policy we update the date at the top of this page and announce material changes on the site.'],
      },
    ],
  },
  pt: {
    title: 'Política de privacidade',
    intro:
      'Esta política explica quais dados pessoais a Seamoney trata, por quê, com quem eles são compartilhados e quais são os seus direitos pela Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).',
    sections: [
      {
        id: 'controller',
        heading: 'Quem é o responsável',
        blocks: [`O time da Seamoney é o controlador dos dados pessoais tratados pelo serviço. Para pedidos sobre privacidade, fale com o time pelo repositório do projeto, ${REPO_URL}.`],
      },
      {
        id: 'data',
        heading: 'O que coletamos',
        blocks: [
          'No site: não há conta nem formulário, e não usamos ferramentas de análise nem rastreadores de publicidade. O provedor de hospedagem trata dados técnicos (endereço IP, navegador e páginas pedidas) para entregar o site e protegê-lo de abuso. Um cookie guarda o idioma que você escolher.',
          'No aplicativo, quando você entra na conta:',
          {
            list: [
              'Conta: seu e-mail, sua empresa e seu papel. A senha fica guardada só como hash de mão única (bcrypt), nunca em texto puro.',
              'Trilha de auditoria: entradas, falhas de entrada, trocas de empresa e cada decisão sobre ordens e carteiras de fornecedor, com a hora e o endereço IP de origem.',
              'Dados de negócio que você informa: fornecedores e suas carteiras, faturas (número, valores e itens), ordens e registros de pagamento.',
              'Arquivos de fatura enviados para leitura por IA.',
            ],
          },
          'No aplicativo sem entrar na conta, os dados que você informa ficam no armazenamento local do seu navegador e não são enviados para nós.',
        ],
      },
      {
        id: 'purposes',
        heading: 'Para que usamos',
        blocks: [
          {
            list: [
              'Para prestar o serviço que você pediu: entrada na conta, ordens, pagamentos, conciliação, comprovante e relatórios (LGPD, art. 7º, V).',
              'Para manter o serviço seguro, prevenir fraude e guardar a trilha de quem fez o quê (legítimo interesse, art. 7º, IX, e obrigações legais, art. 7º, II, quando se aplicarem).',
              'Para lembrar o seu idioma (legítimo interesse).',
            ],
          },
          'Não vendemos dados pessoais e não os usamos para publicidade.',
        ],
      },
      {
        id: 'blockchain',
        heading: 'O que vai para a blockchain',
        blocks: [
          'Os pagamentos ficam registrados em blockchains públicas, onde qualquer pessoa pode vê-los e ninguém pode apagá-los. O que fica registrado: as carteiras de origem e de destino, o token, o valor, a hora e o memo.',
          'O memo leva só um código opaco da ordem. Nunca escrevemos na blockchain o número da fatura, o nome da empresa ou dados pessoais.',
        ],
      },
      {
        id: 'sharing',
        heading: 'Com quem compartilhamos',
        blocks: [
          {
            list: [
              'O Google (Firebase e Google Cloud), que hospeda o site e o aplicativo.',
              'A Anthropic, provedora de IA, quando a leitura de faturas está ligada: o arquivo da fatura é enviado a ela para extrair os campos.',
              'As redes Tempo e Solana, com os dados públicos de pagamento descritos acima.',
              'Autoridades públicas, quando a lei ou uma ordem judicial exigir.',
            ],
          },
          'A página de comprovante de um pagamento mostra o nome do fornecedor, o número da fatura, o valor e a carteira para quem tiver o link. Compartilhe esse link só com o seu fornecedor.',
        ],
      },
      {
        id: 'transfer',
        heading: 'Transferência internacional',
        blocks: ['Alguns desses provedores tratam dados fora do Brasil, por exemplo nos Estados Unidos. Essas transferências seguem os mecanismos do artigo 33 da LGPD.'],
      },
      {
        id: 'retention',
        heading: 'Por quanto tempo guardamos',
        blocks: [
          {
            list: [
              'Dados da conta e trilha de auditoria: enquanto a conta estiver ativa e, depois, pelo tempo que a lei exigir.',
              'Dados dos ambientes de teste: podem ser apagados a qualquer momento.',
              'Dados no armazenamento local do navegador: até você apagá-los.',
              'Dados na blockchain: para sempre, porque blockchains públicas não podem ser apagadas.',
            ],
          },
        ],
      },
      {
        id: 'security',
        heading: 'Segurança',
        blocks: [
          'As senhas são guardadas com bcrypt. A sessão fica num cookie que os scripts da página não leem e que expira em uma hora. Cada empresa vê só os próprios dados, os papéis limitam o que cada pessoa pode fazer e tentativas de entrada repetidas com erro ficam bloqueadas por um tempo.',
          'Nenhum sistema é totalmente seguro. Se encontrar um problema, avise-nos pelo contato acima.',
        ],
      },
      {
        id: 'rights',
        heading: 'Seus direitos',
        blocks: [
          'Pelo artigo 18 da LGPD, você pode pedir a confirmação de que tratamos seus dados; o acesso a eles; a correção; a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desacordo com a lei; a portabilidade; a informação sobre com quem compartilhamos; e a revogação do consentimento quando o tratamento depender dele. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
          'Dados já gravados numa blockchain pública não podem ser alterados nem apagados, por nós ou por ninguém.',
        ],
      },
      {
        id: 'cookies',
        heading: 'Cookies e armazenamento local',
        blocks: [
          'Não usamos cookies de terceiros nem de publicidade. Só estes:',
          {
            list: [
              'lang: o idioma que você escolheu. Guardado por um ano.',
              'seamoney_api: a sua sessão no aplicativo. Os scripts da página não o leem; expira em uma hora.',
              'seamoney_session: o acesso a um ambiente fechado, quando ele é protegido por senha. Expira em 12 horas.',
              'seamoney.demo (armazenamento local): os dados que você informa no aplicativo sem entrar na conta. Ficam no seu navegador.',
            ],
          },
        ],
      },
      {
        id: 'children',
        heading: 'Crianças e adolescentes',
        blocks: ['O serviço é feito para empresas e não se destina a menores de 18 anos.'],
      },
      {
        id: 'changes',
        heading: 'Mudanças nesta política',
        blocks: ['Quando mudarmos esta política, atualizamos a data no topo desta página e avisamos no site sobre mudanças relevantes.'],
      },
    ],
  },
}
