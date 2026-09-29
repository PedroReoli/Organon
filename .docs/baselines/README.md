# Baselines reproduzíveis

Os perfis em `scripts/fixtures/storage/` definem seed e cardinalidades, não dados pessoais. O gerador determinístico materializa stores completos em memória; assim o repositório não carrega megabytes de JSON repetitivo.

Comandos:

```powershell
npm.cmd run test:storage:baseline
npm.cmd run benchmark:storage
```

O teste estrutural exige ordem crescente de bytes, commit íntegro e releitura das contagens para `small`, `medium` e `large`. O benchmark informa bytes lógicos e p50/p95/p99 de commit/load, mas não impõe limites de tempo no CI: hardware, antivírus e filesystem mudam a latência. Uma regressão só deve ser aceita ou rejeitada comparando execuções na mesma máquina e configuração.

Perfis atuais:

| Perfil | Cards | Notas | Reuniões | Uso |
|---|---:|---:|---:|---|
| small | 50 | 25 | 10 | desenvolvimento local |
| medium | 2.000 | 1.000 | 250 | usuário ativo |
| large | 10.000 | 5.000 | 1.000 | stress estrutural |

