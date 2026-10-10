import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, createJoinToken, getCategories, getRandomWord, redeemJoinToken } from './api'
import { useAuth } from './auth'
import { addRegisteredEntry, pickImpostor, pickStartingPlayer, scoreRound } from './game'
import type { ApiPlayer, Category, Entry, Player, Round, Votes } from './types'
import { Setup, newEntry } from './components/Setup'
import { Reveal } from './components/Reveal'
import { Play } from './components/Play'
import { Vote } from './components/Vote'
import { End } from './components/End'
import { Scoreboard } from './components/Scoreboard'
import { Login } from './components/account/Login'
import { Profile } from './components/account/Profile'

type View = 'game' | 'account'
type Phase = 'setup' | 'reveal' | 'play' | 'vote' | 'end' | 'scoreboard'

export function App() {
  const auth = useAuth()
  const [view, setView] = useState<View>('game')
  const [phase, setPhase] = useState<Phase>('setup')

  // Setup state lives here so it survives a visit to the account pages and "Nytt spel".
  const [entries, setEntries] = useState<Entry[]>(() => [newEntry(), newEntry(), newEntry()])
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [categoryIds, setCategoryIds] = useState<number[]>([])
  const [categoriesFailed, setCategoriesFailed] = useState(false)

  // Game state.
  const [players, setPlayers] = useState<Player[]>([])
  const [round, setRound] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [impostorRounds, setImpostorRounds] = useState<Record<string, number>>({})
  const [current, setCurrent] = useState<Round | null>(null)
  const [votes, setVotes] = useState<Votes>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(() => {
    getCategories().then(
      (list) => {
        setCategories(list)
        setCategoryIds(list.map((c) => c.id)) // all selected by default
      },
      () => setCategoriesFailed(true),
    )
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Latest list for addMe, which runs after awaits (a state updater would run too late to report the result).
  const entriesRef = useRef(entries)
  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  // The player logged in on this device, tied to the token it was fetched with (so a logout or new login hides it).
  const [me, setMe] = useState<{ token: string; player: ApiPlayer } | null>(null)
  const myself = me && me.token === auth.token ? me.player : null

  /** Adds the logged-in player like a QR scan would: issue a join token and redeem it right away. */
  const addMe = useCallback(async (): Promise<boolean> => {
    const token = auth.token
    if (!token) return false
    const { token: joinToken } = await createJoinToken()
    const { player, participant_token } = await redeemJoinToken(joinToken)
    setMe({ token, player })
    const next = addRegisteredEntry(entriesRef.current, player, participant_token, newEntry)
    if (!next) return false
    entriesRef.current = next
    setEntries(next)
    return true
  }, [auth.token])

  // Add the logged-in player once per login. After that, removing them sticks until they add themselves again.
  const autoAddedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!auth.token || autoAddedFor.current === auth.token) return
    autoAddedFor.current = auth.token
    addMe().catch(() => {
      /* offline or stale login: the "Lägg till" button stays available */
    })
  }, [auth.token, addMe])

  const loadCategories = () => {
    setCategoriesFailed(false)
    fetchCategories()
  }

  /** Fetches a word and picks the impostor and the starting player for a new round. */
  const beginRound = async (list: Player[], ids: number[], number: number): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      const word = await getRandomWord(ids)
      const names = list.map((p) => p.name)
      setCurrent({ ...word, impostor: pickImpostor(names), starter: pickStartingPlayer(names) })
      setRound(number)
      setVotes({})
      setPhase('reveal')
      return true
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? 'Det finns inga ord i de kategorierna.'
          : err instanceof ApiError && err.status === 0
            ? 'Ingen anslutning. Kontrollera internet och försök igen.'
            : 'Kunde inte hämta ett ord. Försök igen.',
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  const startGame = async () => {
    const list: Player[] = entries.map((e) => ({
      name: e.name.trim(),
      kind: e.registered ? 'registered' : 'guest',
      participantToken: e.registered?.participantToken,
      avatar: e.registered?.avatar,
    }))
    const ok = await beginRound(list, categoryIds, 1)
    if (ok) {
      setPlayers(list)
      setScores(Object.fromEntries(list.map((p) => [p.name, 0])))
      setImpostorRounds({})
    }
  }

  const finishVote = (cast: Votes) => {
    if (!current) return
    const points = scoreRound(players.map((p) => p.name), current.impostor, cast)
    setScores((prev) => Object.fromEntries(players.map((p) => [p.name, (prev[p.name] ?? 0) + (points[p.name] ?? 0)])))
    setImpostorRounds((prev) => ({ ...prev, [current.impostor]: (prev[current.impostor] ?? 0) + 1 }))
    setVotes(cast)
    setPhase('end')
  }

  const newGame = () => {
    setScores({})
    setImpostorRounds({})
    setRound(0)
    setCurrent(null)
    setVotes({})
    setError(null)
    setPhase('setup')
  }

  if (view === 'account') {
    const back = () => setView('game')
    return auth.isLoggedIn ? <Profile onBack={back} /> : <Login onBack={back} />
  }

  switch (phase) {
    case 'setup':
      return (
        <Setup
          entries={entries}
          setEntries={setEntries}
          categories={categories}
          categoryIds={categoryIds}
          setCategoryIds={setCategoryIds}
          categoriesFailed={categoriesFailed}
          reloadCategories={loadCategories}
          onStart={startGame}
          starting={busy}
          startError={error}
          onOpenAccount={() => setView('account')}
          loggedIn={auth.isLoggedIn}
          me={myself}
          onAddMe={addMe}
        />
      )
    case 'reveal':
      return current && <Reveal players={players} round={current} roundNumber={round} onDone={() => setPhase('play')} />
    case 'play':
      return current && <Play players={players} starter={current.starter} roundNumber={round} onVote={() => setPhase('vote')} />
    case 'vote':
      return <Vote players={players} roundNumber={round} onDone={finishVote} />
    case 'end':
      return (
        current && (
          <End
            players={players}
            round={current}
            votes={votes}
            scores={scores}
            roundNumber={round}
            categories={categories ?? []}
            categoryIds={categoryIds}
            onSaveCategories={setCategoryIds}
            onNext={() => beginRound(players, categoryIds, round + 1)}
            onFinish={() => {
              setError(null)
              setPhase('scoreboard')
            }}
            loading={busy}
            error={error}
          />
        )
      )
    case 'scoreboard':
      return <Scoreboard players={players} scores={scores} impostorRounds={impostorRounds} rounds={round} onNewGame={newGame} />
  }
}
