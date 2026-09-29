# Rollout progressivo e rollback

O arquivo executável `config/release-channel-policy.json` define dois canais:

- `canary`: versões `x.y.z-canary.n`, audiência interna e início sugerido em 10%;
- `stable`: versões `x.y.z`, promoção somente após os gates e início sugerido em 25%.

O updater escolhe `stable` por padrão e reconhece automaticamente versões canário. Builds também podem definir `ORGANON_UPDATE_CHANNEL=canary`; o valor é validado por allowlist. O canal canário aceita prerelease, o estável não. Downgrade automático permanece desabilitado.

## Promoção

1. Publicar número novo em canary.
2. Executar CI, audit, backup/restore, matriz Windows e soak físico.
3. Manter pelo menos o tempo indicado na política sem regressão crítica.
4. Publicar uma versão estável nova; nunca retirar e reutilizar uma versão quebrada.
5. Usar `stagingPercentage` do manifesto de update para aumentar a exposição por etapas.

## Rollback

Rollback é *forward fix*: pausar o rollout, preservar o artefato/evidência defeituosos e publicar uma versão numericamente superior contendo a correção ou revert. Downgrade silencioso pode reintroduzir incompatibilidade de schema e não é permitido.

Antes de baixar qualquer atualização, o app exige backup pré-update válido. O uninstall continua preservando o data root.

## Validação local

```powershell
npm.cmd run release:validate
node scripts/validate-release-policy.cjs --channel canary --version 6.24.0-canary.1
```

Esses comandos validam contrato e configuração; não publicam releases e não substituem a matriz de instalação física.

