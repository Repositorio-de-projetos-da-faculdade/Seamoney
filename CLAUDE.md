# Seamoney: contexto para o Claude Code

Leia este arquivo antes de mexer em qualquer coisa. Ele resume o que o projeto é, o que é real e o que é simulado, e as regras que o time já decidiu.

## O que é

Importadoras brasileiras pequenas e médias pagam fornecedores na Ásia com stablecoins na rede **Tempo** (testnet Moderato). O sistema calcula o custo, lê a fatura (IA), envia o pagamento com a referência da fatura no memo de 32 bytes, concilia sozinho pelo evento on-chain, gera a página de prova para o fornecedor e o relatório CSV.

Feito para o hackathon Crypto World's Fair (Colosseum, trilha Tempo). Prazo: 12/10/2026 23:59 PT (03:59 de 13/10 em Brasília).

## Regra de honestidade (não negociável)

A perna reais para dólar é **simulada** (não há parceiro licenciado integrado). Isso precisa estar rotulado em toda tela, README e vídeo. Não invente números, parcerias ou estatísticas. Não afirme que o produto "move dinheiro real". A Resolução BCB 561 (em vigor desde 1/10/2026, art. 50) proíbe ativos virtuais na liquidação entre o provedor de eFX e a contraparte no exterior; a rota só vale com parceiro autorizado e validação jurídica.

## Arquitetura: três serviços

| Pasta | Linguagem | Responsabilidade |
|---|---|---|
| `web/` | TypeScript, Next.js 16, Tailwind v4, React 19 | Só interface e leitura de fatura por IA. Sem banco, sem chaves. Proxy `/api/*` com lista de rotas permitidas. |
| `rules-api/` | Java 21, Spring Boot 3.5, JdbcTemplate, SQLite | **Regras de negócio**: preço, ciclo de vida da ordem, reserva atômica do pagamento, conciliação, relatórios. Todo SQL fica em `store/OrderRepository`. |
| `chain-service/` | Python 3.12, FastAPI, pytempo, web3 | **Blockchain**: envia o pagamento com memo, busca transferências por memo, lê transações. Sem estado. Guarda a chave de teste. |

Fluxo: Navegador → web → rules-api (Java) → chain-service (Python) → Tempo. Só o `web` é publicado pelo `docker-compose.yml`. O Java chama o Python com o cabeçalho `X-Internal-Token`.

Regra da separação: **nenhuma regra de negócio no Python, nenhuma chamada de rede blockchain no Java.**

## Decisões técnicas que já foram tomadas

- Dinheiro sempre em **centavos inteiros**. Tarifa de 1% (100 bps, arredondamento half-up). Custo bancário assumido de 3%. Unidades do token = centavos x 10.000 (tokens TIP-20 têm 6 casas). Câmbio simulado 5,40 (`DEMO_USD_BRL`).
- Memo de 32 **bytes** (não caracteres). O memo é público na rede.
- Ordem: `quoted -> sending (reserva atômica) -> sent -> reconciled`. Conciliação independente: achar o evento `TransferWithMemo` por destinatário e memo, e checar token, destinatário, valor, memo e recibo. O par (hash da transação, índice do log) só concilia uma ordem.
- `amount_units` volta como **string** da API Python (passa do inteiro seguro do JavaScript).
- O cliente HTTP do Java usa **HTTP/1.1 forçado**: o upgrade h2c padrão do JDK é rejeitado pelo uvicorn e quebra todo POST.
- Rede: Tempo Moderato, chain id 42431, RPC `https://rpc.moderato.tempo.xyz`, explorer `https://explore.testnet.tempo.xyz/tx/<hash>`. Token de teste AlphaUSD `0x20c0000000000000000000000000000000000001`. A carteira se reabastece pelo faucet (`tempo_fundAddress`).
- Identidade: Multi-tenant implementado com isolamento no nível da aplicação (`organization_id` explícito nas consultas), já que RLS puro pelo Spring JDBC esbarra em complexidade de connection pooling.
- Segurança: Autenticação via JWT (HS256) próprio com papéis granulares mapeados da demo, limites de tentativa de login (em memória) e auditoria no nível de serviço.
- Banco de Dados: Migração do SQLite para PostgreSQL via Flyway e Testcontainers para testes de integração.
- Interface em inglês por padrão, português pelo seletor (cookie `lang`). Textos em `web/src/lib/i18n/dict.ts`.

## Interface e identidade visual

O visual segue o mockup do time (azul-marinho profundo, acentos teal e menta, ações em verde). Não simplifique: a interface precisa manter a identidade do mockup (fontes, navios, logo e slogan). Exceção: o SaaS demo em `/app` tem linguagem própria (veja a seção dele abaixo).

