import { BottomSheet } from './ui/BottomSheet'
import { Button } from './ui/Button'

type Props = { open: boolean; onClose: () => void }

/** Static rules text. Update it whenever the game flow or the scoring changes. */
export function Rules({ open, onClose }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} label="Regler">
      <div className="display d-m">Så spelar ni</div>
      <div className="rules">
        <div>
          <h4>Idén</h4>
          <p>
            Alla utom en får samma hemliga ord. <b>Bedragaren</b> får bara en ledtråd och försöker smälta in.
          </p>
        </div>
        <div>
          <h4><span>1</span>Förbered</h4>
          <p>Minst 3 spelare. Skriv in namn, eller skanna QR-koden hos den som har konto. Välj kategorier.</p>
        </div>
        <div>
          <h4><span>2</span>Se ditt ord</h4>
          <p>Skicka runt enheten. Titta i hemlighet, dölj och skicka vidare.</p>
        </div>
        <div>
          <h4><span>3</span>Diskutera</h4>
          <p>
            Den som börjar säger ett ord som hör ihop med ordet, sedan går det runt. Avslöja inte ordet! När de flesta
            vill rösta trycker ni på <b>Avslöja bedragaren</b>.
          </p>
        </div>
        <div>
          <h4><span>4</span>Rösta</h4>
          <p>Enheten går runt igen och alla röstar i hemlighet, bedragaren också. Du kan inte rösta på dig själv.</p>
        </div>
        <div>
          <h4><span>5</span>Poäng</h4>
          <p>
            Röstar du på bedragaren får du <b>1 p</b>. Bedragaren får <b>1 p för varje fel röst</b>. Efter varje
            röstning visas allas poäng för rundan och totalt.
          </p>
        </div>
        <div>
          <h4>Fler rundor</h4>
          <p>
            Kör <b>Nästa runda</b> så länge ni vill och byt kategorier mellan rundorna. Flest poäng när ni avslutar
            vinner.
          </p>
        </div>
      </div>
      <Button variant="secondary" onClick={onClose}>Stäng</Button>
    </BottomSheet>
  )
}
