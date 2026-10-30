import { useState } from 'react';
import type { Shift, Staff, Traits } from '../../sim/staff';
import { QUESTIONS, SHIFT_LABEL, answerOf, fire, hire, interview, postJob, setShift, setWage, shiftHours } from '../../sim/staffing';
import { won } from '../format';
import type { PanelProps } from './common';

const TRAIT_LABEL: Record<keyof Traits, string> = { speed: '손 빠르기', kindness: '친절함', diligence: '성실함', quitRisk: '오래 다닐까' };
const TRAIT_DAYS: Record<keyof Traits, number> = { speed: 7, kindness: 14, diligence: 21, quitRisk: 28 };
const SHIFTS: Shift[] = ['lunch', 'dinner', 'full'];

function stars(v: number): string {
  const n = Math.max(1, Math.min(5, Math.round(v * 5)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function TraitRow({ st }: { st: Staff }) {
  return (
    <span className="traits-line">
      {(Object.keys(TRAIT_LABEL) as (keyof Traits)[]).map((t) => (
        <span key={t} className="trait">
          {TRAIT_LABEL[t]} {st.revealed[t] ? stars(t === 'quitRisk' ? 1 - st.traits[t] : st.traits[t]) : `? (${TRAIT_DAYS[t]}일 뒤)`}
        </span>
      ))}
    </span>
  );
}

export function StaffPanel({ state, update }: PanelProps) {
  const min = state.economy.minWage;
  const [postWage, setPostWage] = useState(min + 500);
  const [postShift, setPostShift] = useState<Shift>('dinner');
  const [error, setError] = useState<string | null>(null);
  const safe = (fn: (s: typeof state) => typeof state) => {
    try {
      update(fn);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="panel">
      <h3>직원</h3>
      {error && <p className="warn" role="status">{error}</p>}
      <ul className="rows">
        <li className="row"><span className="row-icon" aria-hidden="true">🧑‍🍳</span><span className="row-main"><strong>사장님(나)</strong><span className="sub">항상 근무 · 시간당 피자 7판 · 급여 없음</span></span></li>
        {state.staff.map((st) => (
          <li key={st.id} className="row staff-row">
            <span className="row-icon" aria-hidden="true">🧑</span>
            <div className="row-main">
              <strong>{st.name} <span className="sub">({st.age}세 · {st.daysWorked}일째)</span></strong>
              <TraitRow st={st} />
              <div className="day-picker" role="group" aria-label={`${st.name} 근무 시간`}>
                {SHIFTS.map((sh) => (
                  <button key={sh} className="btn mini" aria-pressed={st.shift === sh} onClick={() => safe((s) => setShift(s, st.id, sh))}>
                    {SHIFT_LABEL[sh]} {shiftHours(state, sh)}시간
                  </button>
                ))}
              </div>
              <div className="setting-row">
                <span>시급</span>
                <button className="btn mini" aria-label={`${st.name} 시급 내리기`} disabled={st.wage - 100 < min} onClick={() => safe((s) => setWage(s, st.id, st.wage - 100))}>−</button>
                <b>{won(st.wage)}</b>
                <button className="btn mini" aria-label={`${st.name} 시급 올리기`} onClick={() => safe((s) => setWage(s, st.id, st.wage + 100))}>+</button>
              </div>
            </div>
            <button
              className="btn danger"
              aria-label={`${st.name} 내보내기`}
              onClick={() => { if (window.confirm(`${st.name}을(를) 내보낼까요?`)) safe((s) => fire(s, st.id)); }}
            >
              내보내기
            </button>
          </li>
        ))}
      </ul>
      <p className="sub">알바 한 명이 시간당 피자 5~9판을 더 만들어요(손 빠르기에 따라). 주 15시간 이상이면 주휴수당이 붙어요.</p>

      <h4>📋 채용 공고</h4>
      {state.jobPost ? (
        <p className="sub">공고를 냈어요({SHIFT_LABEL[state.jobPost.shift]} · 시급 {won(state.jobPost.wage)}). 내일 문을 열면 지원자가 와요.</p>
      ) : (
        <div className="card job-form">
          <div className="setting-row">
            <span>시급</span>
            <button className="btn mini" aria-label="공고 시급 내리기" disabled={postWage - 100 < min} onClick={() => setPostWage(postWage - 100)}>−</button>
            <b>{won(postWage)}</b>
            <button className="btn mini" aria-label="공고 시급 올리기" onClick={() => setPostWage(postWage + 100)}>+</button>
          </div>
          <div className="day-picker" role="group" aria-label="공고 근무 시간">
            {SHIFTS.map((sh) => (
              <button key={sh} className="btn mini" aria-pressed={postShift === sh} onClick={() => setPostShift(sh)}>{SHIFT_LABEL[sh]}</button>
            ))}
          </div>
          <p className="sub">시급을 높게 걸면 경력자가 더 와요. 최저임금은 시간당 {won(min)}이에요.</p>
          <button className="btn primary" onClick={() => safe((s) => postJob(s, Math.max(postWage, min), postShift))}>채용 공고 내기</button>
        </div>
      )}

      {state.applicants.length > 0 && (
        <>
          <h4>🙋 지원자</h4>
          <ul className="rows">
            {state.applicants.map((a) => (
              <li key={a.id} className="row applicant">
                <div className="row-main">
                  <strong>{a.name} <span className="sub">({a.age}세 · {a.experience} · {SHIFT_LABEL[a.shift]})</span></strong>
                  <span className="sub">희망 시급 {won(a.wantWage)} · 질문 {a.asked.length}/2</span>
                  <div className="questions">
                    {QUESTIONS.map((q, qi) => (
                      <div key={qi} className="question">
                        <button
                          className="btn mini"
                          aria-label={`${a.name}에게 「${q.q}」`}
                          disabled={a.asked.includes(qi) || a.asked.length >= 2}
                          onClick={() => safe((s) => interview(s, a.id, qi).state)}
                        >
                          {q.q}
                        </button>
                        {a.asked.includes(qi) && <p className="answer">💬 {answerOf(a, qi)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
                <button className="btn primary" aria-label={`${a.name} 채용`} onClick={() => safe((s) => hire(s, a.id))}>채용</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
