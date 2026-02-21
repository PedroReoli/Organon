import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  ArrowLeft,
  BookOpen,
  FolderTree,
  Layers,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '@/core/contexts/AuthContext';
import {
  usePlaybook,
  type PlaybookTemplateDetail,
  type PlaybookTemplateDialogo,
  type PlaybookTemplateListItem,
} from '@/core/hooks/usePlaybook';
import { AdminUIStyles } from '@/components/admin/ui';

const getSetorPadraoPorTipo = (tipo?: string): string | null => {
  if (!tipo) return null;
  if (tipo === '2') return 'Financeiro';
  if (tipo === '4') return 'Vendas';
  if (tipo === '3') return 'Administrativo';
  return null;
};

const processDialogoTexto = (texto: string): string => {
  let processed = texto;
  processed = processed.replace(/\\n/g, '\n');
  processed = processed.replace(/<br\s*\/?>/gi, '\n');
  processed = processed.replace(/<\/br>/gi, '\n');
  return processed;
};

const extrairVariaveisDialogo = (texto: string): string[] => {
  const encontradas = new Set<string>();
  const matches = texto.matchAll(/{([^{}]+)}/g);

  for (const match of matches) {
    const nome = (match[1] || '').trim();
    if (nome) {
      encontradas.add(nome);
    }
  }

  return Array.from(encontradas);
};

const aplicarVariaveisNoTexto = (
  texto: string,
  valores: Record<string, string>,
  variaveisNegrito: Record<string, boolean>,
): string =>
  texto.replace(/{([^{}]+)}/g, (_, variavel) => {
    const nome = String(variavel || '').trim();
    if (!nome) return '{}';
    const valorPreenchido = valores[nome];
    if (!valorPreenchido) return `{${nome}}`;
    return variaveisNegrito[nome] ? `**${valorPreenchido}**` : valorPreenchido;
  });

