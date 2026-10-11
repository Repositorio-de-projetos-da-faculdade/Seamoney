# Seamoney Backend API

Este documento descreve o contrato da API do backend (rules-api) após a conclusão da Fase B1, com a aprovação de ordens por uma segunda pessoa já implementada, e inclui os endpoints planejados para a Fase B2. Será utilizado como referência para o frontend.

## Como Subir

Para rodar o backend localmente com o banco de dados PostgreSQL:

```bash
cp .env.example .env
# Preencha as variáveis necessárias (como JWT_SECRET, senhas do banco)
docker compose up --build
```

Isto subirá o PostgreSQL, o Chain Service e o Rules API.

## Variáveis de Ambiente (rules-api)

* `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Credenciais do banco PostgreSQL. O schema é criado e versionado pelo Flyway (`rules-api/src/main/resources/db/migration`).
* `JWT_SECRET`: Segredo usado para assinar tokens JWT (HS256). Obrigatório, com 32 caracteres ou mais. O serviço não sobe com o segredo ausente ou curto.
* `CHAIN_SERVICE_URL`: URL base do Python chain-service.
* `CHAIN_SERVICE_TOKEN`: Token interno de autorização.
* `DEMO_USD_BRL`: Taxa de câmbio simulada.
* `SEED_DEMO`: `false` desliga os dados de demo (padrão do perfil `demo`). Os dados só são criados quando o banco está vazio.
* `SPRING_PROFILES_ACTIVE`: Use `demo` (padrão do docker compose) para criar os dados de teste no startup.

## Credenciais de Demo (Fictícias)

Com o perfil `demo` ativo e `SEED_DEMO` ligado, o sistema cria duas empresas (Porto Claro Importadora e Acme Corp) e 4 usuários em cada (um por papel), somente quando o banco está vazio.
* Senha universal: `demo123`
* Emails Empresa 1: `porto.owner@example.com`, `porto.approver@example.com`, `porto.operator@example.com`, `porto.accountant@example.com`
* Emails Empresa 2: `acme.owner@example.com`, `acme.approver@example.com`, `acme.operator@example.com`, `acme.accountant@example.com`

**Nota sobre Segurança**: Estas credenciais são **FICTÍCIAS** e nunca devem ser usadas com valores reais ou em produção.

## Papéis (Roles)

* **OWNER**: Acesso total.
* **APPROVER**: Cria ordens, aprova, rejeita, cancela, envia pagamentos, concilia, exporta, vê auditoria.
* **OPERATOR**: Cria ordens, cancela as próprias (antes do envio) e concilia (não pode aprovar nem enviar pagamentos).
* **ACCOUNTANT**: Exporta o CSV e concilia.

Permissões por endpoint: criar ordem (OWNER, APPROVER, OPERATOR); aprovar e rejeitar (OWNER, APPROVER, nunca quem criou a ordem); pagar (OWNER, APPROVER; operador recebe 403); cancelar (OWNER, APPROVER em qualquer ordem; OPERATOR só na própria); conciliar (qualquer papel); CSV (OWNER, APPROVER, ACCOUNTANT).

**Aprovação:** ordens a partir de US$ 10.000 (`APPROVAL_THRESHOLD_CENTS`) ficam em `pending_approval` até uma segunda pessoa aprovar. Ordens abaixo do limite são aprovadas na criação (`approval.auto: true`). A aprovação fica presa ao SHA-256 de valor, rede, carteira do fornecedor e memo: se algum deles mudar, o pagamento responde 409.

**Ciclo de vida:** `pending_approval -> approved -> sending -> sent -> reconciled`, com `rejected` ou `cancelled` antes do envio (migração `V3__order_approval.sql`).

## Endpoints

Todas as requisições (exceto públicas) exigem o cabeçalho: `Authorization: Bearer <token_jwt>`

### Autenticação (Fase B1)

#### POST /api/auth/login (Público)
* **Corpo**: `{"email": "...", "password": "..."}`
* **Resposta (200)**: `{"token": "eyJ..."}` (JWT HS256, válido por 1 hora)
* **Erros**: 401 Unauthorized (credenciais inválidas). Depois de 5 tentativas falhas, o e-mail fica bloqueado por 15 minutos (controle em memória, zerado ao reiniciar o serviço).

#### POST /api/auth/refresh (Requer Token)
* **Descrição**: Renova o token ou troca a empresa ativa.
* **Corpo**: `{"organizationId": "nova_org_id"}` (opcional).
* **Resposta (200)**: `{"token": "..."}`
* **Erros**: 404 Not Found (usuário não tem acesso à empresa informada).

#### GET /api/auth/me (Requer Token)
* **Resposta (200)**: `{"id": "...", "email": "...", "organizationId": "...", "organizationName": "...", "role": "...", "organizations": [{"id": "...", "name": "...", "role": "..."}]}`

O token carrega a empresa e o papel do usuário. Toda consulta de ordens é filtrada pela empresa do token, então uma ordem de outra empresa responde 404 (e não aparece na listagem nem no CSV). Cada transição de status é gravada na tabela `audit_log`.

### Health & Públicos (Fase B1)

#### GET /api/health (Público)
* Retorna o status de saúde.

#### POST /api/compare (Público)
* Calculadora da landing page.
* **Corpo**: `{"monthlyUsd": 80000, "bankFeePct": 3.0}`
* **Resposta (200)**: `{"bankCents": ..., "routeCents": ..., "savingsCents": ..., "savingsShare": ..., "feeBps": 100}`

#### POST /api/leads (Público)
* Gravação de leads.
* **Corpo**: `{"email": "...", "monthlyUsd": 80000, "bankFeePct": 3.0, "country": "BR", "consent": true}`
* **Resposta (201)**: `{"ok": true}`

### Orders (Fase B1)

#### GET /api/orders (Qualquer Autenticado)
* Retorna as últimas ordens.
* **Resposta (200)**: `{"orders": [...]}`

#### POST /api/orders (OWNER, APPROVER, OPERATOR)
* Cria nova ordem de pagamento e cotação. Acima do limite de aprovação a ordem nasce em `pending_approval`; abaixo, em `approved`.
* **Corpo**: `{"supplierName": "...", "supplierCountry": "...", "supplierWallet": "...", "invoiceNumber": "...", "amountCents": 100000, "dueDate": "...", "extractionSource": "demo", "invoiceFilename": "...", "network": "tempo", "reference": "SM-XXXXXXXX"}`
* **Resposta** (campos da ordem além dos anteriores): `status`, `createdBy`, `createdRole`, `approval` `{by, role, at, dataHash, auto}` e `closure` `{by, role, at, reason}` (preenchido em rejeição ou cancelamento).
* `reference` é opcional e, se enviado, deve estar no formato `SM-` seguido de 8 caracteres Crockford base32 (sem I, L, O, U). Sem ele, o serviço gera uma referência. A referência é o memo on-chain: ela é opaca e **nunca** contém o número da fatura. O número da fatura (até 64 caracteres) fica somente no banco.
* **Resposta (201)**: `{"order": {...}}`
* **Erros**: 400 Bad Request (dados inválidos ou referência fora do formato), 409 Conflict (referência já usada).

#### GET /api/orders/{id} (Qualquer Autenticado)
* Retorna detalhes da ordem e seus eventos (timeline).
* **Resposta (200)**: `{"order": {...}, "events": [...]}`
* **Erros**: 404 Not Found (inclui ordem de outra empresa).

#### POST /api/orders/{id}/pay (OWNER, APPROVER)
* Inicia o pagamento on-chain (reserva atômica). Exige status `approved`. Cada tentativa usa a chave de idempotência `<orderId>-<tentativa>` enviada ao chain-service, que consulta `GET /payments/{key}` antes de enviar de novo; um pagamento já enviado não é duplicado.
* **Resposta (200)**: `{"order": {...}}`
* **Erros**: 403 Forbidden (operador ou contador), 404 Not Found, 409 Conflict (ordem não aprovada, já em progresso, já paga, ou hash de aprovação não confere com os dados atuais), 502 Bad Gateway (erro na chain).

#### POST /api/orders/{id}/approve (OWNER, APPROVER)
* Aprova a ordem em `pending_approval`. Quem criou a ordem não pode aprovar (403).
* **Resposta (200)**: `{"order": {...}}` com `status: approved` e `approval` preenchido (inclui `dataHash`).
* **Erros**: 403 Forbidden, 404 Not Found, 409 Conflict (não está pendente).

#### POST /api/orders/{id}/reject (OWNER, APPROVER)
* Corpo: `{"reason": "..."}`. O motivo é obrigatório (400 sem ele). Quem criou a ordem não pode rejeitar (403).
* **Resposta (200)**: `{"order": {...}}` com `status: rejected` e `closure` preenchido.
* **Erros**: 400 Bad Request (sem motivo), 403 Forbidden, 404 Not Found, 409 Conflict (não está pendente).

#### POST /api/orders/{id}/cancel (OWNER, APPROVER, OPERATOR)
* Corpo opcional: `{"reason": "..."}`. OWNER e APPROVER cancelam qualquer ordem; OPERATOR só a própria.
* Só é possível antes do envio: depois de `sending`, `sent` ou `reconciled`, responde 409.
* **Resposta (200)**: `{"order": {...}}` com `status: cancelled` e `closure` preenchido.
* **Erros**: 403 Forbidden, 404 Not Found, 409 Conflict (já enviada).

**Códigos de erro**: todas as respostas de erro vêm como `{"error": "...", "code": "..."}`, com os códigos `forbidden` (403), `bad_state` (409), `invalid` (400), `not_found` (404) e `chain` (502).

#### POST /api/orders/{id}/reconcile (Qualquer Autenticado)
* Tenta conciliar a ordem na chain. Retorna OK HTTP com status no corpo se houver falha de negócio.
* **Resposta (200)**: `{"ok": true/false, "order": {...}, "reason": "...", "checks": {...}}`
* A conciliação busca o evento `TransferWithMemo` por destinatário e memo e confere token, destinatário, valor, memo e recibo. Um par (hash da transação, índice do log) concilia uma única ordem (índice único no banco).
* **Erros**: 404 Not Found (inclui ordem de outra empresa), 409 Conflict (se ordem não estiver paga).

#### GET /api/proof/{id} (Público)
* Página de prova para o fornecedor.
* **Resposta (200)**: `{"order": {...}, "tx": {...}}`

### Insights & Relatórios (Fase B1)

#### GET /api/stats (Qualquer Autenticado)
* Retorna números agregados de ordens e uma série para a tela de Início.
* **Resposta (200)**: `{"stats": {...}, "series": [...]}`

#### GET /api/reports/orders (OWNER, APPROVER, ACCOUNTANT)
* Download de CSV com todas as ordens.
* **Resposta (200)**: Corpo em texto/csv.

### Fornecedores e carteiras versionadas (`/api/suppliers`)
Carteira nova ou trocada é uma proposta (`proposed`) até outra pessoa aprovar; ao aprovar uma versão, a anterior da mesma rede vira `revoked`. Uma ordem para um fornecedor do registro só vai para a carteira aprovada daquela rede (senão 400). Migração `V4__supplier_wallets.sql`.

* **GET /api/suppliers**: fornecedores do registro da empresa, com `wallets[]` = `{id, network, address, version, status, proposedBy, proposedRole, proposedAt, approvedBy, approvedRole, approvedAt}`. (Qualquer autenticado)
* **POST /api/suppliers**: `{"name", "country", "city", "port", "email", "wallet": {"network", "address"}}` cria o fornecedor com a primeira carteira como proposta. 201; 409 se já existe no registro; 400 com endereço inválido para a rede. (OWNER, APPROVER, OPERATOR)
* **POST /api/suppliers/{id}/wallets**: `{"network", "address"}` propõe nova versão (descarta uma proposta aberta na mesma rede). 409 se for o endereço já em uso. (OWNER, APPROVER, OPERATOR)
* **POST /api/suppliers/{id}/wallets/{walletId}/approve**: aprova; 403 para quem propôs ou outros papéis; 409 se já não é proposta. (OWNER, APPROVER)
* **POST /api/suppliers/{id}/wallets/{walletId}/reject**: recusa (aprovador) ou retira (quem propôs). (OWNER, APPROVER, OPERATOR)
* **POST /api/suppliers/import-demo**: lista de fornecedores com o histórico de carteiras; importa uma vez num registro vazio, só com o seed de demo ligado (o `/app` usa na primeira sincronização). (OWNER, APPROVER, OPERATOR)

### Configurações da empresa (`/api/settings`)
* **GET /api/settings**: `{"approvalThresholdCents", "feeBps", "bankFeePct", "usdBrl"}`. O limite é o da empresa; sem valor salvo, vale `APPROVAL_THRESHOLD_CENTS`. (Qualquer autenticado)
* **PUT /api/settings**: `{"approvalThresholdCents": 5000000}` muda o limite da empresa (0 a US$ 1.000.000). 403 para quem não é dono. (OWNER)

### Trilha de auditoria (`/api/audit`)
* **GET /api/audit?limit=200**: `{"entries": [{"id", "at", "actorEmail", "actorRole", "action", "entityType", "entityId", "before", "after"}]}`, mais recentes primeiro. Inclui entradas, falhas de entrada dos e-mails da empresa, troca de empresa, cada transição de ordem, carteiras e configurações. O IP fica só no banco. (OWNER, APPROVER, ACCOUNTANT)

### [PLANEJADO, NÃO IMPLEMENTADO] Ledger
* **GET /api/ledger**: Listagem de todas as movimentações on-chain de stablecoin conciliadas (Ledger). (Qualquer Autenticado)
