# Seamoney Backend API

Este documento descreve o contrato da API do backend (rules-api) após a conclusão da Fase B1, e inclui os endpoints planejados para a Fase B2. Será utilizado como referência para o frontend.

## Como Subir

Para rodar o backend localmente com o banco de dados PostgreSQL:

```bash
cp .env.example .env
# Preencha as variáveis necessárias (como JWT_SECRET, senhas do banco)
docker compose up --build
```

Isto subirá o PostgreSQL, o Chain Service e o Rules API.

## Variáveis de Ambiente (rules-api)

* `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Credenciais do banco PostgreSQL.
* `JWT_SECRET`: Segredo usado para assinar tokens JWT (HS256). Obrigatório e deve ser longo/seguro.
* `CHAIN_SERVICE_URL`: URL base do Python chain-service.
* `CHAIN_SERVICE_TOKEN`: Token interno de autorização.
* `DEMO_USD_BRL`: Taxa de câmbio simulada.
* `SPRING_PROFILES_ACTIVE`: Use `demo` para habilitar a criação dos dados de teste no startup.

## Credenciais de Demo (Fictícias)

Com o perfil `demo` ativo, o sistema cria duas empresas e 4 usuários em cada (um por papel).
* Senha universal: `demo123`
* Emails Empresa 1: `porto.owner@example.com`, `porto.approver@example.com`, `porto.operator@example.com`, `porto.accountant@example.com`
* Emails Empresa 2: `acme.owner@example.com`, `acme.approver@example.com`, `acme.operator@example.com`, `acme.accountant@example.com`

**Nota sobre Segurança**: Estas credenciais são **FICTÍCIAS** e nunca devem ser usadas com valores reais ou em produção.

## Papéis (Roles)

* **OWNER**: Acesso total.
* **APPROVER**: Cria pagamentos, edita fornecedores, aprova ordens e carteiras, envia pagamentos, exporta, vê auditoria.
* **OPERATOR**: Cria pagamentos, edita fornecedores (mas não pode enviar nem aprovar).
* **ACCOUNTANT**: Apenas exporta e vê auditoria.

## Endpoints

Todas as requisições (exceto públicas) exigem o cabeçalho: `Authorization: Bearer <token_jwt>`

### Autenticação (Fase B1)

#### POST /api/auth/login (Público)
* **Corpo**: `{"email": "...", "password": "..."}`
* **Resposta (200)**: `{"token": "eyJ..."}`
* **Erros**: 401 Unauthorized (credenciais inválidas ou bloqueio temporário por tentativas).

#### POST /api/auth/refresh (Requer Token)
* **Descrição**: Atualiza o token ou troca a organização ativa.
* **Corpo**: `{"organizationId": "nova_org_id"}` (opcional).
* **Resposta (200)**: `{"token": "..."}`
* **Erros**: 404 Not Found (usuário não tem acesso à organização).

#### GET /api/auth/me (Requer Token)
* **Resposta (200)**: `{"id": "...", "organizationId": "...", "role": "..."}`

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
* Cria nova ordem de pagamento e cotação.
* **Corpo**: `{"supplierName": "...", "supplierCountry": "...", "supplierWallet": "...", "invoiceNumber": "...", "amountCents": 100000, "dueDate": "...", "extractionSource": "demo", "invoiceFilename": "...", "network": "tempo"}`
* **Resposta (201)**: `{"order": {...}}`
* **Erros**: 400 Bad Request (dados inválidos).

#### GET /api/orders/{id} (Qualquer Autenticado)
* Retorna detalhes da ordem e seus eventos (timeline).
* **Resposta (200)**: `{"order": {...}, "events": [...]}`
* **Erros**: 404 Not Found.

#### POST /api/orders/{id}/pay (OWNER, APPROVER)
* Inicia o pagamento on-chain (atomic claim).
* **Resposta (200)**: `{"order": {...}}`
* **Erros**: 404 Not Found, 409 Conflict (já em progresso), 502 Bad Gateway (erro na chain).

#### POST /api/orders/{id}/reconcile (Qualquer Autenticado)
* Tenta conciliar a ordem na chain. Retorna OK HTTP com status no corpo se houver falha de negócio.
* **Resposta (200)**: `{"ok": true/false, "order": {...}, "reason": "...", "checks": {...}}`
* **Erros**: 409 Conflict (se ordem não estiver paga).

#### GET /api/proof/{id} (Público)
* Página de prova para o fornecedor.
* **Resposta (200)**: `{"order": {...}, "tx": {...}}`

### Insights & Relatórios (Fase B1)

#### GET /api/stats (Qualquer Autenticado)
* Retorna dados para o dashboard.
* **Resposta (200)**: `{"stats": {...}, "series": [...]}`

#### GET /api/reports/orders (OWNER, APPROVER, ACCOUNTANT)
* Download de CSV com todas as ordens.
* **Resposta (200)**: Corpo em texto/csv.

### [PLANEJADO] Fase B2: Fornecedores, Ledger, Aprovação
Estes endpoints serão implementados na próxima fase.

* **GET /api/suppliers**: Listar fornecedores. (Qualquer Autenticado)
* **GET /api/suppliers/{id}**: Detalhes do fornecedor e suas carteiras versionadas. (Qualquer Autenticado)
* **POST /api/suppliers**: Criar novo fornecedor com proposta de carteira. (OWNER, APPROVER, OPERATOR)
* **POST /api/suppliers/{id}/wallets**: Propor nova carteira na rede. (OWNER, APPROVER, OPERATOR)
* **POST /api/suppliers/{id}/wallets/{walletId}/approve**: Aprovar uma carteira proposta. (OWNER, APPROVER)
* **POST /api/orders/{id}/approve**: Aprovação por uma segunda pessoa (amarrada a SHA-256). (OWNER, APPROVER)
* **POST /api/orders/{id}/cancel**: Cancelamento de ordem antes do envio. (OWNER, APPROVER)
* **GET /api/ledger**: Listagem de todas as movimentações on-chain de stablecoin conciliadas (Ledger). (Qualquer Autenticado)
