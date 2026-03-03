const CATEGORY_ROTATION = [
  {
    code: "CE7",
    label: "카페",
    summary: "오늘은 가까운 카페 한 곳을 바로 찍어드립니다. 오래 고민하지 않고 바로 이동하기 좋은 선택입니다.",
    tips: [
      "지금 출발하면 가장 빠르게 도착할 수 있는 후보입니다.",
      "자리가 붐비기 전 짧게 다녀오기 좋습니다.",
      "이동 동선이 짧아서 오늘 일정 사이에 끼워 넣기 쉽습니다."
    ]
  },
  {
    code: "FD6",
    label: "음식점",
    summary: "오늘은 가까운 식사 장소 한 곳을 추천합니다. 이동 부담이 적고 바로 목적지가 명확한 선택입니다.",
    tips: [
      "식사 시간을 기준으로 바로 들르기 좋습니다.",
      "멀리 가지 않아도 되는 근거리 후보를 우선으로 잡았습니다.",
      "오늘 일정 중 가장 단순하게 실행하기 좋은 코스입니다."
    ]
  },
  {
    code: "CT1",
    label: "문화시설",
    summary: "오늘은 근처 문화시설 한 곳을 제안합니다. 짧게 분위기를 바꾸고 싶을 때 적합한 선택입니다.",
    tips: [
      "오래 머무르지 않아도 기분 전환이 됩니다.",
      "근처 카페나 산책 동선과 묶기 좋습니다.",
      "일정 사이 짧은 방문 코스로도 충분합니다."
    ]
  },
  {
    code: "AT4",
    label: "관광명소",
    summary: "오늘은 주변에서 바로 갈 수 있는 명확한 스팟 한 곳을 추천합니다. 짧은 외출 목적지로 적합합니다.",
    tips: [
      "가볍게 이동해 사진이나 산책을 하기 좋습니다.",
      "멀리 계획하지 않아도 오늘의 목적지가 분명해집니다.",
      "도착 후 30분에서 1시간 정도만 써도 만족도가 높습니다."
    ]
  }
];

const SEARCH_RADIUS_METERS = 3000;

const elements = {
  statusText: document.querySelector("#status-text"),
  dateText: document.querySelector("#date-text"),
  placeTag: document.querySelector("#place-tag"),
  placeName: document.querySelector("#place-name"),
  placeSummary: document.querySelector("#place-summary"),
  placeAddress: document.querySelector("#place-address"),
  placeDistance: document.querySelector("#place-distance"),
  placeCategory: document.querySelector("#place-category"),
  placePhone: document.querySelector("#place-phone"),
  placeLink: document.querySelector("#place-link"),
  tipList: document.querySelector("#tip-list")
};

function getTodaySeed() {
  const now = new Date();

  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function renderTips(tips) {
  elements.tipList.innerHTML = "";

  tips.forEach((tip) => {
    const item = document.createElement("li");
    item.textContent = tip;
    elements.tipList.appendChild(item);
  });
}

function renderDate() {
  const now = new Date();

  elements.dateText.textContent = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

function renderSetupState(message) {
  renderDate();
  elements.placeTag.textContent = "KAKAO SETUP";
  elements.placeName.textContent = "Kakao JavaScript 키가 필요합니다";
  elements.placeSummary.textContent = message;
  elements.placeAddress.textContent = "config.js의 kakaoJavaScriptKey";
  elements.placeDistance.textContent = "설정 후 자동 계산";
  elements.placeCategory.textContent = "Kakao Places";
  elements.placePhone.textContent = "키 설정 필요";
  elements.placeLink.removeAttribute("href");
  elements.placeLink.setAttribute("aria-disabled", "true");
  elements.placeLink.textContent = "config.js에 키를 넣어주세요";
  renderTips([
    "Kakao Developers에서 JavaScript 키를 발급받아야 합니다.",
    "config.js의 kakaoJavaScriptKey 값에 키를 넣으면 됩니다.",
    "키를 넣은 뒤 페이지를 새로고침하면 근처 실제 장소 1곳을 찾습니다."
  ]);
  setStatus(message);
}

function loadKakaoSdk(key) {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" +
      encodeURIComponent(key) +
      "&autoload=false&libraries=services";
    script.onload = () => {
      window.kakao.maps.load(resolve);
    };
    script.onerror = () => {
      reject(new Error("Kakao SDK를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("브라우저가 위치 정보를 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    });
  });
}

function categorySearch(places, categoryCode, longitude, latitude) {
  return new Promise((resolve, reject) => {
    places.categorySearch(
      categoryCode,
      (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          resolve(data);
          return;
        }

        if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          resolve([]);
          return;
        }

        reject(new Error("Kakao Places 검색에 실패했습니다."));
      },
      {
        location: new window.kakao.maps.LatLng(latitude, longitude),
        radius: SEARCH_RADIUS_METERS,
        sort: window.kakao.maps.services.SortBy.DISTANCE
      }
    );
  });
}

