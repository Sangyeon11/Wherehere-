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
const KAKAO_AUTH_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.9/kakao.min.js";

// ── DOM REFS ─────────────────────────────────────────────────────
const el = {
  statusText:    document.querySelector("#status-text"),
  statusDot:     document.querySelector("#status-dot"),
  loginButton:   document.querySelector("#kakao-login-button"),
  loginStatus:   document.querySelector("#login-status"),
  loginDetail:   document.querySelector("#login-detail"),
  dateText:      document.querySelector("#date-text"),
  placeTag:      document.querySelector("#place-tag"),
  placeName:     document.querySelector("#place-name"),
  placeSummary:  document.querySelector("#place-summary"),
  placeAddress:  document.querySelector("#place-address"),
  placeDistance: document.querySelector("#place-distance"),
  placeCategory: document.querySelector("#place-category"),
  placePhone:    document.querySelector("#place-phone"),
  placeLink:     document.querySelector("#place-link"),
  tipList:       document.querySelector("#tip-list"),
  placeCard:     document.querySelector("#place-card"),
  loadingState:  document.querySelector("#loading-state"),
  placeContent:  document.querySelector("#place-content"),
};
let loginAction = null;

// ── HELPERS ──────────────────────────────────────────────────────
function createDiagnosticError(code, title, message, tips) {
  const error = new Error(message);
  error.code  = code;
  error.title = title;
  error.tips  = tips;
  return error;
}

function getTodaySeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

// ── STATUS UI ────────────────────────────────────────────────────
function setStatus(message, state /* 'loading' | 'done' | 'error' */ = "loading") {
  el.statusText.textContent = message;
  el.statusDot.className = "status-dot";
  if (state === "done")  el.statusDot.classList.add("done");
  if (state === "error") el.statusDot.classList.add("error");
}

function setLoginState(status, detail, isEnabled) {
  el.loginStatus.textContent = status;
  el.loginDetail.textContent = detail;
  el.loginButton.disabled    = !isEnabled;
}

function setLoginAction(label, isEnabled, action) {
  el.loginButton.textContent = label;
  el.loginButton.disabled = !isEnabled;
  loginAction = isEnabled ? action : null;
}

el.loginButton.addEventListener("click", () => {
  if (loginAction && !el.loginButton.disabled) {
    loginAction();
  }
});

// ── RENDER DATE ──────────────────────────────────────────────────
function renderDate() {
  el.dateText.textContent = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long"
  });
}

// ── RENDER TIPS ──────────────────────────────────────────────────
function renderTips(tips) {
  el.tipList.innerHTML = "";
  tips.forEach((tip, i) => {
    const li = document.createElement("li");
    li.textContent = tip;
    li.style.animationDelay = (i * 0.08) + "s";
    el.tipList.appendChild(li);
  });
}

// ── RENDER SKELETON TIPS (while loading) ────────────────────────
function renderSkeletonTips() {
  el.tipList.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const li = document.createElement("li");
    li.className = "skeleton";
    li.style.height = "48px";
    li.style.animationDelay = (i * 0.2) + "s";
    el.tipList.appendChild(li);
  }
}

// ── SHOW / HIDE LOADING STATE ────────────────────────────────────
function showLoadingState() {
  el.loadingState.style.display = "flex";
  el.placeContent.style.display = "none";
  el.placeCard.classList.remove("loaded");
  renderSkeletonTips();
}

function showPlaceContent() {
  el.loadingState.style.display = "none";
  el.placeContent.style.display = "block";
  el.placeCard.classList.add("loaded");
  // Stagger-in animation
  el.placeContent.style.animation = "fadeUp 0.5s ease both";
}

