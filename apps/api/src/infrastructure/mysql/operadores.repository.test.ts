import { randomUUID } from 'node:crypto';
import { compare } from 'bcryptjs';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarMysqlPool } from './mysql-client.factory';
import { MySqlOperadoresRepository } from './operadores.repository';
import { carregarMysqlTestEnv } from '../test-support/mysql-test-env';
import type { CriarOperadorInput } from '../../domain/portas/operadores.repository';

describe('MySqlOperadoresRepository (infra)', () => {
  let pool: Pool;
  let repositorio: MySqlOperadoresRepository;
  const idsCriados: string[] = [];

  beforeAll(() => {
    pool = criarMysqlPool(carregarMysqlTestEnv());
    repositorio = new MySqlOperadoresRepository(pool);
  }, 20_000);

  afterAll(async () => {
    // Limpeza best-effort dos operadores criados por este arquivo — não
    // depende de `excluir` funcionar (é o próprio método sob teste), mas
    // evita poluir a tabela entre execuções repetidas da suíte.
    for (const id of idsCriados) {
      await pool.execute('DELETE FROM operators WHERE id = ?', [id]);
    }
    await pool.end();
  }, 20_000);

  function operadorDeTeste(overrides: Partial<CriarOperadorInput> = {}): CriarOperadorInput {
    return {
      email: `operador.teste.${randomUUID()}@example.com`,
      nome: 'Operador de Teste',
      senha: 'senha-de-teste-123456',
      ...overrides,
    };
  }

  it(
    'cria um operador com id (UUID) e nunca grava a senha em texto plano',
    async () => {
      const input = operadorDeTeste();
      const operador = await repositorio.criar(input);
      idsCriados.push(operador.id);

      expect(operador.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(operador.email).toBe(input.email);
      expect(operador.nome).toBe(input.nome);
      expect(operador.criadoEm).toBeTruthy();
      expect(operador.ultimoLoginEm).toBeNull();

      interface SenhaHashRow extends RowDataPacket {
        senha_hash: string;
      }
      const [rows] = await pool.execute<SenhaHashRow[]>(
        'SELECT senha_hash FROM operators WHERE id = ?',
        [operador.id],
      );
      const senhaHash = rows[0]?.senha_hash;
      expect(senhaHash).toBeTruthy();
      expect(senhaHash).not.toBe(input.senha);
      // Confirma que é de fato um hash bcrypt utilizável, não só "diferente
      // da senha" — round-trip real via `bcryptjs.compare`.
      await expect(compare(input.senha, senhaHash)).resolves.toBe(true);
      await expect(compare('senha-errada', senhaHash)).resolves.toBe(false);
    },
    20_000,
  );

  it(
    'listarTodos ordena por criado_em DESC (mais recente primeiro)',
    async () => {
      const antigo = await repositorio.criar(operadorDeTeste({ nome: 'Antigo' }));
      idsCriados.push(antigo.id);
      await pool.execute('UPDATE operators SET criado_em = ? WHERE id = ?', [
        '2020-01-01 00:00:00',
        antigo.id,
      ]);

      const recente = await repositorio.criar(operadorDeTeste({ nome: 'Recente' }));
      idsCriados.push(recente.id);

      const todos = await repositorio.listarTodos();
      const indiceAntigo = todos.findIndex((o) => o.id === antigo.id);
      const indiceRecente = todos.findIndex((o) => o.id === recente.id);

      expect(indiceRecente).toBeGreaterThanOrEqual(0);
      expect(indiceAntigo).toBeGreaterThanOrEqual(0);
      expect(indiceRecente).toBeLessThan(indiceAntigo);
    },
    20_000,
  );

  it(
    'remover exclui o operador permanentemente',
    async () => {
      const operador = await repositorio.criar(operadorDeTeste());

      await repositorio.remover(operador.id);

      const todos = await repositorio.listarTodos();
      expect(todos.some((o) => o.id === operador.id)).toBe(false);
    },
    20_000,
  );

  it(
    'buscarPorEmail devolve o operador com o hash de senha; null para e-mail inexistente',
    async () => {
      const input = operadorDeTeste();
      const operador = await repositorio.criar(input);
      idsCriados.push(operador.id);

      const encontrado = await repositorio.buscarPorEmail(input.email);
      expect(encontrado).not.toBeNull();
      expect(encontrado?.operador.id).toBe(operador.id);
      await expect(compare(input.senha, encontrado?.senhaHash ?? '')).resolves.toBe(true);

      const inexistente = await repositorio.buscarPorEmail(`nao.existe.${randomUUID()}@example.com`);
      expect(inexistente).toBeNull();
    },
    20_000,
  );

  it(
    'atualizarUltimoLogin grava ultimo_login_em (lido de volta via buscarPorEmail/listarTodos)',
    async () => {
      const input = operadorDeTeste();
      const operador = await repositorio.criar(input);
      idsCriados.push(operador.id);
      expect(operador.ultimoLoginEm).toBeNull();

      await repositorio.atualizarUltimoLogin(operador.id);

      const encontrado = await repositorio.buscarPorEmail(input.email);
      expect(encontrado?.operador.ultimoLoginEm).toBeTruthy();
    },
    20_000,
  );
});