async function findNearbyPlace(longitude, latitude) {
  const places = new window.kakao.maps.services.Places();
  const startIndex = getTodaySeed() % CATEGORY_ROTATION.length;

  for (let offset = 0; offset < CATEGORY_ROTATION.length; offset += 1) {
    const category = CATEGORY_ROTATION[(startIndex + offset) % CATEGORY_ROTATION.length];
    const results = await categorySearch(places, category.code, longitude, latitude);

    if (!results.length) {
      continue;
    }

    const pickIndex = getTodaySeed() % Math.min(results.length, 5);

    return {
      category,
      place: results[pickIndex]
    };
  }

  throw new Error("주변 3km 안에서 추천할 장소를 찾지 못했습니다.");
}

function formatDistance(distance) {
  const meters = Number(distance || 0);

  if (!meters) {
    return "거리 정보 없음";
  }

  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + "km";
  }

  return meters + "m";
}

function buildKakaoMapLink(place) {
  if (place.place_url) {
    return place.place_url;
  }

  const query = encodeURIComponent(place.place_name);

  return "https://map.kakao.com/link/search/" + query;
}

function renderPlace(recommendation) {
  const { category, place } = recommendation;
  const address = place.road_address_name || place.address_name || "주소 정보 없음";
  const phone = place.phone || "전화번호 정보 없음";

  renderDate();
  elements.placeTag.textContent = "KAKAO " + category.label;
  elements.placeName.textContent = place.place_name;
  elements.placeSummary.textContent = category.summary;
  elements.placeAddress.textContent = address;
  elements.placeDistance.textContent = formatDistance(place.distance);
  elements.placeCategory.textContent = place.category_name || category.label;
  elements.placePhone.textContent = phone;
  elements.placeLink.href = buildKakaoMapLink(place);
  elements.placeLink.setAttribute("aria-disabled", "false");
  elements.placeLink.textContent = "카카오맵에서 바로 열기";
  renderTips(category.tips);
  setStatus("현재 위치 기준 " + SEARCH_RADIUS_METERS / 1000 + "km 안에서 찾은 실제 장소입니다.");
}

async function initialize() {
  const key = window.WHEREHERE_CONFIG && window.WHEREHERE_CONFIG.kakaoJavaScriptKey;

  if (!key) {
    renderSetupState("config.js에 Kakao JavaScript 키를 입력해야 실제 장소 검색이 동작합니다.");
    return;
  }

  try {
    setStatus("Kakao Places를 준비하고 있습니다.");
    await loadKakaoSdk(key);

    setStatus("현재 위치를 확인하고 있습니다.");
    const position = await getCurrentPosition();
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    setStatus("근처 실제 장소 한 곳을 찾고 있습니다.");
    const recommendation = await findNearbyPlace(longitude, latitude);

    renderPlace(recommendation);
  } catch (error) {
    renderSetupState(error.message);
  }
}

initialize();
