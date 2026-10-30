// 이름 있는 단골: 동네마다 8명. 리뷰가 이 사람들 이름으로 오고, 사장님 답장을 기억한다.
// 장사 숫자(손님 수)는 건드리지 않는다. 말풍선 이야기로만 쓴다.
import type { NeighborhoodId } from '../sim/neighborhoods';

export interface RegularDef {
  id: string;
  name: string;
  ch: 'delivery' | 'hall';
  /** 리뷰 끝에 붙는 말버릇 */
  tail: string;
}

export const REGULARS: Record<NeighborhoodId, RegularDef[]> = {
  campus: [
    { id: 'c-allnighter', name: '밤샘공대생', ch: 'delivery', tail: '설계 과제의 동반자 💻' },
    { id: 'c-dorm', name: '기숙사3층', ch: 'delivery', tail: '층 사람들이랑 나눠 먹어요' },
    { id: 'c-library', name: '도서관지박령', ch: 'delivery', tail: '열람실 나와서 바로 먹는 중 📚' },
    { id: 'c-leave', name: '휴학생J', ch: 'delivery', tail: '알바 끝나고 한 판' },
    { id: 'c-hoops', name: '농구동아리', ch: 'delivery', tail: '경기 끝나고 단체로 ⛹️' },
    { id: 'c-top', name: '과탑지망생', ch: 'delivery', tail: '시험 끝나면 또 시킬게요 ✍️' },
    { id: 'c-leader', name: '조별과제 팀장', ch: 'hall', tail: '회의하기 딱 좋아요' },
    { id: 'c-senior', name: '4학년 선배', ch: 'hall', tail: '후배들 데리고 또 올게요' },
  ],
  office: [
    { id: 'o-choi', name: '최대리', ch: 'delivery', tail: '점심 30분 컷 ⏱️' },
    { id: 'o-lee', name: '이팀장', ch: 'delivery', tail: '팀원들도 여기 좋아해요' },
    { id: 'o-night', name: '야근장인', ch: 'delivery', tail: '야근의 동반자 🌃' },
    { id: 'o-explorer', name: '점심탐험가', ch: 'delivery', tail: '이 동네 점심 지도에 저장 📍' },
    { id: 'o-early', name: '칼퇴요정', ch: 'delivery', tail: '오늘은 칼퇴 성공 🙏' },
    { id: 'o-rookie', name: '막내사원', ch: 'delivery', tail: '선배들 심부름 겸 제 것도 ㅎㅎ' },
    { id: 'o-yoon', name: '재무팀 윤과장', ch: 'hall', tail: '가격 대비 괜찮아요(재무팀 기준)' },
    { id: 'o-meeting', name: '회의실 단골', ch: 'hall', tail: '회의 끝나고 한 조각' },
  ],
  residential: [
    { id: 'r-twins', name: '쌍둥이맘', ch: 'delivery', tail: '애들이 제일 좋아해요 👧👦' },
    { id: 'r-dad', name: '주말아빠', ch: 'delivery', tail: '주말 루틴 🍕' },
    { id: 'r-after', name: '육퇴맘', ch: 'delivery', tail: '육퇴 후 꿀맛' },
    { id: 'r-student', name: '중3 수험생', ch: 'delivery', tail: '학원 끝나고 출출할 때' },
    { id: 'r-poodle', name: '산책하는 푸들', ch: 'delivery', tail: '산책 끝나고 시켰어요 🐕' },
    { id: 'r-newlyweds', name: '202호 신혼부부', ch: 'delivery', tail: '집들이 때도 시킬게요' },
    { id: 'r-grandma', name: '은행나무 할머니', ch: 'hall', tail: '사장님이 늘 친절해서 와요' },
    { id: 'r-master', name: '태권도 관장님', ch: 'hall', tail: '애들 승급 기념으로 왔어요 🥋' },
  ],
};

/** 지난번 답장을 기억하는 말: {name}은 사장님이 아닌 손님 자신 */
export const REGULAR_TEXT = {
  thanks: ['지난번에 사과해 주셔서 또 시켰어요. 이번엔 좋네요 😊', '사장님 답글 보고 다시 왔어요. 역시 여기예요!'],
  thanksCoupon: ['지난번 쿠폰 잘 썼어요. 이번엔 만족이에요 🎟️'],
  grudge: ['지난번에 리뷰에 따지셔서 서운했는데… 이번에도 별로네요', '답글 보고 좀 그랬어요. 이번에도 아쉬워요'],
  back: ['오랜만에 시켜 봐요. 예전 그 맛인지 볼게요', '한동안 안 왔는데, 다시 와 봤어요'],
};
