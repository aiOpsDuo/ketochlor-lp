import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { fetchPublishedContent } from './fetch-published-content';
import contentSnapshot from './content-snapshot.json';
import type { PublishedContent } from './published-content';

/**
 * Instantâneo de conteúdo (SDD § Linguagem ubíqua — "Instantâneo de
 * conteúdo"): cópia do conteúdo publicado embutida no build da LP, usada
 * como conteúdo de reserva quando `GET /api/content` falha em runtime.
 * Import estático (não `fetch`) — precisa estar disponível mesmo sem rede.
 *
 * Nesta tarefa (`lp/provider-conteudo-publicado`) o arquivo é um instantâneo
 * mínimo (as 11 seções `null`, metadados vazios) — o conteúdo real só é
 * gerado pelo script de build da tarefa `lp/instantaneo-de-conteudo`, ainda
 * não implementada.
 */
const fallbackContent: PublishedContent = contentSnapshot;

interface PublishedContentValue {
  sections: PublishedContent['sections'];
  metadata: PublishedContent['metadata'];
  isLoading: boolean;
}

const PublishedContentContext = createContext<PublishedContentValue | null>(
  null,
);

interface PublishedContentProviderProps {
  children: ReactNode;
}

/**
 * Busca o conteúdo publicado em `GET /api/content` ao montar; se a busca
 * falhar (rede fora do ar, HTTP não-2xx, JSON inválido/fora do formato
 * esperado), cai para o instantâneo local sem quebrar a renderização da LP
 * (SDD § Riscos técnicos — "API indisponível derrubando a LP"), registrando
 * o motivo da falha no console para depuração.
 *
 * Esta tarefa cria só a infraestrutura de acesso ao conteúdo — nenhum
 * componente da LP consome este provider ainda (isso é `lp/migrar-secoes-
 * -para-cms`), então ele não é montado em `App.tsx` por enquanto.
 */
export function PublishedContentProvider({
  children,
}: PublishedContentProviderProps) {
  const [content, setContent] = useState<PublishedContent>(fallbackContent);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;

    fetchPublishedContent()
      .then((conteudoDaApi) => {
        if (!cancelado) {
          setContent(conteudoDaApi);
        }
      })
      .catch((motivoDaFalha) => {
        console.error(
          'Falha ao buscar conteúdo publicado em GET /api/content; usando instantâneo local como conteúdo de reserva.',
          motivoDaFalha,
        );
        if (!cancelado) {
          setContent(fallbackContent);
        }
      })
      .finally(() => {
        if (!cancelado) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <PublishedContentContext.Provider
      value={{ sections: content.sections, metadata: content.metadata, isLoading }}
    >
      {children}
    </PublishedContentContext.Provider>
  );
}

/** Hook de acesso ao conteúdo publicado — só usável dentro de `PublishedContentProvider`. */
export function usePublishedContent(): PublishedContentValue {
  const context = useContext(PublishedContentContext);
  if (!context) {
    throw new Error(
      'usePublishedContent precisa ser usado dentro de um PublishedContentProvider.',
    );
  }
  return context;
}
