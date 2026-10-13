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
| `web/` | TypeScript, Next.js 16, Tailwind v4, React 19 | Só interface e leitura de fatura por IA. Sem banco, sem chaves. Proxy `/api/*` com lista de rotas permitidas, que repassa a sessão (JWT em cookie `httpOnly`) como `Authorization: Bearer`. |
| `rules-api/` | Java 21, Spring Boot 3.5, JdbcTemplate, PostgreSQL + Flyway | **Regras de negócio**: login e papéis, preço, ciclo de vida da ordem, reserva atômica do pagamento, conciliação, relatórios, auditoria. SQL em `store/` (`OrderRepository`, `UserRepository`). |
| `chain-service/` | Python 3.12, FastAPI, pytempo, web3 | **Blockchain** (Tempo testnet e Solana devnet): envia o pagamento com memo, busca transferências por memo, lê transações. Único estado: o arquivo de idempotência em `/app/data` (volume `chain-data`). Guarda a chave de teste. |

Fluxo: Navegador → web → rules-api (Java) → chain-service (Python) → Tempo. Só o `web` é publicado pelo `docker-compose.yml`. O Java chama o Python com o cabeçalho `X-Internal-Token`.

Regra da separação: **nenhuma regra de negócio no Python, nenhuma chamada de rede blockchain no Java.**

## Decisões técnicas que já foram tomadas

- Dinheiro sempre em **centavos inteiros**. Tarifa de 1% (100 bps, arredondamento half-up). Custo bancário assumido de 3%. Unidades do token = centavos x 10.000 (tokens TIP-20 têm 6 casas). Câmbio simulado 5,40 (`DEMO_USD_BRL`).
- Memo de 32 **bytes** (não caracteres). O memo é público na rede.
- Ordem: `pending_approval -> approved -> sending (reserva atômica) -> sent -> reconciled`, ou `rejected`/`cancelled` antes do envio (`V3`). A partir do limite (US$ 10.000, `APPROVAL_THRESHOLD_CENTS`) uma segunda pessoa aprova (`POST /api/orders/{id}/approve|reject|cancel`), nunca quem criou; abaixo dele a política aprova, salvo se a empresa já usa o registro de carteiras e o endereço não vem dele (fornecedor novo, ou nome que não bate): aí uma segunda pessoa aprova qualquer valor. O fornecedor é achado pelo nome sem diferenciar maiúsculas, espaços nem letras de largura total. A aprovação fica presa ao SHA-256 de valor, rede, carteira e memo, e o pagamento é recusado se não bater. Conciliação independente: achar o evento `TransferWithMemo` por destinatário e memo (preferindo o hash enviado, sem "escolher pelo valor"), e checar token, destinatário, valor, memo e recibo. O par (hash da transação, índice do log) só concilia uma ordem, garantido também por índice único no banco (`V2`).
- Memo = referência opaca da ordem (`SM-XXXXXXXX`, base32 de Crockford), **nunca o número da fatura**, no Java e no `/app`. O `POST /api/orders` aceita `reference` nesse formato (o `/app` manda a dele); sem ela o Java sorteia uma.
- Pagamento idempotente: o Java manda `Idempotency-Key: <id da ordem>-<tentativa>` ao Python. Depois de uma falha, consulta `GET /payments/{key}`: se o Python marcou `failed`, usa nova chave; senão (timeout) reusa a mesma, e o Python devolve o pagamento já feito em vez de pagar de novo. O Python **exige** o cabeçalho. Reenviar uma chave `pending` nunca paga de novo só porque a transação ainda não aparece na rede (ela pode ser minerada depois): o Python procura a transferência (referência + valor); achando, confirma; senão responde 409 enquanto a tentativa tem menos de `PAYMENT_PENDING_GRACE_SECONDS` (600 s) e depois a marca `failed`, para o Java usar chave nova. Reivindicar a chave e gravar o arquivo são operações atômicas. Uma ordem que ficou em `sending` (queda, erro ao gravar) é resolvida pela rede, nunca reenviando: `POST /api/orders/{id}/recover` (dono ou aprovador) e um job a cada minuto (`RECOVERY_ENABLED`).
- `amount_units` volta como **string** da API Python (passa do inteiro seguro do JavaScript).
- O cliente HTTP do Java usa **HTTP/1.1 forçado**: o upgrade h2c padrão do JDK é rejeitado pelo uvicorn e quebra todo POST.
- Rede: Tempo Moderato, chain id 42431, RPC `https://rpc.moderato.tempo.xyz`, explorer `https://explore.testnet.tempo.xyz/tx/<hash>`. Token de teste AlphaUSD `0x20c0000000000000000000000000000000000001`. A carteira se reabastece pelo faucet (`tempo_fundAddress`).
- Identidade: Multi-tenant implementado com isolamento no nível da aplicação (`organization_id` explícito nas consultas), já que RLS puro pelo Spring JDBC esbarra em complexidade de connection pooling.
- Segurança: Autenticação via JWT (HS256, 1 h) próprio com papéis (criar: Dono, Aprovador, Operador; pagar: Dono, Aprovador; CSV: Dono, Aprovador, Contador), limite de tentativas de login (em memória: 5 por e-mail e origem, 20 por e-mail e 30 por origem em 15 min; o web repassa o IP em `X-Forwarded-For`; associação inativa não entra nem renova o token) e `audit_log` com login, falha de login, troca de empresa e cada transição da ordem. `JWT_SECRET` é obrigatório (32+ caracteres; o Java não sobe sem ele). Na web o token fica só em cookie `httpOnly` (`seamoney_api`, `Secure` só quando a requisição chegou por HTTPS ou com `COOKIE_SECURE=true`: por HTTP puro o navegador descartaria o cookie e ninguém entraria); `/login` e `/api/session` (GET quem está logado, POST entrar, DELETE sair). Contas fictícias do seed: `porto.*@example.com` e `acme.*@example.com` (owner, approver, operator, accountant), senha `demo123`. O seed só roda com o perfil `demo` (padrão do compose); `SEED_DEMO=false` desliga.
- Banco de Dados: PostgreSQL via Flyway (`V1` a `V5`; nunca edite uma migração já aplicada, crie a próxima). Os testes Java rodam em H2 no modo PostgreSQL (não Testcontainers): diferenças de dialeto só aparecem no Docker e no e2e.
- Interface em inglês por padrão, português pelo seletor (cookie `lang`). Textos em `web/src/lib/i18n/dict.ts`.