// ── DIAGNOSTIC / ERROR STATE ─────────────────────────────────────
function renderDiagnosticState(title, message, tips) {
  renderDate();
  el.placeTag.textContent     = "오류";
  el.placeName.textContent    = title;
  el.placeSummary.textContent = message;
  el.placeAddress.textContent = "오류 상태";
  el.placeDistance.textContent = "자동 추천 중단";
  el.placeCategory.textContent = "진단 필요";
  el.placePhone.textContent   = "브라우저 콘솔도 확인";
  el.placeLink.removeAttribute("href");
  el.placeLink.setAttribute("aria-disabled", "true");
  el.placeLink.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/>
      <path d="M7 4v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="7" cy="10" r="0.75" fill="currentColor"/>
    </svg>
    오류 내용을 확인해주세요
  `;
  renderTips(tips);
  showPlaceContent();
  setStatus(message, "error");
}

// ── REDIRECT URI ─────────────────────────────────────────────────
function getLoginRedirectUri() {
  return (
    (window.WHEREHERE_CONFIG && window.WHEREHERE_CONFIG.kakaoLoginRedirectUri) ||
    window.location.origin + window.location.pathname
  );
}

function parseLoginResponse() {
  const params = new URLSearchParams(window.location.search);
  return {
    code:             params.get("code"),
    error:            params.get("error"),
    errorDescription: params.get("error_description")
  };
}

function clearLoginResponseParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());
}

async function exchangeKakaoCode(code, redirectUri) {
  const response = await fetch("/api/kakao-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      code,
      redirectUri
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createDiagnosticError(
      data.code || "KAKAO_TOKEN_EXCHANGE_FAILED",
      data.title || "카카오 토큰 교환 실패",
      data.message || "인가 코드를 액세스 토큰으로 바꾸지 못했습니다.",
      data.tips || [
        "Pages Functions가 배포되었는지 확인하세요.",
        "서버 환경 변수 KAKAO_REST_API_KEY가 설정되어 있는지 확인하세요.",
        "Redirect URI 설정을 다시 확인하세요."
      ]
    );
  }

  return data;
}

function formatUserSummary(user) {
  const account = user.kakao_account || {};
  const profile = account.profile || {};
  const nickname = profile.nickname || "이름 정보 없음";
  const email = account.email ? " / " + account.email : "";

  return nickname + email;
}

// ── KAKAO AUTH SDK ───────────────────────────────────────────────
function loadKakaoAuthSdk(key) {
  return new Promise((resolve, reject) => {
    if (window.Kakao && window.Kakao.Auth) {
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      resolve(); return;
    }
    const script = document.createElement("script");
    script.src = KAKAO_AUTH_SDK_URL;
    script.onload = () => {
      if (!window.Kakao) {
        reject(createDiagnosticError(
          "KAKAO_LOGIN_SDK_MISSING", "카카오 로그인 SDK 초기화 실패",
          "카카오 로그인 SDK 파일은 내려왔지만 window.Kakao 객체가 생성되지 않았습니다.",
          ["브라우저 확장 프로그램이 스크립트를 변형하는지 확인하세요.", "강력 새로고침 후 다시 시도하세요.", "다른 브라우저에서 같은 페이지를 열어보세요."]
        )); return;
      }
      window.Kakao.init(key);
      resolve();
    };
    script.onerror = () => reject(createDiagnosticError(
      "KAKAO_LOGIN_SDK_LOAD_FAILED", "카카오 로그인 SDK 다운로드 실패",
      "카카오 로그인 SDK를 내려받지 못했습니다. 네트워크 차단이나 브라우저 확장 프로그램이 원인일 수 있습니다.",
      ["광고 차단 확장 프로그램을 끄고 다시 시도하세요.", "시크릿 모드 또는 다른 브라우저에서 열어보세요.", "잠시 후 다시 새로고침해보세요."]
    ));
    document.head.appendChild(script);
  });
}

async function initializeKakaoLogin(key) {
  const redirectUri    = getLoginRedirectUri();
  const loginResponse  = parseLoginResponse();
  try {
    await loadKakaoAuthSdk(key);
    setLoginAction("카카오 로그인 시작", true, () => {
      window.Kakao.Auth.authorize({ redirectUri });
    });

    if (loginResponse.code) {
      setLoginState("카카오 로그인 처리 중", "인가 코드를 토큰으로 교환하고 사용자 정보를 확인하고 있습니다.", false);
      setLoginAction("로그인 처리 중", false, null);

      const authResult = await exchangeKakaoCode(loginResponse.code, redirectUri);

      if (window.Kakao && window.Kakao.Auth && authResult.access_token) {
        window.Kakao.Auth.setAccessToken(authResult.access_token);
      }

      clearLoginResponseParams();
      setLoginState("카카오 로그인 완료", "현재 로그인 사용자: " + formatUserSummary(authResult.user), true);
      setLoginAction("카카오 로그아웃", true, async () => {
        try {
          if (window.Kakao && window.Kakao.Auth) {
            await window.Kakao.Auth.logout();
          }
        } finally {
          window.location.href = getLoginRedirectUri();
        }
      });
      return;
    }
    if (loginResponse.error) {
      setLoginState("카카오 로그인 응답 오류", (loginResponse.errorDescription || loginResponse.error) + " — Redirect URI와 로그인 설정을 다시 확인하세요.", true);
      setLoginAction("카카오 로그인 다시 시도", true, () => {
        window.Kakao.Auth.authorize({ redirectUri });
      });
      return;
    }
    setLoginState("카카오 로그인 가능", "현재 Redirect URI: " + redirectUri, true);
    setLoginAction("카카오 로그인 시작", true, () => {
      window.Kakao.Auth.authorize({ redirectUri });
    });
  } catch (error) {
    setLoginState(error.title || "카카오 로그인 준비 실패", error.message || "카카오 로그인 SDK를 준비하지 못했습니다.", false);
    setLoginAction("카카오 로그인 준비 실패", false, null);
  }
}

// ── KAKAO MAPS SDK ───────────────────────────────────────────────
function loadKakaoSdk(key) {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      resolve(); return;
    }
    const script = document.createElement("script");
    script.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + encodeURIComponent(key) + "&autoload=false&libraries=services";
    script.onload = () => {
      if (!window.kakao || !window.kakao.maps) {
        reject(createDiagnosticError(
          "KAKAO_SDK_INVALID", "Kakao SDK 초기화 실패",
          "스크립트는 내려왔지만 Kakao 객체가 생성되지 않았습니다. JavaScript 키가 잘못됐거나, 등록한 플랫폼 도메인이 현재 사이트와 다를 수 있습니다.",
          ["앱 키에서 JavaScript 키가 현재 값과 정확히 일치하는지 확인하세요.", "플랫폼 > Web에 도메인이 등록되어 있는지 확인하세요.", "브라우저 강력 새로고침 후 다시 시도하세요."]
        )); return;
      }
      window.kakao.maps.load(() => {
        if (!window.kakao.maps.services) {
          reject(createDiagnosticError(
            "KAKAO_SERVICE_MISSING", "Kakao Places 라이브러리 로드 실패",
            "Kakao Maps는 로드됐지만 Places 서비스 객체가 없습니다.",
            ["브라우저 확장 프로그램이 dapi.kakao.com 요청을 막는지 확인하세요.", "시크릿 모드나 다른 브라우저에서 다시 열어보세요.", "강력 새로고침 후 다시 확인하세요."]
          )); return;
        }
        resolve();
      });
    };
    script.onerror = () => reject(createDiagnosticError(
      "KAKAO_SDK_LOAD_FAILED", "Kakao SDK 다운로드 실패",
      "https://dapi.kakao.com 의 SDK 스크립트를 내려받지 못했습니다.",
      ["JavaScript 키가 config.js 값과 같은지 확인하세요.", "플랫폼 > Web에 도메인이 등록되어 있는지 확인하세요.", "광고 차단 확장이 dapi.kakao.com 을 차단하는지 확인하세요."]
    ));
    document.head.appendChild(script);
  });
}

// ── GEOLOCATION ──────────────────────────────────────────────────
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(createDiagnosticError(
        "GEOLOCATION_UNSUPPORTED", "위치 정보 미지원 브라우저",
        "이 브라우저는 위치 정보를 지원하지 않습니다.",
        ["Chrome, Edge, Safari 같은 최신 브라우저에서 다시 시도하세요.", "다른 브라우저에서 같은 주소를 열어 확인하세요."]
      )); return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(createDiagnosticError(
            "GEOLOCATION_DENIED", "위치 권한이 차단되었습니다",
            "브라우저가 현재 사이트의 위치 접근을 차단했습니다.",
            ["주소창 왼쪽 아이콘을 눌러 위치 권한을 허용으로 바꾸세요.", "권한을 바꾼 뒤 페이지를 새로고침하세요.", "브라우저가 차단 상태를 기억하면 팝업이 다시 안 뜰 수 있습니다."]
          )); return;
        }
        if (error.code === error.TIMEOUT) {
          reject(createDiagnosticError(
            "GEOLOCATION_TIMEOUT", "위치 확인 시간 초과",
            "브라우저가 제한 시간 안에 현재 위치를 가져오지 못했습니다.",
            ["실내나 위치 신호가 약한 환경이면 시간이 더 걸릴 수 있습니다.", "잠시 후 다시 새로고침해 재시도하세요."]
          )); return;
        }
        reject(createDiagnosticError(
          "GEOLOCATION_FAILED", "위치 정보를 가져오지 못했습니다",
          "브라우저가 현재 위치를 반환하지 못했습니다.",
          ["브라우저의 위치 서비스 설정을 확인하세요.", "새로고침 후 다시 시도하세요."]
        ));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

// ── KAKAO PLACE SEARCH ───────────────────────────────────────────
function categorySearch(places, categoryCode, longitude, latitude) {
  return new Promise((resolve, reject) => {
    places.categorySearch(
      categoryCode,
      (data, status) => {
        if (status === window.kakao.maps.services.Status.OK)          { resolve(data); return; }
        if (status === window.kakao.maps.services.Status.ZERO_RESULT) { resolve([]);   return; }
        reject(createDiagnosticError(
          "KAKAO_PLACE_SEARCH_FAILED", "Kakao Places 검색 실패",
          "Kakao Places API가 정상 결과를 돌려주지 않았습니다.",
          ["Kakao Developers의 플랫폼 등록과 JavaScript 키를 다시 확인하세요.", "잠시 후 새로고침해 다시 시도하세요.", "브라우저 콘솔에 추가 에러가 있는지 확인하세요."]
        ));
      },
      {
        location: new window.kakao.maps.LatLng(latitude, longitude),
        radius:   SEARCH_RADIUS_METERS,
        sort:     window.kakao.maps.services.SortBy.DISTANCE
      }
    );
  });
}

async function findNearbyPlace(longitude, latitude) {
  const places     = new window.kakao.maps.services.Places();
  const startIndex = getTodaySeed() % CATEGORY_ROTATION.length;

  for (let offset = 0; offset < CATEGORY_ROTATION.length; offset++) {
    const category = CATEGORY_ROTATION[(startIndex + offset) % CATEGORY_ROTATION.length];
    const results  = await categorySearch(places, category.code, longitude, latitude);

    if (!results.length) continue;

    const pickIndex = getTodaySeed() % Math.min(results.length, 5);
    return { category, place: results[pickIndex] };
  }

  throw createDiagnosticError(
    "NO_PLACE_FOUND", "주변 추천 장소 없음",
    "현재 위치 기준 3km 안에서 오늘의 조건에 맞는 장소를 찾지 못했습니다.",
    ["위치가 너무 외곽이면 결과가 적을 수 있습니다.", "잠시 후 다시 열면 다른 카테고리 후보가 잡힐 수 있습니다.", "위치를 바꿔 다시 시도해보세요."]
  );
}

// ── FORMAT HELPERS ───────────────────────────────────────────────
function formatDistance(distance) {
  const meters = Number(distance || 0);
  if (!meters)           return "거리 정보 없음";
  if (meters >= 1000)    return (meters / 1000).toFixed(1) + "km";
  return meters + "m";
}

function buildKakaoMapLink(place) {
  return place.place_url || "https://map.kakao.com/link/search/" + encodeURIComponent(place.place_name);
}

// ── RENDER PLACE ─────────────────────────────────────────────────
function renderPlace(recommendation) {
  const { category, place } = recommendation;
  const address = place.road_address_name || place.address_name || "주소 정보 없음";
  const phone   = place.phone || "전화번호 정보 없음";

  renderDate();
  el.placeTag.textContent     = "KAKAO " + category.label;
  el.placeName.textContent    = place.place_name;
  el.placeSummary.textContent = category.summary;
  el.placeAddress.textContent = address;
  el.placeDistance.textContent = formatDistance(place.distance);
  el.placeCategory.textContent = place.category_name || category.label;
  el.placePhone.textContent   = phone;
  el.placeLink.href            = buildKakaoMapLink(place);
  el.placeLink.setAttribute("aria-disabled", "false");
  el.placeLink.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7h10M7.5 2.5L12 7l-4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    카카오맵에서 바로 열기
  `;
  renderTips(category.tips);
  showPlaceContent();
  setStatus("현재 위치 기준 " + SEARCH_RADIUS_METERS / 1000 + "km 안에서 찾은 실제 장소입니다.", "done");
}

