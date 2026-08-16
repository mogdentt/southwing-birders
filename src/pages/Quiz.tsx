import React, { useCallback, useEffect, useMemo, useState } from "react"
import { SPECIES } from "../data/species"
import { useStore } from "../lib/store"
import { PhotoImg } from "../components/PhotoImg"
import { TopBar } from "../components/bits"
import { celebrateSmall } from "../lib/celebrate"
import type { Species } from "../types"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeQuestion(exclude?: string): { answer: Species; options: Species[] } {
  const pool = SPECIES.filter((s) => s.id !== exclude)
  const answer = pool[Math.floor(Math.random() * pool.length)]
  const sameGroup = shuffle(pool.filter((s) => s.group === answer.group && s.id !== answer.id)).slice(0, 2)
  const others = shuffle(pool.filter((s) => s.id !== answer.id && !sameGroup.includes(s))).slice(0, 3 - sameGroup.length)
  const options = shuffle([answer, ...sameGroup, ...others])
  return { answer, options }
}

export default function Quiz() {
  const { data, recordQuiz } = useStore()
  const [q, setQ] = useState(() => makeQuestion())
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)

  const answerNow = useCallback(
    (id: string) => {
      if (picked) return
      setPicked(id)
      const correct = id === q.answer.id
      const nextStreak = correct ? streak + 1 : 0
      setScore((s) => s + (correct ? 1 : 0))
      setTotal((t) => t + 1)
      setStreak(nextStreak)
      recordQuiz(correct, nextStreak)
      if (correct && nextStreak > 0 && nextStreak % 5 === 0) celebrateSmall()
    },
    [picked, q.answer.id, streak, recordQuiz]
  )

  const next = useCallback(() => {
    setQ(makeQuestion(q.answer.id))
    setPicked(null)
  }, [q.answer.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && picked) next()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [picked, next])

  const online = navigator.onLine

  return (
    <div className="fade-in">
      <TopBar title="Who is this?" />

      <div className="quiz-score">
        <b>
          {score}/{total}
        </b>
        <span>
          streak {streak} · best {Math.max(data.quiz.bestStreak, streak)}
        </span>
      </div>

      <div className="quiz-photo">
        <PhotoImg species={q.answer} />
      </div>
      {!online && (
        <p className="tiny" style={{ textAlign: "center", marginTop: -8 }}>
          Offline: photos may not load until you have signal.
        </p>
      )}

      <div className="quiz-opts">
        {q.options.map((op) => {
          let cls = "quiz-opt"
          if (picked) {
            if (op.id === q.answer.id) cls += " correct"
            else if (op.id === picked) cls += " wrong"
          }
          return (
            <button key={op.id} className={cls} disabled={!!picked} onClick={() => answerNow(op.id)}>
              {op.name}
              {op.maori && op.maori !== op.name ? <span className="tiny"> · {op.maori}</span> : null}
            </button>
          )
        })}
      </div>

      {picked && (
        <div className="card mt16 fade-in">
          <p className="muted mt0" style={{ marginBottom: 12, fontSize: 13.5 }}>
            <b style={{ color: "var(--ink)" }}>{q.answer.name}.</b> {q.answer.idTips}
          </p>
          <button className="btn big" onClick={next}>
            Next bird
          </button>
        </div>
      )}
    </div>
  )
}