## Interface e identidade visual

O visual segue o mockup do time (azul-marinho profundo, acentos teal e menta, ações em verde). Não simplifique: a interface precisa manter a identidade do mockup (fontes, navios, logo e slogan). Exceção: o SaaS demo em `/app` tem linguagem própria (veja a seção dele abaixo).

- Fontes: **Plus Jakarta Sans** (títulos, números, botões) e **Inter** (texto), empacotadas com `@fontsource-variable/*` (nada de CDN em runtime).
- Tokens (cores, raios, sombras, animações) em `web/src/app/globals.css`, bloco `@theme`. Verde de ação `brand-600` (#078060) passa em contraste AA com texto branco; não clareie.
- Logo e slogan: o logo foi vetorizado dos arquivos do time (`web/src/lib/brand-paths.ts`, componentes `Logo` e `LogoMark` em `ui.tsx`; SVGs em `web/public/brand/`). Slogan, pitch e fechamento em `dict.ts` (`brand.tagline`, `brand.pitch`, `brand.closing`); o slogan em português é do time, a tradução em inglês é nossa.
- Navios: `ShipScene.tsx` é uma cena vetorial feita à mão (navio com a marca no funil, guindastes, porto ao fundo, reflexo na água). Substitui fotografia; se o time trouxer fotos com licença, troque por `next/image` mantendo os gradientes escuros por cima do texto.
- Essa identidade (Plus Jakarta Sans e Inter) vale hoje só para a calculadora (`/calculator`) e o 404. A página pública de prova (`/proof/[id]`) usa a folha do `/app` (`ProofSheetView`, a mesma do comprovante do navegador), preenchida pelo Java (empresa, carteira, bloco, as 5 verificações) e conferida na rede na hora. Cuidado com `hidden` + `inline-flex` na mesma classe (o `inline-flex` vence): use `max-md:hidden`.
- Acessibilidade: foco visível, rótulos em todo campo, respeita `prefers-reduced-motion` (as animações do navio e das ondas param).
- Para mexer na interface sem Java/Python/Docker: `node web/scripts/mock-rules.mjs` (porta 8089) e `RULES_API_URL=http://localhost:8089 npm run dev`. Só para desenvolver, nunca para demonstração.

### Landing page (`web/src/app/page.tsx`, `web/src/components/landing/`)

Exceção decidida pelo time: a landing tem tipografia própria, o resto do app continua com Plus Jakarta Sans e Inter.

- Tipografia de carta náutica, onde terra vai em romano e água em itálico: **Funnel Display** (títulos e números, pesos leves, 300 a 400), **Instrument Serif itálico** (as palavras entre `*asteriscos*` nos títulos do `dict.ts`, renderizadas por `Rich` em `landing/type.tsx`, em verde-água `aqua`; no capítulo de papel, verde `brand-600`), **Newsreader** (serifa de texto, só no texto corrido; botões e menu usam Funnel Display) e **Geist Mono** (bytes, hashes e rótulos). A Funnel Sans foi trocada pela Newsreader porque o time a achou genérica. O texto de apoio de cada capítulo não é parágrafo cinza: é `landing/lede/Lede.tsx`, em Funnel Display leve no tamanho de subtítulo, com `*asteriscos*` em itálico e `{glifos}` no meio da frase (o próprio objeto citado: `{memo}` vira o chip SM-7K3QX9PA, `{bytes}` os 32 bytes, `{route}`, `{hops}`, `{check}`, `{five}`, `{event}`, `{sim}`; ver `lede/glyphs.tsx`). As palavras acendem uma a uma na rolagem (no hero, ao subir o loader). Importadas só em `page.tsx`. Tokens em `globals.css` (`--font-grotesk`, `--font-accent`, `--font-text`, `--font-data`; cores `abyss`, `night`, `tide`, `foam`, `paper`, `paper-hi`, `signal`); a classe `.lp` troca as fontes. Tamanhos e estilos compartilhados em `landing/type.tsx` (`displayXL`, `displayL`, `lede`, `label`, `mono`, `ChapterTag`). O casco e os contêineres da cena 3D usam as mesmas fontes (`voyage/scene/livery.ts`).
- O visual anterior (letras gordas e largas, largura das letras esticando na animação, serifa "mole" no texto, grão animado por cima da página) foi rejeitado pelo time como feio. Não volte a ele.
- Uma viagem em capítulos: cena WebGL do navio (`voyage/`, three.js carregado sob demanda) com os 32 contêineres do memo (um por byte, mesma codificação de `chain-service/app/memo.py`, ver `lib/memo.ts` e o teste); mapa da rota bancária (`routemap/`, projeção no servidor com d3-geo); conciliação no papel com carimbo (`reconcile/`); economia (`savings/`: dois tickets comparam o que a transferência bancária e a rota perdem no caminho, só com os números do projeto, 3% assumido e a tarifa de 1%; depois somem e a calculadora entra no mesmo quadro fixo, como o capítulo de papel; números vindos da API Java); final com o navio partindo. O capítulo da declaração de carga (real x simulado) foi removido a pedido do time por ter texto demais; desde 12/10/2026, por decisão do usuário, a landing só diz o que é simulado (o câmbio) no roadmap do dossiê (fase "Agora", `lp.biz.phase.now.what`): hero, calculadora, tickets, final, capítulo das regras e rodapé não levam mais o rótulo, e a faixa `TestnetBanner` não aparece em `/`. O `/app` continua rotulado.
- Movimento: GSAP (ScrollTrigger, SplitText, ScrambleText) + Lenis, tudo via `useScrollScene` em `landing/motion.ts`. Títulos sobem linha a linha de dentro de máscaras (`Reveal.tsx`; o texto vem do servidor e funciona sem JavaScript); rótulos dos capítulos se decodificam em hex (`Scramble.tsx`); o loader mostra os 32 contêineres vistos de cima e dispara `REVEAL_EVENT` ao subir; colchetes de HUD seguem o memo na cena 3D (`voyage/cargo/MemoFrame.tsx`, projeção em `voyage/scene/memoBounds.ts`); a câmera se inclina na direção do mouse; o capítulo de papel entra como uma folha de cantos arredondados. Respeita `prefers-reduced-motion` (cortes secos, sem rolagem animada). Para gravar o vídeo numa máquina com animações desligadas no sistema, abra `/?motion=full`.
- O memo da landing é o **código opaco da ordem** (`SM-7K3QX9PA`), como no Java e no `/app`; a fatura de exemplo `INV-2026-0845` aparece só no papel (capítulo de conciliação) e no CSV, fora da rede. Dados de exemplo num lugar só: `landing/sample.ts`. No capítulo 01, o botão "Emitir outro código" sorteia um código novo (`lib/demo/codes.ts`) e recarrega os contêineres; não há mais campo para digitar a fatura.
- Depois da economia vem o dossiê (`landing/dossier/`): 06 As redes (por que Tempo e Solana, com links da documentação oficial e os tempos de confirmação medidos por nós), 07 As regras (capítulo de papel: Lei 14.478/2022, Decreto 11.563/2023, Lei 14.286/2021, Resoluções BCB 519/520, 521 e 561, cada uma com o texto oficial e o que significa para a Seamoney; aviso de que não é parecer jurídico) e 08 O negócio (modelo, mercado com Comex Stat e metas do G20/FSB, o mínimo antes de dinheiro real, roadmap e documentação). Fontes e links em `dossier/facts.ts`, lidos em 11/10/2026; o texto em `dict.ts` (`lp.net.*`, `lp.law.*`, `lp.biz.*`). Custos do projeto, retorno e uso de investimento não estão no site: dependem de números do time.
- Se o WebGL falhar, entra o `ShipScene` vetorial como fundo.
- Desempenho do 3D: todo aparelho usa o nível `low` (`voyage/scene/quality.ts`), decisão do usuário em 11/10/2026: comparando, a diferença visual para o `high` era pequena e a de desempenho, grande. Um governador (`governor.ts`) reduz a resolução, depois o reflexo, depois o bloom, se os frames passarem de ~22 ms. A cena roda no máximo a 60 fps, a sombra só é redesenhada a cada poucos frames (ou a cada frame enquanto algo se move) e o ruído do mar e do céu vem de uma textura pré-calculada (`noise.ts`). Para comparar os níveis num aparelho: `/?quality=medium` ou `/?quality=high`.
- A página em si é `landing/LandingPage.tsx`, usada por `app/page.tsx` (Next) e pelo build estático `web/landing-static/` (Vite: `npm run build:landing`). O estático é o que está publicado em https://getseamoney.web.app (Firebase Hosting, plano gratuito; `firebase deploy --only hosting` na raiz já roda o build). Ele não tem backend: `landing/site.ts` (`STATIC_SITE`) troca os botões do painel pelo link do repositório, e a calculadora faz a conta no navegador com `lib/demo/pricing.ts` (cópia do `Pricing.java`; `useLocalComparison` em `lib/useComparison.ts`). `next/link` e `next/navigation` são substituídos por shims em `landing-static/shims/`; não importe nada só de servidor nos componentes da landing. O `firebase.json` também tem o bloco `apphosting` para subir o Next completo pelo App Hosting, que exige o plano Blaze.

## O app (`/app`)

Único app do produto (o primeiro protótipo `/dashboard` e o seu `/login` foram removidos em 11/10/2026; `next.config.ts` redireciona os links antigos para `/app` e `/app/login`). Com a pilha Docker no ar, a entrada `/app/login` mostra primeiro o **login real** com o serviço de regras (`LiveSignIn.tsx`, contas `porto.*@example.com`, senha `demo123`): ao entrar, a pessoa senta à mesa como o membro de mesmo papel (`demo.connect`) e a liquidação no Tempo passa a ser na testnet. Abaixo dele (ou sozinho, sem backend) fica a demo offline: escolher uma pessoa, liquidação simulada, tudo no navegador (localStorage), sem chaves. As pessoas, fornecedores e o histórico continuam fictícios nos dois modos. O modelo segue o "Plano do backend do protótipo real" do time (versão de 10/10 noite, com Tempo e Solana): tabela de permissões por papel (Dono, Aprovador, Operador, Contador; o Operador cria e propõe carteiras mas não envia), carteira do fornecedor versionada por rede e aprovada por outra pessoa, uma ordem ativa por fatura, leitura por IA só vale com revisão humana, aprovação presa ao SHA-256 dos dados (inclui rede e versão da carteira), memo = referência opaca da ordem (`SM-XXXXXXXX`, nunca o número da fatura), envio com reserva atômica, conciliação automática com cinco verificações e caso de revisão (`in_review`) quando uma falha, cancelamento antes do envio. O landing aponta para `/app`. A prova de um pagamento na testnet abre a página pública `/proof/<proofId>` (servidor, conferida na rede, abre em qualquer navegador; `proofId` = id da ordem + assinatura HMAC de 128 bits, `PROOF_SECRET`: o id da ordem sozinho não abre nada); a de um simulado fica em `/app/proof/<id>`, só neste navegador (`proofHref` em `lib/demo/selectors.ts`).

- Dados e regras: `web/src/lib/demo/` (`types`, `pricing` espelha `Pricing.java`, `rules` são funções puras, `seed`, `store`, `settle`). Testes em `pricing.test.ts` e `rules.test.ts` (rodam no `npm test`). Mudou `Pricing.java`? Atualize `pricing.ts` junto.
- Liquidação: "simulada" por padrão (hash aleatório, rotulado, sem link de explorador). Em Configurações dá para escolher "Tempo testnet", que cria a ordem no Java (a referência opaca vai no campo `reference` e vira o memo; o número da fatura fica fora da rede) e paga de verdade pelo proxy `/api`. O login real em `/app/login` liga esse modo sozinho; sem sessão, Configurações mostra "Falta entrar" com o link. Só dono e aprovador pagam. Conectado, criar, aprovar, rejeitar e cancelar vão primeiro ao Java (as regras locais rodam antes, como ensaio), e `mergeLiveOrders` (`lib/demo/live.ts`, sincroniza ao abrir, a cada 8 s e no foco) traz o que outras pessoas fizeram em outros computadores: a operadora cria num computador e o aprovador vê, aprova e envia no dele. Fornecedores e carteiras também vivem no Java (`V4`, `/api/suppliers`): carteira nova ou trocada é proposta versionada, aprovada por outra pessoa (dono ou aprovador, nunca quem propôs), e um fornecedor do registro só recebe na carteira aprovada daquela rede. Na primeira sincronização de uma empresa com registro vazio, o navegador importa os fornecedores fictícios do seed (`/api/suppliers/import-demo`, só com o seed de demo ligado). O limite de aprovação é da empresa, no Java (`V5`, `GET/PUT /api/settings`, só o dono muda; sem valor, vale `APPROVAL_THRESHOLD_CENTS`), e o `/app` conectado salva e sincroniza por ali. Em Relatórios → Auditoria, conectado, aparece também o que o servidor registrou (`GET /api/audit`, dono, aprovador e contador: entradas, falhas de entrada dos e-mails da empresa, cada decisão sobre ordens e carteiras). A equipe (convites e papéis) ainda fica só no navegador. O modo testnet vale para as duas redes: Tempo Moderato e Solana devnet (carteiras Solana do seed são chaves públicas válidas de 32 bytes; explorer por rede em `lib/links.ts`).
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
node scripts/e2e.mjs http://localhost:3000 tempo   # ponta a ponta na testnet real (ou: solana). Com o portão ligado, exporte DEMO_SESSION_SECRET
```

Testes por serviço:

```bash
cd web && npm run typecheck && npm run lint && npm test
docker build --target test ./rules-api      # 83 testes Java (ou mvn verify com JDK 21 e Maven)
cd chain-service && pytest -q               # 45 testes offline
cd chain-service && python -m scripts.smoke # testnet real
```

Estado verificado em 12/10/2026: Java 83, Python 45, web 52 + lint passam (a CI roda também o tsc). O e2e na testnet do Tempo passou de novo em 12/10/2026, contra o Postgres, depois das correções da revisão (inclui a prova só com o link assinado); o da Solana não foi re-rodado. Num navegador automatizado, o `/app` conectado criou (operadora), aprovou e enviou (aprovador, outro navegador) na testnet do Tempo e na devnet da Solana, conciliou e abriu a prova pública. A pilha Docker (Postgres) passou o `scripts/e2e.mjs` na testnet real do Tempo: sem sessão 401, operador cria e não paga (403), aprovador paga com memo opaco, pagar de novo 409, conciliação com 5 verificações, prova, CSV e isolamento entre empresas. O mesmo e2e também passou na Solana devnet (`node scripts/e2e.mjs http://localhost:3000 solana`). O faucet automático da devnet costuma bloquear por limite de taxa: abasteça a carteira pagadora à mão em faucet.solana.com.

## Segredos

- `.env` e `chain-service/.env` guardam uma chave de **testnet**. Estão no `.gitignore`. **Nunca imprima, cole em chat nem faça commit.**
- `ANTHROPIC_API_KEY` é opcional (leitura de fatura por IA). Sem ela a tela entra em modo demo, rotulado. Modelo padrão: `claude-opus-5-5`. Nunca coloque a chave em arquivo versionado.

## O que ainda não foi verificado

- Leitura de fatura por IA com chave real.
- `mvn spring-boot:run` fora do Docker (os testes Java rodam pelo `docker build --target test`).
- Qualquer deploy em nuvem real e a execução do GitHub Actions (`.github/workflows/ci.yml`).
- Login existe (JWT), mas as contas do seed têm senha pública (`demo123`): qualquer demo acessível por outras pessoas precisa do portão (`DEMO_ACCESS_PASSWORD` e `DEMO_SESSION_SECRET`), senão qualquer um dispara pagamentos de testnet.
- O bloqueio de login e os limites de taxa (`checkRequestLimits` em `web/src/lib/gate.ts`: pedidos, extração, `/api/session` e `/unlock`, por IP e no total, porque `X-Forwarded-For` pode ser forjado se a porta ficar exposta) ficam em memória (somem ao reiniciar, não valem com várias instâncias).

## Próximo passo do produto: protótipo real

O plano completo (módulos, mapa de entidades, estrutura da chain, acesso individual, segurança, fases) está no documento "Plano do backend real" do time, que fica fora do repositório.

Resumo: monólito modular em Java com Postgres, migrações versionadas e isolamento por empresa; login por OIDC com papéis (Dono, Aprovador, Operador, Contador, Admin da plataforma); aprovação de quem não criou a ordem, presa ao hash dos dados; fila com outbox; no Python, chave de acesso com expiração e limite e leitor de eventos; memo = código opaco da ordem, nunca o número da fatura. A fase B1 (Postgres, JWT, várias empresas) e partes do B2 (segredo JWT obrigatório, memo opaco, idempotência Java→Python, índice único de crédito, auditoria das transições, e2e com login) já estão na base; o roteiro das fases B2 e B3 fica fora do repositório. O resto (carteiras versionadas, faturas, aprovação presa a hash, cotação com validade, ledger, outbox, caso de revisão, RLS) fica para depois da entrega.

O documento de apresentação do time (hackathon, projeto, roteiro) também fica fora do repositório.

## Convenções ao mexer no código

- Imite o estilo do arquivo ao redor: densidade de comentários, nomes e idioma.
- Mudou regra de dinheiro? Atualize `Pricing` e o `PricingTest`, e confira o texto da UI e do README.
- Mudou contrato entre Java e Python? Os testes com chain falsa não pegam problemas de transporte: rode `scripts/e2e.mjs`.
- Mantenha tudo o que é simulado rotulado como simulado.
- Antes de qualquer commit, confirme que nenhum `.env` entrou.
- Subagentes: sempre use o modelo **Haiku 5.5** (`model: "haiku"` na ferramenta Agent), nunca Opus. Decisão do time.