const normalizar = (valor: string): string =>
  valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const PlaybookPage: React.FC = () => {
  const { user } = useAuth();
  const setorPadraoNome = useMemo(() => getSetorPadraoPorTipo(user?.tipo), [user?.tipo]);
  const fallbackTemplates = useMemo(() => [], []);

  const {
    loadingCatalogo,
    loadingDetalhe,
    error,
    setorSelecionado,
    categoriaSelecionada,
    busca,
    setores,
    categoriasDisponiveis,
    templatesFiltrados,
    totalTemplatesCarregados,
    setSetorSelecionado,
    setCategoriaSelecionada,
    setBusca,
    obterDetalheTemplate,
  } = usePlaybook({
    fallbackTemplates,
    setorPadraoNome,
  });

  const [vista, setVista] = useState<'listagem' | 'pagina'>('listagem');
  const [detalhe, setDetalhe] = useState<PlaybookTemplateDetail | null>(null);
  const [dialogoAberto, setDialogoAberto] = useState<PlaybookTemplateDialogo | null>(null);
  const [valoresVariaveisDialogo, setValoresVariaveisDialogo] = useState<Record<string, string>>({});
  const [variaveisNegritoDialogo, setVariaveisNegritoDialogo] = useState<Record<string, boolean>>({});
  const [mensagemCopiada, setMensagemCopiada] = useState('');

  const abrirPlaybook = async (template: PlaybookTemplateListItem) => {
    const resultado = await obterDetalheTemplate(template);
    if (resultado) {
      setDetalhe(resultado);
      setVista('pagina');
    }
  };

  const voltarListagem = () => {
    setVista('listagem');
    setDetalhe(null);
    setDialogoAberto(null);
    setValoresVariaveisDialogo({});
    setVariaveisNegritoDialogo({});
    setMensagemCopiada('');
  };

  const textoDialogoBase = useMemo(
    () => (dialogoAberto ? processDialogoTexto(dialogoAberto.texto) : ''),
    [dialogoAberto],
  );

  const variaveisDialogo = useMemo(
    () => extrairVariaveisDialogo(textoDialogoBase),
    [textoDialogoBase],
  );

  const textoDialogoFinal = useMemo(
    () => aplicarVariaveisNoTexto(textoDialogoBase, valoresVariaveisDialogo, variaveisNegritoDialogo),
    [textoDialogoBase, valoresVariaveisDialogo, variaveisNegritoDialogo],
  );

  const abrirDialogo = (dialogo: PlaybookTemplateDialogo) => {
    const textoBase = processDialogoTexto(dialogo.texto);
    const variaveis = extrairVariaveisDialogo(textoBase);
    const valoresIniciais: Record<string, string> = {};
    const negritoInicial: Record<string, boolean> = {};
    variaveis.forEach((nome) => {
      valoresIniciais[nome] = '';
      negritoInicial[nome] = false;
    });

    setValoresVariaveisDialogo(valoresIniciais);
    setVariaveisNegritoDialogo(negritoInicial);
    setMensagemCopiada('');
    setDialogoAberto(dialogo);
  };

  const fecharDialogo = () => {
    setDialogoAberto(null);
    setValoresVariaveisDialogo({});
    setVariaveisNegritoDialogo({});
    setMensagemCopiada('');
  };

  const copiarMensagemFinal = async () => {
    if (!textoDialogoFinal.trim()) {
      setMensagemCopiada('Mensagem vazia para copiar.');
      return;
    }

    try {
      await navigator.clipboard.writeText(textoDialogoFinal);
      setMensagemCopiada('Mensagem copiada.');
    } catch {
      setMensagemCopiada('Nao foi possivel copiar automaticamente.');
    }
  };

  const templatesAgrupados = useMemo(() => {
    const grupos: Record<string, PlaybookTemplateListItem[]> = {};
    templatesFiltrados.forEach((t) => {
      const setor = t.setor || 'Sem setor';
      if (!grupos[setor]) grupos[setor] = [];
      grupos[setor].push(t);
    });
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [templatesFiltrados]);

  return (
    <>
      <style>{AdminUIStyles}</style>
      <style>{`
        .playbook-page-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .playbook-page-card {
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
          cursor: pointer;
        }
        .playbook-page-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(86, 35, 159, 0.12);
          border-color: #c4b5fd !important;
        }
        .playbook-page-layout {
          display: grid;
          grid-template-columns: 3fr 1fr;
          gap: 20px;
          align-items: start;
        }
        .playbook-page-cat-tag {
          transition: background .15s, color .15s, border-color .15s;
          cursor: pointer;
        }
        .playbook-page-cat-tag:hover {
          background: #ede9fe !important;
          color: #56239f !important;
          border-color: #c4b5fd !important;
        }
        .playbook-page-dialogo-card {
          transition: transform .15s ease, box-shadow .15s ease;
          cursor: pointer;
        }
        .playbook-page-dialogo-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(86, 35, 159, 0.10);
          border-color: #c4b5fd !important;
        }
        /* === MARKDOWN FULL TAGS — .playbook-md-content === */

        /* 1. Headings H1–H6 */
        .playbook-md-content h1 { font-size: 28px; font-weight: 700; color: #1f2937; margin: 0 0 16px; line-height: 1.3; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        .playbook-md-content h2 { font-size: 22px; font-weight: 700; color: #1f2937; margin: 28px 0 12px; line-height: 1.3; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px; }
        .playbook-md-content h3 { font-size: 18px; font-weight: 700; color: #374151; margin: 22px 0 10px; line-height: 1.3; }
        .playbook-md-content h4 { font-size: 16px; font-weight: 700; color: #374151; margin: 18px 0 8px; line-height: 1.4; }
        .playbook-md-content h5 { font-size: 14px; font-weight: 700; color: #4b5563; margin: 16px 0 6px; line-height: 1.4; text-transform: uppercase; letter-spacing: 0.3px; }
        .playbook-md-content h6 { font-size: 13px; font-weight: 700; color: #6b7280; margin: 14px 0 6px; line-height: 1.4; text-transform: uppercase; letter-spacing: 0.3px; }

        /* 2. Paragraphs */
        .playbook-md-content p { margin: 0 0 14px; line-height: 1.75; color: #374151; }

        /* 3. Text emphasis */
        .playbook-md-content strong { font-weight: 700; color: #1f2937; }
        .playbook-md-content em { font-style: italic; }
        .playbook-md-content del { text-decoration: line-through; color: #9ca3af; }
        .playbook-md-content u { text-decoration: underline; text-underline-offset: 2px; }
        .playbook-md-content mark, .playbook-md-content .highlight { background: #fef3c7; padding: 1px 4px; border-radius: 3px; }
        .playbook-md-content sub { vertical-align: sub; font-size: 0.85em; }
        .playbook-md-content sup { vertical-align: super; font-size: 0.85em; }

        /* 4. Blockquotes (nested) */
        .playbook-md-content blockquote { border-left: 4px solid #56239f; padding: 10px 18px; margin: 14px 0; background: #f3f0ff; color: #4b5563; border-radius: 0 8px 8px 0; }
        .playbook-md-content blockquote blockquote { border-left-color: #c4b5fd; background: #ede9fe; margin: 8px 0; }
        .playbook-md-content blockquote p { margin-bottom: 6px; }
        .playbook-md-content blockquote p:last-child { margin-bottom: 0; }

        /* 5. Lists — unordered, ordered, task lists (GFM) */
        .playbook-md-content ul, .playbook-md-content ol { margin: 0 0 14px; padding-left: 26px; color: #374151; }
        .playbook-md-content li { margin-bottom: 5px; line-height: 1.65; }
        .playbook-md-content li > ul, .playbook-md-content li > ol { margin-top: 4px; margin-bottom: 4px; }
        .playbook-md-content ul { list-style-type: disc; }
        .playbook-md-content ul ul { list-style-type: circle; }
        .playbook-md-content ul ul ul { list-style-type: square; }
        .playbook-md-content ol { list-style-type: decimal; }
        .playbook-md-content ol ol { list-style-type: lower-alpha; }
        .playbook-md-content ol ol ol { list-style-type: lower-roman; }
        .playbook-md-content li.task-list-item { list-style: none; margin-left: -22px; }
        .playbook-md-content input[type="checkbox"] { margin-right: 8px; accent-color: #56239f; width: 15px; height: 15px; vertical-align: middle; cursor: default; }

        /* 6. Code — inline + blocks */
        .playbook-md-content code { background: #f3f4f6; padding: 2px 7px; border-radius: 5px; font-size: 0.88em; color: #56239f; font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace; }
        .playbook-md-content pre { background: #1e1e2e; color: #cdd6f4; padding: 16px 18px; border-radius: 10px; overflow-x: auto; margin: 16px 0; border: 1px solid #313244; line-height: 1.55; }
        .playbook-md-content pre code { background: transparent; color: inherit; padding: 0; font-size: 13px; border-radius: 0; }

        /* 7. Links */
        .playbook-md-content a { color: #56239f; text-decoration: underline; text-underline-offset: 2px; transition: color .15s; }
        .playbook-md-content a:hover { color: #7c3aed; }
        .playbook-md-content a:visited { color: #6d28d9; }

        /* 8. Images */
        .playbook-md-content img { max-width: 100%; height: auto; border-radius: 10px; margin: 12px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

        /* 9. Horizontal rules */
        .playbook-md-content hr { border: none; border-top: 2px solid #e5e7eb; margin: 24px 0; }

        /* 10. Tables (GFM) — with alignment support */
        .playbook-md-content table { width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .playbook-md-content thead { background: #56239f; }
        .playbook-md-content th { color: #fff; padding: 11px 14px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid #4c1d95; }
        .playbook-md-content td { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; }
        .playbook-md-content tbody tr:hover { background: #f9fafb; }
        .playbook-md-content tbody tr:nth-child(even) { background: #faf9fc; }
        .playbook-md-content th[align="center"], .playbook-md-content td[align="center"] { text-align: center; }
        .playbook-md-content th[align="right"], .playbook-md-content td[align="right"] { text-align: right; }

        /* 11. HTML inline — b, i, u, br, kbd, abbr */
        .playbook-md-content b { font-weight: 700; }
        .playbook-md-content i { font-style: italic; }
        .playbook-md-content kbd { display: inline-block; padding: 2px 7px; font-size: 0.85em; color: #1f2937; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; box-shadow: 0 1px 0 #d1d5db; font-family: 'JetBrains Mono', monospace; }
        .playbook-md-content abbr { text-decoration: underline dotted; cursor: help; }

        /* 12. Details / Expand (GFM + HTML) */
        .playbook-md-content details { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; margin: 12px 0; background: #fff; }
        .playbook-md-content details[open] { background: #faf9fc; }
        .playbook-md-content summary { font-weight: 700; color: #56239f; cursor: pointer; padding: 4px 0; user-select: none; }
        .playbook-md-content summary:hover { color: #7c3aed; }
        .playbook-md-content details > *:not(summary) { margin-top: 8px; }

        /* 13. Footnotes */
        .playbook-md-content .footnotes { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; }
        .playbook-md-content .footnotes ol { padding-left: 20px; }
        .playbook-md-content .footnotes li { margin-bottom: 6px; }
        .playbook-md-content sup a { color: #56239f; text-decoration: none; font-weight: 700; }

        /* 14. Definition lists (dl/dt/dd via HTML) */
        .playbook-md-content dl { margin: 12px 0; }
        .playbook-md-content dt { font-weight: 700; color: #1f2937; margin-top: 10px; }
        .playbook-md-content dd { margin-left: 24px; color: #4b5563; margin-bottom: 6px; }

        /* 15. Miscellaneous */
        .playbook-md-content figure { margin: 16px 0; text-align: center; }
        .playbook-md-content figcaption { font-size: 13px; color: #6b7280; margin-top: 6px; font-style: italic; }
        .playbook-md-content video, .playbook-md-content iframe { max-width: 100%; border-radius: 8px; margin: 12px 0; }

        /* === MARKDOWN PREVIEW (editor) — .playbook-md-preview === */
        .playbook-md-preview h1 { font-size: 22px; font-weight: 700; color: #1f2937; margin: 0 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
        .playbook-md-preview h2 { font-size: 18px; font-weight: 700; color: #1f2937; margin: 16px 0 8px; }
        .playbook-md-preview h3 { font-size: 16px; font-weight: 700; color: #374151; margin: 14px 0 6px; }
        .playbook-md-preview h4 { font-size: 14px; font-weight: 700; color: #374151; margin: 12px 0 6px; }
        .playbook-md-preview h5 { font-size: 13px; font-weight: 700; color: #4b5563; margin: 10px 0 4px; text-transform: uppercase; }
        .playbook-md-preview h6 { font-size: 12px; font-weight: 700; color: #6b7280; margin: 10px 0 4px; text-transform: uppercase; }
        .playbook-md-preview p { margin: 0 0 10px; line-height: 1.65; color: #374151; }
        .playbook-md-preview strong { font-weight: 700; color: #1f2937; }
        .playbook-md-preview em { font-style: italic; }
        .playbook-md-preview del { text-decoration: line-through; color: #9ca3af; }
        .playbook-md-preview ul, .playbook-md-preview ol { margin: 0 0 10px; padding-left: 22px; color: #374151; }
        .playbook-md-preview li { margin-bottom: 3px; line-height: 1.55; }
        .playbook-md-preview li.task-list-item { list-style: none; margin-left: -18px; }
        .playbook-md-preview input[type="checkbox"] { margin-right: 6px; accent-color: #56239f; }
        .playbook-md-preview blockquote { border-left: 3px solid #56239f; padding: 6px 12px; margin: 10px 0; background: #f3f0ff; color: #4b5563; border-radius: 0 6px 6px 0; }
        .playbook-md-preview blockquote p:last-child { margin-bottom: 0; }
        .playbook-md-preview code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 0.85em; color: #56239f; font-family: 'JetBrains Mono', monospace; }
        .playbook-md-preview pre { background: #1e1e2e; color: #cdd6f4; padding: 12px; border-radius: 8px; overflow-x: auto; margin: 10px 0; border: 1px solid #313244; }
        .playbook-md-preview pre code { background: transparent; color: inherit; padding: 0; font-size: 12px; }
        .playbook-md-preview a { color: #56239f; text-decoration: underline; }
        .playbook-md-preview img { max-width: 100%; border-radius: 6px; margin: 8px 0; }
        .playbook-md-preview hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
        .playbook-md-preview table { width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #e5e7eb; }
        .playbook-md-preview thead { background: #56239f; }
        .playbook-md-preview th { color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .playbook-md-preview td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        .playbook-md-preview tbody tr:nth-child(even) { background: #faf9fc; }
        .playbook-md-preview details { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; margin: 8px 0; }
        .playbook-md-preview summary { font-weight: 700; color: #56239f; cursor: pointer; }
        .playbook-md-preview kbd { display: inline-block; padding: 1px 5px; font-size: 0.8em; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 3px; font-family: monospace; }
        .playbook-md-preview .footnotes { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        @media (max-width: 1100px) {
          .playbook-page-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 900px) {
          .playbook-page-layout { grid-template-columns: 1fr; }
          .playbook-page-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={styles.page}>
        {vista === 'listagem' && (
          <>
            <header style={styles.header}>
              <div>
                <h1 style={styles.title}>Playbook</h1>
                <p style={styles.subtitle}>Consulte os playbooks operacionais organizados por setor.</p>
              </div>
            </header>

            {error && (
              <div style={styles.errorBox}>{error}</div>
            )}

            <section style={styles.filtersSection}>
              <div style={styles.filterRow}>
                <div style={styles.filterField}>
                  <label style={styles.filterLabel}>Setor</label>
                  <select
                    className="admin-select"
                    value={setorSelecionado}
                    onChange={(e) => setSetorSelecionado(e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="todos">Todos os setores</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.filterField}>
                  <label style={styles.filterLabel}>Busca</label>
                  <div style={styles.searchBox}>
                    <Search size={15} color="#6b7280" />
                    <input
                      className="admin-input"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar playbook..."
                      style={styles.searchInput}
                    />
                  </div>
                </div>
              </div>

              {categoriasDisponiveis.length > 0 && (
                <div style={styles.tagsRow}>
                  <span style={styles.tagsLabel}>Categorias:</span>
                  {categoriasDisponiveis.map((cat) => {
                    const ativo = normalizar(categoriaSelecionada) === normalizar(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        className="playbook-page-cat-tag"
                        style={ativo ? styles.tagAtiva : styles.tag}
                        onClick={() => setCategoriaSelecionada(ativo ? 'todas' : cat)}
                      >
                        {cat}
                      </button>
                    );
                  })}
                  {categoriaSelecionada !== 'todas' && (
                    <button
                      type="button"
                      style={styles.tagLimpar}
                      onClick={() => setCategoriaSelecionada('todas')}
                    >
                      <X size={12} /> Limpar
                    </button>
                  )}
                </div>
              )}
            </section>

            <div style={styles.statsRow}>
              <div style={styles.statChip}>
                <BookOpen size={14} color="#56239f" />
                <span>{totalTemplatesCarregados} playbooks</span>
              </div>
              <div style={styles.statChip}>
                <FolderTree size={14} color="#0f766e" />
                <span>{setores.length} setores</span>
              </div>
              <div style={styles.statChip}>
                <Layers size={14} color="#d97706" />
                <span>{categoriasDisponiveis.length} categorias</span>
              </div>
            </div>

            {loadingCatalogo && (
              <div style={styles.emptyBox}>Carregando playbooks...</div>
            )}

            {!loadingCatalogo && templatesFiltrados.length === 0 && (
              <div style={styles.emptyBox}>Nenhum playbook encontrado para os filtros selecionados.</div>
            )}

            {!loadingCatalogo && templatesAgrupados.map(([setor, templates]) => (
              <section key={setor} style={styles.grupoSetor}>
                <h2 style={styles.grupoTitulo}>{setor}</h2>
                <div className="playbook-page-grid">
                  {templates.map((t) => (
                    <article
                      key={t.key}
                      className="playbook-page-card"
                      style={styles.card}
                      onClick={() => void abrirPlaybook(t)}
                    >
                      <div style={styles.cardTop}>
                        <h3 style={styles.cardTitulo}>{t.titulo}</h3>
                        <BookOpen size={18} color="#56239f" />
                      </div>
                      {t.categoria && (
                        <span style={styles.cardCategoria}>{t.categoria}</span>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {loadingDetalhe && (
              <div style={styles.loadingOverlay}>
                <div style={styles.loadingBox}>Carregando playbook...</div>
              </div>
            )}
          </>
        )}

        {vista === 'pagina' && detalhe && (
          <>
            <button
              type="button"
              style={styles.voltarBtn}
              onClick={voltarListagem}
            >
              <ArrowLeft size={16} />
              Voltar ao catálogo
            </button>

            <div className="playbook-page-layout">
              <main style={styles.mainCol}>
                <div style={styles.metaRow}>
                  {detalhe.setor && <span style={styles.metaBadge}>{detalhe.setor}</span>}
                  {detalhe.categoria && <span style={styles.metaBadgeCat}>{detalhe.categoria}</span>}
                </div>
                <h1 style={styles.pageTitulo}>{detalhe.titulo}</h1>
                <div className="playbook-md-content" style={styles.markdownBody}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{detalhe.texto}</ReactMarkdown>
                </div>
              </main>

              <aside style={styles.sideCol}>
                <div style={styles.sideHeader}>
                  <MessageSquare size={16} color="#56239f" />
                  <h3 style={styles.sideTitulo}>Diálogos</h3>
                  <span style={styles.sideCount}>{detalhe.dialogos.length}</span>
                </div>

                {detalhe.dialogos.length === 0 && (
                  <p style={styles.sideEmpty}>Nenhum diálogo cadastrado.</p>
                )}

                <div style={styles.dialogosList}>
                  {detalhe.dialogos.map((d) => (
                    <article
                      key={d.key}
                      className="playbook-page-dialogo-card"
                      style={styles.dialogoCard}
                      onClick={() => abrirDialogo(d)}
                    >
                      <span style={styles.dialogoOrdem}>{d.ordemExibicao}</span>
                      <span style={styles.dialogoTitulo}>{d.titulo || `Diálogo ${d.ordemExibicao}`}</span>
                    </article>
                  ))}
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      {dialogoAberto && (
        <div style={styles.modalOverlay} onClick={fecharDialogo}>
          <div style={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <header style={styles.modalHeader}>
              <div>
                <span style={styles.modalTag}>Diálogo</span>
                <h2 style={styles.modalTitulo}>{dialogoAberto.titulo || `Diálogo ${dialogoAberto.ordemExibicao}`}</h2>
              </div>
              <button style={styles.modalClose} onClick={fecharDialogo} aria-label="Fechar">
                <X size={16} />
              </button>
            </header>
            <div
              style={
                variaveisDialogo.length > 0
                  ? styles.modalBodyComVariaveis
                  : styles.modalBody
              }
            >
              {variaveisDialogo.length > 0 && (
                <div style={styles.variaveisSection}>
                  <h4 style={styles.variaveisTitulo}>Variaveis da mensagem</h4>
                  <div style={styles.variaveisGrid}>
                    {variaveisDialogo.map((nomeVariavel) => (
                      <label key={nomeVariavel} style={styles.variavelField}>
                        <span style={styles.variavelLabel}>{`{${nomeVariavel}}`}</span>
                        <div style={styles.variavelInputWrap}>
                          <input
                            className="admin-input"
                            style={styles.variavelInput}
                            value={valoresVariaveisDialogo[nomeVariavel] || ''}
                            onChange={(event) =>
                              setValoresVariaveisDialogo((prev) => ({
                                ...prev,
                                [nomeVariavel]: event.target.value,
                              }))
                            }
                            placeholder={`Digite ${nomeVariavel}`}
                          />
                          <button
                            type="button"
                            style={
                              variaveisNegritoDialogo[nomeVariavel]
                                ? styles.variavelBolderButtonAtivo
                                : styles.variavelBolderButton
                            }
                            onClick={() =>
                              setVariaveisNegritoDialogo((prev) => ({
                                ...prev,
                                [nomeVariavel]: !prev[nomeVariavel],
                              }))
                            }
                            title="Aplicar negrito nesta variavel"
                          >
                            B
                          </button>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.previewSection}>
                <div className="playbook-md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {textoDialogoFinal}
                  </ReactMarkdown>
                </div>
                <div style={styles.copyActions}>
                  <button type="button" style={styles.copyButton} onClick={() => void copiarMensagemFinal()}>
                    Copiar mensagem
                  </button>
                  {mensagemCopiada ? <span style={styles.copyStatus}>{mensagemCopiada}</span> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1450,
    margin: '0 auto',
    padding: 24,
    fontFamily: "'Titillium Web', Arial, sans-serif",
    display: 'grid',
    gap: 16,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: 32,
    color: '#1f2937',
    fontWeight: 700,
  },
  subtitle: {
    margin: '6px 0 0',
    color: '#6b7280',
    fontSize: 15,
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
  },
  filtersSection: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#fff',
    padding: 14,
    display: 'grid',
    gap: 12,
  },
  filterRow: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gap: 10,
  },
  filterField: {
    display: 'grid',
    gap: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterSelect: {
    height: 38,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '0 10px',
    fontSize: 14,
    background: '#fff',
  },
  searchBox: {
    height: 38,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '0 10px',
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    background: '#fff',
  },
  searchInput: {
    border: 0,
    outline: 'none',
    width: '100%',
    fontSize: 14,
    background: 'transparent',
    color: '#1f2937',
    fontFamily: "'Titillium Web', Arial, sans-serif",
  },
  tagsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    borderRadius: 999,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#4b5563',
    background: '#f9fafb',
    cursor: 'pointer',
    fontFamily: "'Titillium Web', Arial, sans-serif",
  },
  tagAtiva: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid #56239f',
    borderRadius: 999,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    background: '#56239f',
    cursor: 'pointer',
    fontFamily: "'Titillium Web', Arial, sans-serif",
  },
  tagLimpar: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    border: 'none',
    background: 'transparent',
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Titillium Web', Arial, sans-serif",
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  statChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid #e5e7eb',
    borderRadius: 999,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    background: '#fff',
  },
  emptyBox: {
    border: '1px dashed #d1d5db',
    borderRadius: 10,
    padding: 20,
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  grupoSetor: {
    display: 'grid',
    gap: 10,
  },
  grupoTitulo: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#1f2937',
    borderBottom: '2px solid #56239f',
    paddingBottom: 6,
    display: 'inline-block',
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#fff',
    padding: 14,
    display: 'grid',
    gap: 8,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitulo: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#1f2937',
    lineHeight: 1.3,
  },
  cardCategoria: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    color: '#6b7280',
    background: '#f9fafb',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    justifySelf: 'start',
  },
  loadingOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(255,255,255,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  loadingBox: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '16px 28px',
    fontSize: 14,
    fontWeight: 600,
    color: '#56239f',
    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
  },

  // Page view
  voltarBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    background: 'transparent',
    color: '#56239f',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '4px 0',
    fontFamily: "'Titillium Web', Arial, sans-serif",
  },
  mainCol: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 24,
    display: 'grid',
    gap: 12,
    alignContent: 'start',
  },
  metaRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid #56239f',
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#56239f',
    background: '#f3f0ff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaBadgeCat: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid #d97706',
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#d97706',
    background: '#fffbeb',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pageTitulo: {
    margin: 0,
    fontSize: 30,
    fontWeight: 700,
    color: '#1f2937',
    lineHeight: 1.2,
  },
  markdownBody: {
    fontSize: 15,
    lineHeight: 1.7,
    color: '#374151',
  },

  // Side column
  sideCol: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 16,
    display: 'grid',
    gap: 12,
    alignContent: 'start',
    position: 'sticky',
    top: 20,
  },
  sideHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sideTitulo: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#1f2937',
    flex: 1,
  },
  sideCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 999,
    background: '#f3f0ff',
    color: '#56239f',
    fontSize: 12,
    fontWeight: 700,
  },
  sideEmpty: {
    color: '#9ca3af',
    fontSize: 13,
    fontStyle: 'italic',
    margin: 0,
  },
  dialogosList: {
    display: 'grid',
    gap: 8,
  },
  dialogoCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: '10px 12px',
    background: '#fff',
  },
  dialogoOrdem: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: 999,
    background: '#56239f',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  dialogoTitulo: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1f2937',
    lineHeight: 1.3,
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.52)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4000,
    padding: 18,
  },
  modalContainer: {
    width: '96vw',
    maxWidth: 1180,
    maxHeight: '90vh',
    overflow: 'auto',
    borderRadius: 14,
    border: '2px solid var(--secondary)',
    background: '#fff',
    boxShadow: '0 12px 28px rgba(17, 24, 39, 0.18)',
  },
  modalHeader: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    background: '#fff',
    zIndex: 2,
  },
  modalTag: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid var(--primary)',
    borderRadius: 999,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--primary)',
    background: '#f3f0ff',
    marginBottom: 4,
  },
  modalTitulo: {
    margin: 0,
    color: '#111827',
    fontSize: 22,
    fontWeight: 700,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4b5563',
  },
  modalBody: {
    padding: 12,
    fontSize: 15,
    lineHeight: 1.6,
    color: '#374151',
    display: 'grid',
    gap: 10,
  },
  modalBodyComVariaveis: {
    padding: 12,
    fontSize: 15,
    lineHeight: 1.6,
    color: '#374151',
    display: 'grid',
    gap: 10,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    alignItems: 'start',
  },
  variaveisSection: {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    background: '#faf9fc',
    padding: 10,
    display: 'grid',
    gap: 8,
    alignContent: 'start',
  },
  variaveisTitulo: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  variaveisGrid: {
    display: 'grid',
    gap: 6,
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  variavelField: {
    display: 'grid',
    gap: 4,
  },
  variavelLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#56239f',
  },
  variavelInputWrap: {
    width: '100%',
    minHeight: 34,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '0 4px 0 10px',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  variavelInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 30,
    border: 'none',
    outline: 'none',
    padding: 0,
    fontSize: 14,
    background: '#fff',
    color: '#1f2937',
    fontFamily: "'Titillium Web', Arial, sans-serif",
  },
  variavelBolderButton: {
    width: 28,
    height: 26,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    background: '#fff',
    color: '#4b5563',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Titillium Web', Arial, sans-serif",
    flexShrink: 0,
  },
  variavelBolderButtonAtivo: {
    width: 28,
    height: 26,
    border: '1px solid #56239f',
    borderRadius: 6,
    background: '#56239f',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Titillium Web', Arial, sans-serif",
    flexShrink: 0,
  },
  previewSection: {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 12,
    display: 'grid',
    gap: 8,
  },
  copyActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  copyButton: {
    border: '1px solid #56239f',
    borderRadius: 8,
    background: '#56239f',
    color: '#fff',
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Titillium Web', Arial, sans-serif",
  },
  copyStatus: {
    fontSize: 12,
    color: '#374151',
    fontWeight: 600,
  },
};

export default PlaybookPage;
