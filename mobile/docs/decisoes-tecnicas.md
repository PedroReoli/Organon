# Decisões Técnicas — Organon Mobile

## 1. Framework principal: React Native + Expo

### Escolha
**React Native com Expo SDK 51+**

### Justificativa
- O projeto desktop já usa React. A curva de aprendizado é mínima.
- Expo abstrai configurações nativas (Android/iOS) sem sacrificar acesso a APIs nativas.
- `expo-sqlite`, `expo-file-system`, `expo-notifications` cobrem tudo que o Electron fazia via Node.js.
- EAS Build permite gerar APK/IPA em CI sem Mac local.
- Cross-platform: Android e iOS a partir do mesmo código.

### Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Capacitor (PWA wrapper) | Adaptar o DOM inteiro para mobile seria mais trabalho do que reimplementar. Performance ruim em listas longas. |
| Flutter | Linguagem diferente (Dart). Time já conhece React. |
| Native Android/Kotlin | Apenas Android, custo alto de manutenção paralela. |
| Tauri Mobile | Ainda experimental e com menos suporte de comunidade. |

---

## 2. Navegação: React Navigation 6

### Escolha
**@react-navigation/native + @react-navigation/drawer + @react-navigation/stack**

### Estrutura
```
RootDrawer
  └── screens de todas as telas (via Drawer Navigator)
        cada tela pode ter Stack interno para drill-down
```

O Drawer substitui a sidebar do desktop.
Ao abrir o hamburger, aparece o drawer lateral com:
- Campo de busca no topo
- Seções colapsáveis (Organização, Trabalho, Ferramentas, Conteúdo, Pessoal)
- Cada item leva direto à tela

Detalhes completos em [navegacao.md](navegacao.md).

---

## 3. Armazenamento local

### Escolha

| Tipo de dado | Solução |
|---|---|
| Dados estruturados (cards, eventos, hábitos, financeiro, CRM) | `expo-sqlite` (SQLite nativo) |
| Preferências e configurações simples | `@react-native-async-storage/async-storage` |
| Arquivos de notas (markdown) | `expo-file-system` |
| Arquivos importados (PDFs, imagens) | `expo-file-system` |

### Justificativa
- `expo-sqlite` substitui os arquivos JSON do desktop com consultas estruturadas e melhor performance.
- AsyncStorage para dados pequenos (settings, tema, navbar config).
- expo-file-system mantém a lógica de arquivos local sem depender de cloud.

### Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| WatermelonDB | Mais setup, overkill para o volume de dados atual |
| MMKV | Ótimo para key-value mas não estruturado |
| Realm | Licença e complexidade |

---

## 4. Estilização: NativeWind

### Escolha
**NativeWind v4** (Tailwind CSS para React Native)

### Justificativa
- O desktop usa Tailwind CSS. Manter a mesma linguagem de design reduz fricção.
- NativeWind compila classes Tailwind para StyleSheet nativo com bom desempenho.
- Dark mode nativo via `useColorScheme` + classes `dark:`.

### Alternativa considerada
- StyleSheet puro com design tokens — mais verboso, sem ganho real de manutenção.

---

## 5. Editor de texto (Notas)

### Escolha
**@10play/tentap-editor** ou **react-native-rich-editor**

O TipTap do desktop roda em WebView no ambiente web.
Para mobile precisamos de uma alternativa nativa ou WebView controlada.

### Opções em análise (decidir na implementação)
1. **WebView embutida com TipTap** — reutiliza o editor do desktop, com bridge nativa
2. **@10play/tentap-editor** — editor rico nativo baseado em TipTap
3. **react-native-rich-editor** — mais simples, menos features

Decisão final será tomada ao implementar a tela de Notas.

---

## 6. Drag-and-drop (Planner)

### Escolha
**react-native-reanimated + react-native-gesture-handler**

A base do dnd-kit (web) não funciona em React Native.
Reanimated + Gesture Handler é o padrão para interações gestuais fluidas em RN.

Para a grade do Planner (dias × períodos), a implementação usará:
- `react-native-draggable-flatlist` para listas reordenáveis
- Ou implementação manual com Gesture Handler para a grade 2D

---

## 7. Sync com Appwrite

### Escolha
Reutilizar a mesma integração Appwrite do desktop.

- SDK: `appwrite` (mesmo pacote, compatível com React Native)
- Mesma estratégia: local-first com sync opcional
- Mesmo projeto Appwrite, mesmas collections

O usuário pode optar por não fazer login e usar apenas local.

---

## 8. Notificações

### Escolha
**expo-notifications**

Substitui o sistema de notificações do Electron.
Suporta notificações locais agendadas (lembretes de eventos, hábitos).

---

## 9. Fontes e ícones

### Ícones
**@expo/vector-icons** (Feather Icons ou MaterialIcons)

O desktop usa ícones SVG inline e Lucide. Para mobile, @expo/vector-icons é o padrão Expo.

### Fontes
**expo-font** com Inter ou sistema nativo.

---

## 10. Build e distribuição

### Escolha
**Expo EAS Build**

- Gera APK (Android) e IPA (iOS) via CI sem necessidade de Mac local
- Integra diretamente com GitHub Actions
- Free tier disponível para projetos open source

Detalhes completos em [build-e-release.md](build-e-release.md).
