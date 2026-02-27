# Organon Mobile

Versão mobile do Organon — o mesmo app de produtividade local-first, reimaginado para celular.

> **Status:** Documentação e planejamento — código ainda não iniciado.
> Leia os docs abaixo antes de qualquer implementação.

---

## O que é

Organon Mobile traz as mesmas funcionalidades do app desktop (Electron + React) para Android e iOS.
Não é um port direto: a experiência foi repensada para os padrões e limitações de tela pequena.

O app mantém os mesmos pilares:
- **Local-first:** dados no dispositivo, sem dependência de nuvem
- **Contexto unificado:** planejamento, notas, hábitos, finanças, CRM e ferramentas em um único app
- **Clareza sobre complexidade:** UI focada em execução, não em features por features

---

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [docs/decisoes-tecnicas.md](docs/decisoes-tecnicas.md) | Stack escolhida, alternativas consideradas e justificativas |
| [docs/arquitetura.md](docs/arquitetura.md) | Arquitetura técnica do app mobile |
| [docs/navegacao.md](docs/navegacao.md) | Design do sistema de navegação (hamburger menu + busca) |
| [docs/telas.md](docs/telas.md) | Especificação de cada tela adaptada para mobile |
| [docs/build-e-release.md](docs/build-e-release.md) | Processo de build, CI/CD e publicação de releases |

---

## Stack resumida

- **React Native + Expo SDK 51+**
- **React Navigation 6** (Drawer + Stack)
- **expo-sqlite** para dados estruturados
- **expo-file-system** para arquivos e notas
- **Appwrite SDK** (mesma integração de nuvem opcional do desktop)
- **NativeWind** para estilização com Tailwind CSS
- **Expo EAS Build** para geração de APK/IPA e publicação

---

## Releases

Builds mobile são distribuídos via GitHub Releases com identificação clara:

```
Organon Mobile v1.0.0 (abc1234)
```

APKs disponíveis em: `Releases → [Mobile] Organon vX.X.X`

Veja detalhes em [docs/build-e-release.md](docs/build-e-release.md).

---

## Diferenças em relação ao desktop

| Aspecto | Desktop | Mobile |
|---|---|---|
| Navegação | Sidebar fixa | Drawer (hamburger menu) |
| Busca | Modal via Ctrl+K | Campo no drawer, sempre visível |
| Editor de texto | TipTap (web) | RN rich text (solução nativa) |
| Drag-and-drop | dnd-kit | react-native-reanimated + gesture handler |
| Armazenamento | Electron FS + JSON | expo-sqlite + expo-file-system |
| Notificações | Electron nativo | expo-notifications |
| Temas | CSS variables | NativeWind dark/light mode |
| Build | electron-builder | Expo EAS Build |

---

## Como rodar (futuro)

```bash
cd mobile
npm install
npx expo start
```

Para Android:
```bash
npx expo run:android
```

Para iOS:
```bash
npx expo run:ios
```
