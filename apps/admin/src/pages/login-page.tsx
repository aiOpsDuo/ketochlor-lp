import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase-client'
import { Card } from '../shared/Card'
import { Notice } from '../shared/Notice'
import { atributosDeCampo, FormField } from '../shared/FormField'
import { classeDeBotao, classeDeCampo } from '../shared/classes'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    setEnviando(false)

    if (error) {
      setErro('E-mail ou senha inválidos.')
      return
    }

    // Sucesso: `onAuthStateChange` (auth-context) atualiza a sessão e
    // `PublicOnlyRoute` redireciona ao dashboard — nenhuma navegação manual
    // é necessária aqui.
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-lighttint p-4">
      {/* Cartão estreito e centralizado sobre fundo neutro, sem imagem nem
          split-screen: a tela de entrada de uma ferramenta interna não
          precisa vender nada a quem já tem a credencial. */}
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-lg font-bold text-white"
          >
            K
          </span>
          <div>
            <h1 className="text-xl font-semibold text-navy">Painel Ketochlor</h1>
            <p className="mt-1 text-sm text-graytxt">Entre para editar o conteúdo da página.</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <FormField id="login-email" label="E-mail">
              <input
                {...atributosDeCampo('login-email')}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                className={classeDeCampo(false)}
              />
            </FormField>

            <FormField id="login-senha" label="Senha">
              <input
                {...atributosDeCampo('login-senha')}
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                className={classeDeCampo(false)}
              />
            </FormField>

            {erro && <Notice tipo="erro">{erro}</Notice>}

            <button
              type="submit"
              disabled={enviando}
              className={classeDeBotao('primario', 'medio', 'w-full')}
            >
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </Card>
      </div>
    </main>
  )
}
