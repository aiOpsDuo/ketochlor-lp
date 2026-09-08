# Apresentação

Controllers, DTOs, pipes de validação, guardas de autenticação. Nenhuma regra de negócio (ver SDD § Camadas e padrão arquitetural).

O módulo `health` (`../health`) fica fora desta pasta por não pertencer a nenhum domínio de negócio — é infraestrutura de operação do próprio processo da API, não uma capacidade do CMS. Os módulos de domínio futuros (`content`, `media`, `leads`, `auth`, `metadata`) terão seus controllers/DTOs/guardas aqui, ou em subpasta própria dentro de cada módulo — a decidir nas tarefas da fase `api` do plano.

Vazio nesta tarefa (`fundacao/scaffold-apps-api`).
