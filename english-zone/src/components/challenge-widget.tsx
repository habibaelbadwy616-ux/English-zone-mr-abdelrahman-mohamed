"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleHelp, Clock3, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";

type Question = { id: string; prompt: string; choices: string[] };
type ChallengeResult = { attemptId: string; score: number; total: number; discountPercent: number };

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ChallengeWidget() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [challengeTitle, setChallengeTitle] = useState("");
  const [attemptToken, setAttemptToken] = useState("");
  const [seenChallenges, setSeenChallenges] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const answersRef = useRef<string[]>([]);
  const timerExpired = useRef(false);

  async function startChallenge() {
    setStarted(true);
    setLoading(true);
    setError("");
    answersRef.current = [];
    try {
      const exclude = seenChallenges.join(",");
      const response = await fetch(`/api/challenges${exclude ? `?exclude=${exclude}` : ""}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The challenge is not available yet.");
      setQuestions(payload.questions);
      setChallengeId(payload.challengeId);
      setChallengeTitle(payload.title);
      setAttemptToken(payload.attemptToken);
      setRemainingSeconds(payload.durationSeconds);
      timerExpired.current = false;
      setSeenChallenges((current) => current.includes(payload.challengeId) ? current : [...current, payload.challengeId]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The challenge is not available yet.");
    } finally {
      setLoading(false);
    }
  }

  const submitAnswers = useCallback(async (submittedAnswers: string[]) => {
    timerExpired.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, attemptToken, answers: questions.map((question, index) => ({ questionId: question.id, choice: submittedAnswers[index] ?? "" })) }),
      });
      const payload = await response.json();
      if (response.status === 410) setRemainingSeconds(0);
      if (!response.ok) throw new Error(payload.error || "We could not save your result.");
      setResult(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not save your result.");
    } finally {
      setLoading(false);
    }
  }, [attemptToken, challengeId, questions]);

  useEffect(() => {
    if (!started || !questions.length || result || loading) return;
    if (remainingSeconds <= 0) {
      if (!timerExpired.current) void submitAnswers(answersRef.current);
      return;
    }
    const timeout = window.setTimeout(() => setRemainingSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [loading, questions.length, remainingSeconds, result, started, submitAnswers]);

  async function chooseAnswer(choice: string) {
    const nextAnswers = [...answers, choice];
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    if (nextAnswers.length < questions.length) {
      setQuestionIndex((current) => current + 1);
      return;
    }
    await submitAnswers(nextAnswers);
  }

  function reset() {
    setQuestions([]);
    setAnswers([]);
    answersRef.current = [];
    setQuestionIndex(0);
    setResult(null);
    setError("");
    setChallengeId("");
    setChallengeTitle("");
    setAttemptToken("");
    setRemainingSeconds(0);
    timerExpired.current = false;
    setStarted(false);
  }

  return (
    <div className="challenge-panel">
      <div className="challenge-topline"><span><Sparkles size={15} /> A LITTLE ENGLISH, A LITTLE EXTRA</span><span className="challenge-count">{result ? "FINISHED" : started && questions.length ? <><Clock3 size={12} aria-label="Time remaining" /> {questionIndex + 1} / {questions.length} · {formatTime(remainingSeconds)}</> : "QUICK CHALLENGE"}</span></div>
      {!started && !result && (
        <div className="challenge-intro">
          <div className="challenge-icon"><CircleHelp size={27} strokeWidth={1.5} /></div>
          <h3>Ready for a quick<br /><em>English challenge?</em></h3>
          <p>Five questions. One lovely little reward. No account needed to play.</p>
          <button className="button button-light" type="button" disabled={loading} onClick={() => void startChallenge()}>Start challenge <ArrowRight size={16} /></button>
        </div>
      )}
      {started && loading && !questions.length && <div className="challenge-loading"><LoaderCircle className="spin" size={25} /><span>Finding your questions…</span></div>}
      {started && questions.length > 0 && !result && !loading && (
        <div className="question-area">
          <div className="question-progress"><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
          <p className="question-label">{challengeTitle} · QUESTION {String(questionIndex + 1).padStart(2, "0")}</p>
          <h3>{questions[questionIndex].prompt}</h3>
          <div className="answer-options">{questions[questionIndex].choices.map((choice, index) => <button key={`${choice}-${index}`} type="button" disabled={remainingSeconds === 0} onClick={() => chooseAnswer(choice)}>{choice}<ArrowRight size={15} /></button>)}</div>
        </div>
      )}
      {loading && questions.length > 0 && <div className="challenge-saving"><LoaderCircle className="spin" size={17} /> Saving your result…</div>}
      {remainingSeconds === 0 && error && !loading && !result && <button className="try-again" type="button" onClick={() => error.includes("time limit") ? reset() : void submitAnswers(answersRef.current)}><RotateCcw size={14} /> {error.includes("time limit") ? "Start a new challenge" : "Try saving your result again"}</button>}
      {started && !loading && !questions.length && error && <button className="try-again" type="button" onClick={() => void startChallenge()}><RotateCcw size={14} /> Try loading the challenge again</button>}
      {result && (
        <div className="challenge-result">
          <span className="result-check"><Check size={22} /></span>
          <p className="eyebrow">YOUR CHALLENGE RESULT</p>
          <h3>{result.score}<span>%</span></h3>
          <p>You got {result.total ? Math.round((result.score / 100) * result.total) : 0} out of {result.total} right.</p>
          {result.discountPercent > 0 ? <div className="reward-ticket"><span>YOUR REWARD</span><strong>{result.discountPercent}% OFF</strong></div> : <p className="no-reward">Keep practising. Your next challenge is waiting.</p>}
          <Link className="button button-light" href={`/student/register?challenge=${result.attemptId}`}>Create account to save <ArrowRight size={15} /></Link>
          <button className="try-again" type="button" onClick={reset}><RotateCcw size={14} /> Play again</button>
        </div>
      )}
      {error && <p className="challenge-error" role="alert">{error}</p>}
    </div>
  );
}