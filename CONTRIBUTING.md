# Guia de Contribuição — Organon Desktop

Agradecemos o interesse em contribuir com o **Organon Desktop**! Para manter a qualidade e consistência da base de código, seguimos alguns padrões simples.

---

## 🛠️ Padrão de Commits (Conventional Commits)

Utilizamos o padrão de commits convencionais em português:

- `feat(escopo)`: Nova funcionalidade para o usuário.
- `fix(escopo)`: Correção de bug.
- `refactor(escopo)`: Refatoração de código sem alteração de comportamento.
- `style(escopo)`: Ajustes visuais, CSS ou formatação.
- `docs(escopo)`: Alterações na documentação.
- `test(escopo)`: Adição ou correção de testes.
- `chore(escopo)`: Atualização de dependências ou configurações de build.

### Exemplos:
- `feat(focus): adicionar opcao de pausa longa customizada no pomodoro`
- `fix(planner): corrigir ordenacao de cards no backlog semanal`
- `refactor(crm): otimizar carregamento dos contatos com virtualizacao`

---

## 💻 Fluxo de Trabalho com Git

1. Faça um Fork do projeto no GitHub.
2. Crie uma branch para sua funcionalidade ou correção:
   ```bash
   git checkout -b feat/minha-nova-funcionalidade
   ```
3. Realize suas alterações e teste localmente com:
   ```bash
   npm run build
   ```
4. Faça o commit das suas alterações:
   ```bash
   git commit -m "feat(planner): implementar nova visualizacao de sprint"
   ```
5. Envie para o seu repositório remoto:
   ```bash
   git push origin feat/minha-nova-funcionalidade
   ```
6. Abra um **Pull Request** detalhando as mudanças realizadas.

---

## 📐 Diretrizes de Código

- Escreva código legível, tipado e desacoplado em TypeScript.
- Evite variáveis `any`; use os tipos já declarados em `src/renderer/types`.
- Componentes visuais devem ser organizados em arquivos limpos com CSS Modules ou estilos isolados.
- Respeite a privacidade do usuário: nenhuma funcionalidade deve enviar dados do usuário a servidores externos sem consentimento explícito.
