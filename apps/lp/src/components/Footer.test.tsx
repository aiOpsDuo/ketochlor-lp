import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { POLITICA_PRIVACIDADE_URL } from '@ketochlor/content-schema';
import Footer from './Footer';

/**
 * Links institucionais do rodapé (`FOOTER_LINKS`, `src/data/content.ts`):
 * destinos reais no site da Virbac Brasil, sempre em nova aba — e o item
 * "Uso Veterinário · Cães", que não é uma página, como texto simples.
 */
describe('Footer — links institucionais', () => {
  it.each([
    ['Sobre a Virbac', 'https://br.virbac.com/home/sobre-nos.html'],
    ['Política de Privacidade e LGPD', POLITICA_PRIVACIDADE_URL],
    ['Termos e Condições', 'https://br.virbac.com/home/legal-notice.html'],
    ['Contato', 'https://br.virbac.com/contato'],
  ])('"%s" aponta para %s e abre em nova aba', (rotulo, destino) => {
    render(<Footer />);

    const link = screen.getByRole('link', { name: new RegExp(rotulo) }) as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe(destino);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('"Uso Veterinário · Cães" é texto simples, não um link', () => {
    render(<Footer />);

    const item = screen.getByText('Uso Veterinário · Cães');

    expect(item.closest('a')).toBeNull();
  });

  it('nenhum link do rodapé continua apontando para "#"', () => {
    const { container } = render(<Footer />);

    expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0);
  });
});
