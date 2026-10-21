import { useLocation, useNavigate } from 'react-router'

// state dei link verso una pagina di dettaglio (un set, un Pokémon): quante pagine di dettaglio ci sono nella
// cronologia dopo l'elenco. 1 arrivando dall'elenco, +1 per ogni dettaglio aperto da lì (lista laterale,
// frecce); null con un link diretto
export interface StatoRitorno {
  passiDallElenco: number | null
}

export const DALL_ELENCO: StatoRitorno = { passiDallElenco: 1 }

// ritorno all'elenco (vetrina dei set, Pokédex) ripercorrendo la cronologia, così riappare nello stesso punto;
// da un link diretto non c'è niente dietro, quindi ci si va e basta. statoAvanti va sui link agli altri dettagli
export function useRitornoElenco(percorsoElenco: string) {
  const location = useLocation()
  const navigate = useNavigate()
  const passi = (location.state as Partial<StatoRitorno> | null)?.passiDallElenco ?? null
  const torna = () => {
    if (passi) navigate(-passi)
    else navigate(percorsoElenco)
  }
  const statoAvanti: StatoRitorno = { passiDallElenco: passi === null ? null : passi + 1 }
  return { torna, statoAvanti }
}
