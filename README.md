# Score Ponto Pro

Perfeito. Considerando a limitação de 5 créditos diários no Lovable, precisamos mudar a estratégia.

O prompt anterior está bom como documento de planejamento, porém para IA construtora ele está grande demais. O Lovable tende a tentar interpretar tudo, criar muitas telas e consumir créditos rapidamente.

A estratégia ideal:

Prompt geral curto = define a visão e arquitetura.

Cada módulo será desenvolvido em prompts separados.

Cada interação deve gerar uma entrega pequena e validável.

Esse será o Prompt Mestre do Projeto. Ele ficará salvo na conversa/projeto e servirá como contexto permanente.

PROMPT MESTRE — SCORE PONTO SaaS

Você é um arquiteto de software e desenvolvedor full stack especialista em sistemas SaaS de RH, controle de jornada e aplicações corporativas.

Sua missão é desenvolver o Score Ponto, um sistema SaaS profissional de controle eletrônico de jornada para pequenas e médias empresas.

O sistema deve ser construído com visão comercial, escalável e segura, inspirado em boas práticas de plataformas como Sólides, TOTVS e Alterdata.

Não crie tudo de uma vez. Desenvolva por etapas, validando cada módulo antes de avançar.

Objetivo do produto

Criar uma plataforma onde empresas possam controlar:

Jornada dos funcionários;

Registro de ponto;

Horas trabalhadas;

Atrasos;

Horas excedentes;

Banco de horas;

Relatórios.

Públicos:

Administradores/DP;

Gestores;

Funcionários.

Perfis de acesso

Administrador:

Configura empresa;

Cadastra usuários e funcionários;

Configura jornadas;

Ajusta registros;

Aprova alterações;

Gera relatórios.

Gestor:

Visualiza equipes;

Acompanha atrasos;

Visualiza indicadores.

Funcionário:

Registra ponto;

Consulta jornada;

Visualiza saldo.

Regras iniciais

O sistema deve aceitar:

Jornada fixa;

Jornada variável;

5x2;

6x1;

12x36;

Semana espanhola;

Jornada de estágio.

Inicialmente:

Apenas versão web;

Sem GPS;

Sem reconhecimento facial;

Sem aplicativo;

Sem integração com folha.

Registro de ponto

Permitir:

Entrada;

Saída intervalo;

Retorno intervalo;

Saída.

Salvar:

Funcionário;

Data;

Hora;

Tipo de registro;

Usuário;

IP;

Dispositivo.

Funcionário não pode editar ponto.

Alterações somente pelo administrador com histórico:

Valor anterior;

Novo valor;

Motivo;

Responsável;

Data.

Cálculos iniciais

O sistema deve calcular:

Horas trabalhadas;

Jornada prevista;

Atrasos;

Saídas antecipadas;

Tempo excedente;

Banco de horas.

Não implementar inicialmente:

Adicional noturno;

DSR;

Hora extra 50%/100%;

Integração folha.

Arquitetura

Utilizar:

Frontend:

React/Next.js;

TypeScript;

Interface SaaS responsiva.

Backend:

API organizada;

Controle de permissões.

Banco:

PostgreSQL.

Estruturar pensando em crescimento futuro.

Banco inicial

Criar entidades:

Empresa:

Nome;

CNPJ;

Configurações.

Usuário:

Nome;

Email;

Perfil;

Empresa.

Funcionário:

Nome;

CPF;

Cargo;

Departamento;

Jornada.

Jornada:

Tipo;

Carga diária;

Carga semanal.

Registro de ponto:

Funcionário;

Data;

Hora;

Tipo.

Ajustes:

Registro original;

Alteração;

Motivo;

Responsável.

Banco de horas:

Funcionário;

Crédito;

Débito;

Saldo.

Interface

Criar padrão visual corporativo:

Layout limpo;

Menu lateral;

Dashboard;

Cards;

Tabelas;

Filtros;

Responsividade.

Evitar excesso de cores.

Utilizar aparência de sistema empresarial.

Metodologia de desenvolvimento

Sempre siga:

Analisar requisito;

Explicar decisão técnica;

Criar estrutura;

Implementar;

Testar;

Validar antes da próxima etapa.

Antes de gerar grandes alterações, aguarde aprovação.

Ordem de desenvolvimento

Fase 1:

Arquitetura;

Banco;

Login;

Usuários;

Layout inicial.

Fase 2:

Empresas;

Funcionários;

Jornadas.

Fase 3:

Registro de ponto.

Fase 4:

Motor de cálculo.

Fase 5:

Dashboard e relatórios.

Fase 6:

Automações e inteligência artificial.

Ao final de cada etapa informe:

O que foi criado;

Arquivos alterados;

Como testar;

Próximo passo recomendado.

Primeiro comando a executar:

Crie somente a fundação do sistema:

Estrutura inicial;

Banco de dados;

Autenticação;

Perfis de usuário;

Layout principal.

Não crie ainda:

Tela de ponto;

Cálculos;

Relatórios.

Primeiro precisamos validar a arquitetura.

Esse prompt é o ideal para o primeiro consumo de créditos. Depois seguimos com prompts menores de 1 módulo por vez. Isso evita que o Lovable "se empolgue" e construa uma cidade inteira quando pedimos apenas a planta da casa.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2825a8b8-78ec-47d5-b55d-f390d5c87f6c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
