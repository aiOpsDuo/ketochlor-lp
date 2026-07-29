import Header from './components/Header'
import Hero from './components/Hero'
import Problema from './components/Problema'
import Fenotipos from './components/Fenotipos'
import Mecanismo from './components/Mecanismo'
import TecnologiaSIS from './components/TecnologiaSIS'
import ProvaAutoridade from './components/ProvaAutoridade'
import Protocolo from './components/Protocolo'
import Diferenciais from './components/Diferenciais'
import FormularioCTA from './components/FormularioCTA'
import CTASecundario from './components/CTASecundario'
import FAQ from './components/FAQ'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problema />
        <Fenotipos />
        <Mecanismo />
        <TecnologiaSIS />
        <ProvaAutoridade />
        <Protocolo />
        <Diferenciais />
        <FormularioCTA />
        <CTASecundario />
        <FAQ />
      </main>
      <Footer />
    </>
  )
}