- Fontes: **Plus Jakarta Sans** (títulos, números, botões) e **Inter** (texto), empacotadas com `@fontsource-variable/*` (nada de CDN em runtime).
- Tokens (cores, raios, sombras, animações) em `web/src/app/globals.css`, bloco `@theme`. Verde de ação `brand-600` (#078060) passa em contraste AA com texto branco; não clareie.
- Logo e slogan: o logo foi vetorizado dos arquivos do time (`web/src/lib/brand-paths.ts`, componentes `Logo` e `LogoMark` em `ui.tsx`; SVGs em `web/public/brand/`). Slogan, pitch e fechamento em `dict.ts` (`brand.tagline`, `brand.pitch`, `brand.closing`); o slogan em português é do time, a tradução em inglês é nossa.
- Navios: `ShipScene.tsx` é uma cena vetorial feita à mão (navio com a marca no funil, guindastes, porto ao fundo, reflexo na água). Substitui fotografia; se o time trouxer fotos com licença, troque por `next/image` mantendo os gradientes escuros por cima do texto.
- Responsivo: sidebar no desktop, barra de abas embaixo no celular (`BottomNav`). Cuidado com `hidden` + `inline-flex` na mesma classe (o `inline-flex` vence): use `max-md:hidden`.
- Acessibilidade: foco visível, rótulos em todo campo, respeita `prefers-reduced-motion` (as animações do navio e das ondas param).
- Para mexer na interface sem Java/Python/Docker: `node web/scripts/mock-rules.mjs` (porta 8089) e `RULES_API_URL=http://localhost:8089 npm run dev`. Só para desenvolver, nunca para demonstração.

### Landing page (`web/src/app/page.tsx`, `web/src/components/landing/`)

Exceção decidida pelo time: a landing tem tipografia própria, o resto do app continua com Plus Jakarta Sans e Inter.

- Tipografia de carta náutica, onde terra vai em romano e água em itálico: **Funnel Display** (títulos e números, pesos leves, 300 a 400), **Instrument Serif itálico** (as palavras entre `*asteriscos*` nos títulos do `dict.ts`, renderizadas por `Rich` em `landing/type.tsx`, em verde-água `aqua`; no capítulo de papel, verde `brand-600`), **Newsreader** (serifa de texto, só no texto corrido; botões e menu usam Funnel Display) e **Geist Mono** (bytes, hashes e rótulos). A Funnel Sans foi trocada pela Newsreader porque o time a achou genérica. O texto de apoio de cada capítulo não é parágrafo cinza: é `landing/lede/Lede.tsx`, em Funnel Display leve no tamanho de subtítulo, com `*asteriscos*` em itálico e `{glifos}` no meio da frase (o próprio objeto citado: `{memo}` vira o chip INV-2026-0845, `{bytes}` os 32 bytes, `{route}`, `{hops}`, `{check}`, `{five}`, `{event}`, `{sim}`; ver `lede/glyphs.tsx`). As palavras acendem uma a uma na rolagem (no hero, ao subir o loader). Importadas só em `page.tsx`. Tokens em `globals.css` (`--font-grotesk`, `--font-accent`, `--font-text`, `--font-data`; cores `abyss`, `night`, `tide`, `foam`, `paper`, `paper-hi`, `signal`); a classe `.lp` troca as fontes. Tamanhos e estilos compartilhados em `landing/type.tsx` (`displayXL`, `displayL`, `lede`, `label`, `mono`, `ChapterTag`). O casco e os contêineres da cena 3D usam as mesmas fontes (`voyage/scene/livery.ts`).
- O visual anterior (letras gordas e largas, largura das letras esticando na animação, serifa "mole" no texto, grão animado por cima da página) foi rejeitado pelo time como feio. Não volte a ele.
- Uma viagem em capítulos: cena WebGL do navio (`voyage/`, three.js carregado sob demanda) com os 32 contêineres do memo (um por byte, mesma codificação de `chain-service/app/memo.py`, ver `lib/memo.ts` e o teste); mapa da rota bancária (`routemap/`, projeção no servidor com d3-geo); conciliação no papel com carimbo (`reconcile/`); economia (`savings/`: dois tickets comparam o que a transferência bancária e a rota perdem no caminho, só com os números do projeto, 3% assumido e a tarifa de 1%; depois somem e a calculadora entra no mesmo quadro fixo, como o capítulo de papel; números vindos da API Java); final com o navio partindo. O capítulo da declaração de carga (real x simulado) foi removido a pedido do time por ter texto demais; o rótulo do que é simulado continua no hero, na calculadora, no final e no rodapé.
- Movimento: GSAP (ScrollTrigger, SplitText, ScrambleText) + Lenis, tudo via `useScrollScene` em `landing/motion.ts`. Títulos sobem linha a linha de dentro de máscaras (`Reveal.tsx`; o texto vem do servidor e funciona sem JavaScript); rótulos dos capítulos se decodificam em hex (`Scramble.tsx`); o loader mostra os 32 contêineres vistos de cima e dispara `REVEAL_EVENT` ao subir; colchetes de HUD seguem o memo na cena 3D (`voyage/cargo/MemoFrame.tsx`, projeção em `voyage/scene/memoBounds.ts`); a câmera se inclina na direção do mouse; o capítulo de papel entra como uma folha de cantos arredondados. Respeita `prefers-reduced-motion` (cortes secos, sem rolagem animada). Para gravar o vídeo numa máquina com animações desligadas no sistema, abra `/?motion=full`.
- Se o WebGL falhar, entra o `ShipScene` vetorial como fundo.
- Desempenho do 3D: todo aparelho usa o nível `low` (`voyage/scene/quality.ts`), decisão do usuário em 11/10/2026: comparando, a diferença visual para o `high` era pequena e a de desempenho, grande. Um governador (`governor.ts`) reduz a resolução, depois o reflexo, depois o bloom, se os frames passarem de ~22 ms. A cena roda no máximo a 60 fps, a sombra só é redesenhada a cada poucos frames (ou a cada frame enquanto algo se move) e o ruído do mar e do céu vem de uma textura pré-calculada (`noise.ts`). Para comparar os níveis num aparelho: `/?quality=medium` ou `/?quality=high`.
- A página em si é `landing/LandingPage.tsx`, usada por `app/page.tsx` (Next) e pelo build estático `web/landing-static/` (Vite: `npm run build:landing`). O estático é o que está publicado em https://getseamoney.web.app (Firebase Hosting, plano gratuito; `firebase deploy --only hosting` na raiz já roda o build). Ele não tem backend: `landing/site.ts` (`STATIC_SITE`) troca os botões do painel pelo link do repositório, e a calculadora faz a conta no navegador com `lib/demo/pricing.ts` (cópia do `Pricing.java`; `useLocalComparison` em `lib/useComparison.ts`). `next/link` e `next/navigation` são substituídos por shims em `landing-static/shims/`; não importe nada só de servidor nos componentes da landing. O `firebase.json` também tem o bloco `apphosting` para subir o Next completo pelo App Hosting, que exige o plano Blaze.

## SaaS demo (`/app`)

Versão "produto" que roda **sem backend**: dados fictícios no navegador de cada visitante (localStorage), sem chaves. O modelo segue o "Plano do backend do protótipo real" do time (versão de 10/10 noite, com Tempo e Solana): tabela de permissões por papel (Dono, Aprovador, Operador, Contador; o Operador cria e propõe carteiras mas não envia), carteira do fornecedor versionada por rede e aprovada por outra pessoa, uma ordem ativa por fatura, leitura por IA só vale com revisão humana, aprovação presa ao SHA-256 dos dados (inclui rede e versão da carteira), memo = referência opaca da ordem (`SM-XXXXXXXX`, nunca o número da fatura), envio com reserva atômica, conciliação automática com cinco verificações e caso de revisão (`in_review`) quando uma falha, cancelamento antes do envio. O landing deste branch aponta para `/app`; o `/dashboard` continua sendo o protótipo real na testnet.

- Dados e regras: `web/src/lib/demo/` (`types`, `pricing` espelha `Pricing.java`, `rules` são funções puras, `seed`, `store`, `settle`). Testes em `pricing.test.ts` e `rules.test.ts` (rodam no `npm test`). Mudou `Pricing.java`? Atualize `pricing.ts` junto.
- Liquidação: "simulada" por padrão (hash aleatório, rotulado, sem link de explorador). Em Configurações dá para escolher "Tempo testnet", que cria a ordem no Java (com a referência opaca no campo da fatura, que vira o memo) e paga de verdade pelo proxy `/api` (só com a pilha do Docker no ar). Pagamentos na Solana são sempre simulados aqui: o adaptador ainda não está ligado ao Java.
- Visual: **a identidade da landing publicada** (getseamoney.web.app; o código da landing está em `web/src/components/landing/`), decisão do usuário em 10/10/2026. Mesmos tokens e nomes (`abyss`, `night`, `tide`, `foam`, `paper`, `paper-hi`, `paper-line`, `signal`) e a mesma tipografia: Funnel Display nos títulos e números (leve), palavras entre `*asteriscos*` no texto em Instrument Serif itálico (classe `desk-display`), Funnel Sans no texto, Geist Mono em rótulos e códigos. Barra lateral noturna recolhida em 72 px que abre sobre a página ao passar o mouse (ou com foco do teclado), com o trilho e o losango do ChapterRail da landing, relógios de Santos e Shenzhen e ícones Iconoir (`iconoir-react`; regras de abertura em `shell/reveal.ts`), folhas de papel quadradas (`Panel`), ações em pílula verde, âmbar com losango para tudo que é simulado (`Simulated`). A carta noturna (Natural Earth, `web/scripts/build-chart.mjs`) fica no Início. Kit em `web/src/components/app/kit/`, casca em `shell/`.
- Organização: Início (o que espera por você, a carta, números, atividade), Pagamentos (visões por vez de quem: esperando você, aguardando aprovação, prontos, em revisão, conciliados, todos; `/app/approvals` e `/app/reconciliation` redirecionam para elas), página do pagamento (próximo passo com os botões, caminho da ordem, painéis por pergunta: para onde vai, valores, o que é pago, na rede; ao lado aprovação, comprovante e histórico), Fornecedores (carteiras por rede e aprovações pendentes), Relatórios (resumo e trilha de auditoria), Equipe e Configurações.
- Textos: um arquivo por área em `web/src/lib/i18n/app/`, juntados no `dict.ts`.
- Todo dado simulado continua rotulado: a linha de status do cabeçalho diz em toda tela que nada movimenta dinheiro.

## Next.js 16

Esta versão tem mudanças que quebram o que você conhece. Leia `web/node_modules/next/dist/docs/` antes de escrever código (veja também `web/AGENTS.md`). `params` e `searchParams` são Promises. `cacheComponents` está desligado. Saída `standalone`.

## Como rodar e testar

```bash
cp .env.example .env            # preencha TEMPO_PARTNER_PRIVATE_KEY (carteira de TESTNET)
docker compose up --build       # abre em http://localhost:3000
node scripts/e2e.mjs            # ponta a ponta contra a testnet real: web -> Java -> Python -> chain
```

Testes por serviço:

```bash
cd web && npm run typecheck && npm run lint && npm test
cd rules-api && mvn verify                  # 27 testes; ou: docker build --target test ./rules-api
cd chain-service && pytest -q               # 15 testes offline
cd chain-service && python -m scripts.smoke # testnet real
```

Estado verificado: Java 27, Python 15, web 31 (inclui as regras e os relatórios do `/app`) + tsc + lint + next build passam; a pilha Docker foi testada ponta a ponta na testnet real (criar, pagar, pagar de novo bloqueado com 409, conciliar com 5 verificações, prova, CSV). Em 10/10 o `/app` em modo "Tempo testnet" também pagou e conciliou na testnet real com a referência opaca como memo.

## Segredos

- `.env` e `chain-service/.env` guardam uma chave de **testnet**. Estão no `.gitignore`. **Nunca imprima, cole em chat nem faça commit.**
- `ANTHROPIC_API_KEY` é opcional (leitura de fatura por IA). Sem ela a tela entra em modo demo, rotulado. Modelo padrão: `claude-opus-5-5`. Nunca coloque a chave em arquivo versionado.

## O que ainda não foi verificado

- Leitura de fatura por IA com chave real.
- `mvn spring-boot:run` fora do Docker (a máquina só tinha Java 8; o Dockerfile usa JDK 21).
- Qualquer deploy em nuvem real e a execução do GitHub Actions (`.github/workflows/ci.yml`).
- Não há login: a demo pública precisa de senha ou lista de IPs, porque qualquer pessoa poderia disparar pagamentos de testnet.

## Próximo passo do produto: protótipo real

O plano completo (módulos, mapa de entidades, estrutura da chain, acesso individual, segurança, fases) está no documento "Plano do backend real" do time, que fica fora do repositório.

Resumo: monólito modular em Java com Postgres, migrações versionadas e isolamento por empresa; login por OIDC com papéis (Dono, Aprovador, Operador, Contador, Admin da plataforma); aprovação de quem não criou a ordem, presa ao hash dos dados; fila com outbox; no Python, chave de acesso com expiração e limite e leitor de eventos; memo = código opaco da ordem, nunca o número da fatura. Só começar depois da entrega do hackathon.

O documento de apresentação do time (hackathon, projeto, roteiro) também fica fora do repositório.

## Convenções ao mexer no código

- Imite o estilo do arquivo ao redor: densidade de comentários, nomes e idioma.
- Mudou regra de dinheiro? Atualize `Pricing` e o `PricingTest`, e confira o texto da UI e do README.
- Mudou contrato entre Java e Python? Os testes com chain falsa não pegam problemas de transporte: rode `scripts/e2e.mjs`.
- Mantenha tudo o que é simulado rotulado como simulado.
- Antes de qualquer commit, confirme que nenhum `.env` entrou.
