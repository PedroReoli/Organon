# Build e Release — Organon Mobile

## Visão geral

O build do app mobile é feito via **Expo EAS Build** (Expo Application Services).
A publicação de releases segue o mesmo modelo do desktop, via **GitHub Releases**,
com nomenclatura clara distinguindo builds mobile das builds desktop.

---

## Nomenclatura de releases

### Desktop (atual)
```
Organon v1.1.8 (abc1234)
Tag: v1.1.8
Arquivo: Organon-Setup-1.1.8.exe
```

### Mobile (novo)
```
Organon Mobile v1.0.0 (abc1234)
Tag: mobile-v1.0.0
Arquivo: Organon-Mobile-1.0.0.apk
```

Separação clara:
- Tags desktop: `v{versão}` (ex.: `v1.1.8`)
- Tags mobile: `mobile-v{versão}` (ex.: `mobile-v1.0.0`)
- Títulos das releases incluem "Mobile" explicitamente

---

## Versionamento

O app mobile tem sua própria versão, independente do desktop.
Arquivo de versão: `mobile/app.json`

```json
{
  "expo": {
    "name": "Organon Mobile",
    "slug": "organon-mobile",
    "version": "1.0.0",
    "android": {
      "versionCode": 1,
      "package": "com.organon.mobile"
    },
    "ios": {
      "bundleIdentifier": "com.organon.mobile",
      "buildNumber": "1"
    }
  }
}
```

A versão do desktop (`app.json` na raiz) e a versão mobile (`mobile/app.json`) evoluem de forma independente.

---

## EAS Build

### O que é
Expo EAS Build é um serviço de build na nuvem do Expo.
Compila o app React Native e gera:
- **Android**: `.apk` (instalação manual) ou `.aab` (Google Play)
- **iOS**: `.ipa` (distribuição via TestFlight ou App Store)

Para distribuição aberta (GitHub Releases), geramos **APK**.

### Configuração (mobile/eas.json)
```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

---

## GitHub Actions — Workflow de build mobile

Arquivo: `.github/workflows/mobile-release.yml`

### Triggers
- Push para `main` com mudanças em `mobile/**`
- Manual (`workflow_dispatch`) com opção de versão

### O que o workflow faz
1. Checkout do repositório
2. Setup do Node.js
3. Instala dependências do projeto mobile
4. Instala o Expo CLI e EAS CLI
5. Faz login no EAS com token (`EXPO_TOKEN`)
6. Dispara build Android (APK) via EAS
7. Faz download do APK gerado
8. Lê versão de `mobile/app.json`
9. Cria GitHub Release com tag `mobile-v{versão}`
10. Sobe o APK como artefato da release

### Secrets necessários no repositório
| Secret | Descrição |
|---|---|
| `EXPO_TOKEN` | Token de autenticação no Expo/EAS |
| `GITHUB_TOKEN` | Automático (já fornecido pelo GitHub Actions) |

### Como gerar o EXPO_TOKEN
1. Criar conta em [expo.dev](https://expo.dev)
2. Ir em Account Settings → Access Tokens
3. Criar token com permissão de build
4. Adicionar como secret no repositório GitHub

---

## Workflow YAML

```yaml
name: Organon Mobile Release

on:
  push:
    branches:
      - main
    paths:
      - 'mobile/**'
  workflow_dispatch:
    inputs:
      release_notes:
        description: 'Notas da release'
        required: false
        default: ''

permissions:
  contents: write

concurrency:
  group: mobile-release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  build-and-release:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: mobile/package-lock.json

      - name: Install dependencies
        working-directory: mobile
        run: npm ci

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build Android APK
        working-directory: mobile
        run: eas build --platform android --profile production --non-interactive --local --output ../release/organon-mobile.apk

      - name: Read version
        id: meta
        run: |
          VERSION=$(node -p "require('./mobile/app.json').expo.version")
          SHORT_SHA="${{ github.sha }}"
          SHORT_SHA="${SHORT_SHA:0:7}"
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "short_sha=$SHORT_SHA" >> $GITHUB_OUTPUT
          echo "tag=mobile-v$VERSION" >> $GITHUB_OUTPUT

      - name: Rename APK
        run: |
          mv release/organon-mobile.apk "release/Organon-Mobile-${{ steps.meta.outputs.version }}.apk"

      - name: Publish GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.meta.outputs.tag }}
          target_commitish: ${{ github.sha }}
          name: "Organon Mobile ${{ steps.meta.outputs.version }} (${{ steps.meta.outputs.short_sha }})"
          body: |
            ## Organon Mobile ${{ steps.meta.outputs.version }}

            Build para Android (APK).

            ### Como instalar
            1. Baixe o arquivo `.apk` abaixo
            2. No Android, ative "Instalar de fontes desconhecidas" nas configurações
            3. Abra o arquivo `.apk` para instalar

            ${{ github.event.inputs.release_notes }}
          generate_release_notes: true
          fail_on_unmatched_files: true
          files: |
            release/Organon-Mobile-${{ steps.meta.outputs.version }}.apk
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Pré-requisitos para o build funcionar

### 1. Conta Expo
Criar conta gratuita em [expo.dev](https://expo.dev).
O plano gratuito inclui builds limitados por mês (suficiente para open source).

### 2. Configurar EXPO_TOKEN
```
GitHub → Settings → Secrets and variables → Actions → New secret
Nome: EXPO_TOKEN
Valor: [token gerado no Expo]
```

### 3. Projeto registrado no Expo
Ao rodar `eas build` pela primeira vez localmente, o projeto é registrado automaticamente.
O `app.json` recebe um `extra.eas.projectId`.

---

## Build local (para desenvolvimento)

```bash
cd mobile

# Instalar dependências
npm install

# Rodar em desenvolvimento (Expo Go)
npx expo start

# Build local Android
eas build --platform android --profile preview --local

# Build local iOS (requer Mac)
eas build --platform ios --profile preview --local
```

---

## Diferença entre perfis de build

| Perfil | Uso | Tipo |
|---|---|---|
| `development` | Desenvolvimento com hot reload | APK com Expo Dev Client |
| `preview` | Testes internos | APK instalável |
| `production` | Release pública | APK otimizado |

---

## Página de Releases no GitHub

As releases ficam separadas visualmente:

```
Releases
├── Organon Mobile v1.0.0 (abc1234)   ← tag: mobile-v1.0.0
├── Organon Mobile v1.0.1 (def5678)   ← tag: mobile-v1.0.1
├── Organon v1.1.8 (ghi9012)          ← tag: v1.1.8  (desktop)
├── Organon v1.1.9 (jkl3456)          ← tag: v1.1.9  (desktop)
└── ...
```

Cada release mobile inclui:
- APK para download direto
- Instruções de instalação no corpo da release
- Changelog automático dos commits em `mobile/`