// ── INIT ──────────────────────────────────────────────────────────
async function initialize() {
  const key = window.WHEREHERE_CONFIG && window.WHEREHERE_CONFIG.kakaoJavaScriptKey;

  if (!key) {
    setLoginState("카카오 로그인 준비 실패", "JavaScript 키가 비어 있어 카카오 로그인 버튼을 활성화할 수 없습니다.", false);
    renderDiagnosticState(
      "Kakao JavaScript 키가 비어 있습니다",
      "config.js의 kakaoJavaScriptKey 값이 비어 있어 Kakao SDK를 시작할 수 없습니다.",
      ["config.js 파일의 kakaoJavaScriptKey 값에 JavaScript 키를 넣으세요.", "REST API 키가 아니라 JavaScript 키여야 합니다.", "수정 후 페이지를 새로고침하세요."]
    );
    return;
  }

  initializeKakaoLogin(key);
  showLoadingState();

  try {
    setStatus("Kakao Places를 준비하고 있습니다.");
    await loadKakaoSdk(key);

    setStatus("현재 위치를 확인하고 있습니다.");
    const position  = await getCurrentPosition();
    const latitude  = position.coords.latitude;
    const longitude = position.coords.longitude;

    setStatus("근처 실제 장소 한 곳을 찾고 있습니다.");
    const recommendation = await findNearbyPlace(longitude, latitude);

    renderPlace(recommendation);
  } catch (error) {
    renderDiagnosticState(
      error.title || "알 수 없는 오류",
      error.message || "예상하지 못한 오류가 발생했습니다.",
      error.tips || [
        "브라우저 강력 새로고침 후 다시 시도하세요.",
        "Kakao Developers 설정을 다시 확인하세요.",
        "브라우저 콘솔 메시지도 함께 확인하세요."
      ]
    );
  }
}

initialize();
