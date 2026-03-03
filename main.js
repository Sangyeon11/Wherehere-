const PLACES = [
  {
    name: "한강 피크닉 존",
    category: "야외",
    summary: "가볍게 바람을 쐬고 싶을 때 좋은 선택입니다. 돗자리 하나만 챙겨도 오늘 하루가 훨씬 느긋해집니다.",
    bestTime: "오후 4시 - 해질녘",
    goodFor: "답답한 일정, 산책, 리프레시",
    vibe: "탁 트인, 시원한, 느긋한",
    highlight: "노을 시간에 만족도가 가장 높아요.",
    tips: [
      "근처 카페에서 음료를 먼저 사서 이동하면 동선이 편합니다.",
      "해가 진 뒤에는 기온이 떨어질 수 있으니 가벼운 겉옷이 좋습니다.",
      "짧게 머물러도 기분 전환 효과가 큽니다."
    ]
  },
  {
    name: "조용한 북카페",
    category: "실내",
    summary: "생각을 정리하거나 혼자만의 시간을 보내기 좋습니다. 소음이 적고, 오래 앉아 있기 편한 공간을 추천합니다.",
    bestTime: "오전 11시 - 오후 2시",
    goodFor: "집중, 혼자만의 시간, 가벼운 독서",
    vibe: "차분한, 집중되는, 안정적인",
    highlight: "짧은 독서와 메모를 곁들이면 만족도가 올라갑니다.",
    tips: [
      "해야 할 일을 한 가지 정해서 가면 시간을 더 잘 씁니다.",
      "사람이 몰리기 전 점심 이전 방문이 가장 쾌적합니다.",
      "이어폰보다 책이나 노트를 함께 가져가면 공간 활용도가 높습니다."
    ]
  },
  {
    name: "동네 전시 공간",
    category: "감성",
    summary: "큰 계획 없이도 감각을 환기하기 좋은 코스입니다. 짧은 관람만으로도 분위기 전환이 됩니다.",
    bestTime: "오후 1시 - 오후 5시",
    goodFor: "영감, 데이트, 가벼운 외출",
    vibe: "감각적인, 조용한, 영감이 생기는",
    highlight: "관람 후 근처 골목 산책까지 묶으면 좋습니다.",
    tips: [
      "관람 시간은 길지 않아도 충분합니다.",
      "사진 촬영 가능 여부를 먼저 확인하면 동선이 깔끔합니다.",
      "전시 후 근처 카페 한 곳만 함께 잡아도 하루 완성도가 올라갑니다."
    ]
  },
  {
    name: "야경 좋은 루프탑",
    category: "야외",
    summary: "하루를 마무리하며 도시의 분위기를 느끼기 좋습니다. 짧게 다녀와도 만족도가 높은 코스입니다.",
    bestTime: "저녁 7시 - 밤 9시",
    goodFor: "퇴근 후, 데이트, 야경 감상",
    vibe: "도시적인, 선선한, 분위기 있는",
    highlight: "조명 켜지는 시간대가 가장 좋습니다.",
    tips: [
      "앉을 수 있는 자리가 있는지 먼저 확인하세요.",
      "바람이 강한 날은 실내 좌석이 있는 곳이 더 안정적입니다.",
      "짧게 1시간 정도만 잡아도 충분히 좋습니다."
    ]
  },
  {
    name: "브런치 맛집 골목",
    category: "맛집",
    summary: "기분 전환이 필요할 때 가장 간단하고 확실한 선택입니다. 음식과 산책을 같이 즐기기 좋습니다.",
    bestTime: "오전 10시 - 오후 1시",
    goodFor: "주말 시작, 친구 만남, 가벼운 외출",
    vibe: "활기찬, 맛있는, 가벼운",
    highlight: "웨이팅 전에 가면 훨씬 여유롭습니다.",
    tips: [
      "메인 메뉴 하나와 음료 하나 정도로 가볍게 시작하는 편이 좋습니다.",
      "브런치 후 근처 편집숍이나 공원을 같이 묶어보세요.",
      "사람 많은 시간대를 피하면 만족도가 크게 올라갑니다."
    ]
  },
  {
    name: "식물 가득한 온실 카페",
    category: "감성",
    summary: "멀리 떠나지 않아도 작은 여행 같은 기분을 내기 좋습니다. 초록이 많은 공간은 피로감을 줄여줍니다.",
    bestTime: "오후 2시 - 오후 5시",
    goodFor: "사진, 대화, 휴식",
    vibe: "싱그러운, 따뜻한, 여유로운",
    highlight: "햇빛이 드는 시간대 사진이 가장 잘 나옵니다.",
    tips: [
      "창가 자리를 원하면 비교적 이른 방문이 유리합니다.",
      "대화 위주라면 소음이 적은 평일이 더 적합합니다.",
      "오래 있기보다 60~90분 정도가 가장 만족스럽습니다."
    ]
  }
];

const elements = {
  dateText: document.querySelector("#date-text"),
  placeTag: document.querySelector("#place-tag"),
  placeName: document.querySelector("#place-name"),
  placeSummary: document.querySelector("#place-summary"),
  bestTime: document.querySelector("#best-time"),
  goodFor: document.querySelector("#good-for"),
  vibe: document.querySelector("#vibe"),
  highlight: document.querySelector("#highlight"),
  tipList: document.querySelector("#tip-list")
};

function getTodaySeed() {
  const now = new Date();

  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function selectPlace() {
  const index = getTodaySeed() % PLACES.length;

  return PLACES[index];
}

function renderTips(tips) {
  elements.tipList.innerHTML = "";

  tips.forEach((tip) => {
    const item = document.createElement("li");
    item.textContent = tip;
    elements.tipList.appendChild(item);
  });
}

function renderRecommendation() {
  const pick = selectPlace();
  const now = new Date();

  elements.dateText.textContent = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
  elements.placeTag.textContent = pick.category;
  elements.placeName.textContent = pick.name;
  elements.placeSummary.textContent = pick.summary;
  elements.bestTime.textContent = pick.bestTime;
  elements.goodFor.textContent = pick.goodFor;
  elements.vibe.textContent = pick.vibe;
  elements.highlight.textContent = pick.highlight;
  renderTips(pick.tips);
}

renderRecommendation();
