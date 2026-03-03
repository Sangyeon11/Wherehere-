const CATEGORY_ROTATION = [
  { code: "CE7", label: "카페", summary: "지금 가장 빠르게 들를 수 있는 로컬 카페 한 곳을 추천합니다." },
  { code: "FD6", label: "음식점", summary: "오늘 동네에서 바로 갈 수 있는 식사 장소 한 곳입니다." },
  { code: "CT1", label: "문화시설", summary: "잠깐 머물러도 기분 전환이 되는 동네 문화시설 한 곳입니다." },
  { code: "AT4", label: "관광명소", summary: "오늘의 이동 목적지가 될 만한 주변 스팟 한 곳입니다." }
];

const SEARCH_RADIUS_METERS = 3000;
const KAKAO_AUTH_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.9/kakao.min.js";
const SESSION_KEY = "wherehere_login_session_v2";
const THEME_KEY = "wherehere_theme_v1";

const el = {
  statusDot: document.querySelector("#status-dot"),
  statusText: document.querySelector("#status-text"),
  themeToggleButton: document.querySelector("#theme-toggle-button"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab-button]")),
  tabPanels: Array.from(document.querySelectorAll("[data-tab-panel]")),
  loginButton: document.querySelector("#kakao-login-button"),
  loginStatus: document.querySelector("#login-status"),
  loginDetail: document.querySelector("#login-detail"),
  profileChip: document.querySelector("#profile-chip"),
  profileName: document.querySelector("#profile-name"),
  profileMeta: document.querySelector("#profile-meta"),
  dateText: document.querySelector("#date-text"),
  placeTag: document.querySelector("#place-tag"),
  placeName: document.querySelector("#place-name"),
  placeSummary: document.querySelector("#place-summary"),
  placeAddress: document.querySelector("#place-address"),
  placeDistance: document.querySelector("#place-distance"),
  placeCategory: document.querySelector("#place-category"),
  placePhone: document.querySelector("#place-phone"),
  placeLink: document.querySelector("#place-link"),
  localArea: document.querySelector("#local-area"),
  areaTitle: document.querySelector("#area-title"),
  areaSummary: document.querySelector("#area-summary"),
  metricPosts: document.querySelector("#metric-posts"),
  metricGatherings: document.querySelector("#metric-gatherings"),
  metricRating: document.querySelector("#metric-rating"),
  metricComments: document.querySelector("#metric-comments"),
  postForm: document.querySelector("#post-form"),
  postType: document.querySelector("#post-type"),
  postRating: document.querySelector("#post-rating"),
  postTitle: document.querySelector("#post-title"),
  postBody: document.querySelector("#post-body"),
  postTime: document.querySelector("#post-time"),
  photoInput: document.querySelector("#photo-input"),
  photoPreviewWrap: document.querySelector("#photo-preview-wrap"),
  photoPreview: document.querySelector("#photo-preview"),
  clearPhotoButton: document.querySelector("#clear-photo-button"),
  gatheringList: document.querySelector("#gathering-list"),
  reviewList: document.querySelector("#review-list"),
  feedList: document.querySelector("#feed-list"),
  feedSummary: document.querySelector("#feed-summary"),
  sharePlaceButton: document.querySelector("#share-place-button"),
  copyInstagramButton: document.querySelector("#copy-instagram-button"),
  toast: document.querySelector("#toast")
};

const state = {
  currentPlace: null,
  user: null,
  loginAction: null,
  photoDataUrl: "",
  localAreaName: "내 주변 동네",
  posts: []
};

function createDiagnosticError(code, title, message) {
  const error = new Error(message);
  error.code = code;
  error.title = title;
  return error;
}

function getTodaySeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function setStatus(message, type = "loading") {
  el.statusText.textContent = message;
  el.statusDot.className = "status-dot";
  if (type === "done") el.statusDot.classList.add("done");
  if (type === "error") el.statusDot.classList.add("error");
}

function setLoginState(status, detail, enabled) {
  el.loginStatus.textContent = status;
  el.loginDetail.textContent = detail;
  el.loginButton.disabled = !enabled;
}

function setLoginAction(label, enabled, action) {
  el.loginButton.textContent = label;
  el.loginButton.disabled = !enabled;
  state.loginAction = enabled ? action : null;
}

function setActiveTab(tabName) {
  el.tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabButton === tabName);
  });
  el.tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.tabPanel === tabName);
  });
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  el.themeToggleButton.textContent = theme === "light" ? "다크 모드" : "라이트 모드";
  localStorage.setItem(THEME_KEY, theme);
}

function initializeTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  applyTheme(stored === "light" ? "light" : "dark");
}

function renderDate() {
  el.dateText.textContent = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

function showToast(message) {
  el.toast.hidden = false;
  el.toast.textContent = message;
  clearTimeout(showToast.timerId);
  showToast.timerId = setTimeout(() => {
    el.toast.hidden = true;
  }, 2200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function relativeTime(timestamp) {
  const date = new Date(timestamp);
  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return diffMinutes + "분 전";
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return diffHours + "시간 전";
  return Math.round(diffHours / 24) + "일 전";
}

function formatDistance(distance) {
  const meters = Number(distance || 0);
  if (!meters) return "거리 정보 없음";
  if (meters >= 1000) return (meters / 1000).toFixed(1) + "km";
  return meters + "m";
}

function buildKakaoMapLink(place) {
  return place.place_url || "https://map.kakao.com/link/search/" + encodeURIComponent(place.place_name);
}

function getLoginRedirectUri() {
  return (
    (window.WHEREHERE_CONFIG && window.WHEREHERE_CONFIG.kakaoLoginRedirectUri) ||
    window.location.origin + window.location.pathname
  );
}

function parseLoginResponse() {
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get("code"),
    error: params.get("error"),
    errorDescription: params.get("error_description")
  };
}

function clearLoginResponseParams() {
  const url = new URL(window.location.href);
  ["code", "error", "error_description", "state"].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState({}, "", url.toString());
}

function formatUserSummary(user) {
  const account = user.kakao_account || {};
  const profile = account.profile || {};
  const nickname = profile.nickname || "이름 정보 없음";
  const email = account.email ? " / " + account.email : "";
  return nickname + email;
}

function getDisplayName() {
  if (!state.user) return "게스트";
  const account = state.user.kakao_account || {};
  const profile = account.profile || {};
  return profile.nickname || "카카오 사용자";
}

function loadSessionUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setProfile(user) {
  state.user = user;
  if (!user) {
    sessionStorage.removeItem(SESSION_KEY);
    el.profileChip.textContent = "로그인 대기";
    el.profileName.textContent = "게스트 모드";
    el.profileMeta.textContent = "로그인하면 작성자명이 카카오 프로필 기준으로 채워집니다.";
    return;
  }
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
  }
  const account = user.kakao_account || {};
  const profile = account.profile || {};
  el.profileChip.textContent = "로그인 완료";
  el.profileName.textContent = profile.nickname || "카카오 사용자";
  el.profileMeta.textContent = account.email || "이메일 비공개";
}

async function apiRequest(path, init = {}) {
  const response = await fetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createDiagnosticError(
      data.code || "API_ERROR",
      data.title || "요청 실패",
      data.message || "서버 요청에 실패했습니다."
    );
  }
  return data;
}

async function loadFeedFromApi() {
  const data = await apiRequest("/api/feed");
  state.posts = Array.isArray(data.posts) ? data.posts : [];
}

async function createPostOnApi(payload) {
  const data = await apiRequest("/api/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return data.post;
}

async function createCommentOnApi(payload) {
  const data = await apiRequest("/api/feed/comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return data.comment;
}

function updateAreaSummary() {
  const total = state.posts.length;
  const gatherings = state.posts.filter((post) => post.type === "gathering").length;
  el.areaTitle.textContent = state.localAreaName + "에서 지금 살아있는 동네 분위기";
  el.areaSummary.textContent = "실제 피드 기준 " + total + "개의 글과 " + gatherings + "개의 모임 글이 열려 있습니다.";
  el.localArea.textContent = state.localAreaName;
}

function renderMetrics() {
  const totalComments = state.posts.reduce((sum, post) => sum + (post.comments || []).length, 0);
  const gatherings = state.posts.filter((post) => post.type === "gathering").length;
  const reviewPosts = state.posts.filter((post) => Number(post.rating) > 0);
  const reviewAverage = reviewPosts.length
    ? reviewPosts.reduce((sum, post) => sum + Number(post.rating), 0) / reviewPosts.length
    : 0;
  el.metricPosts.textContent = String(state.posts.length);
  el.metricGatherings.textContent = String(gatherings);
  el.metricComments.textContent = String(totalComments);
  el.metricRating.textContent = reviewAverage.toFixed(1);
  el.feedSummary.textContent = state.posts.length + "개 게시글";
}

function renderMiniLists() {
  const gatherings = state.posts.filter((post) => post.type === "gathering").slice(0, 3);
  const reviews = state.posts.filter((post) => Number(post.rating) > 0).slice(0, 3);
  el.gatheringList.innerHTML = gatherings.length
    ? gatherings.map((post) => `
      <article class="mini-item">
        <strong>${escapeHtml(post.title)}</strong>
        <span>${escapeHtml(post.meet_time || "시간 미정")} · ${escapeHtml(post.author)}</span>
        <p>${escapeHtml((post.body || "").slice(0, 70))}</p>
      </article>
    `).join("")
    : '<div class="empty-state">아직 열린 모임이 없습니다.</div>';

  el.reviewList.innerHTML = reviews.length
    ? reviews.map((post) => `
      <article class="mini-item">
        <strong>${escapeHtml(post.title)}</strong>
        <span>평점 ${Number(post.rating).toFixed(1)} / 5 · ${escapeHtml(post.author)}</span>
        <p>${escapeHtml((post.body || "").slice(0, 70))}</p>
      </article>
    `).join("")
    : '<div class="empty-state">아직 리뷰가 없습니다.</div>';
}

function renderFeed() {
  if (!state.posts.length) {
    el.feedList.innerHTML = '<div class="empty-state">아직 게시글이 없습니다. 첫 글을 작성해보세요.</div>';
    renderMetrics();
    renderMiniLists();
    updateAreaSummary();
    return;
  }

  el.feedList.innerHTML = state.posts.map((post) => {
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const commentsHtml = comments.length
      ? comments.map((comment) => `
        <article class="comment-card">
          <div class="comment-row">
            <div>
              <strong class="comment-author">${escapeHtml(comment.author)}</strong>
              <span class="comment-meta">${relativeTime(comment.created_at)}</span>
            </div>
          </div>
          <p class="comment-text">${escapeHtml(comment.body)}</p>
        </article>
      `).join("")
      : '<div class="empty-state">첫 댓글을 남겨보세요.</div>';

    return `
      <article class="post-card">
        <div class="post-head">
          <div>
            <span class="post-type">${escapeHtml(post.type === "review" ? "리뷰" : post.type === "gathering" ? "모임" : "동네 이야기")}</span>
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
          </div>
          <div class="post-meta">${escapeHtml(post.author)} · ${relativeTime(post.created_at)}</div>
        </div>
        <p class="post-content">${escapeHtml(post.body)}</p>
        ${post.image_url ? `<img class="post-image" src="${post.image_url}" alt="게시글 이미지" />` : ""}
        ${Number(post.rating) > 0 ? `<p class="review-line">리뷰 평점 ${Number(post.rating).toFixed(1)} / 5</p>` : ""}
        ${post.meet_time ? `<p class="review-line">모임 시간: ${escapeHtml(post.meet_time)}</p>` : ""}
        ${post.place_name ? `<p class="review-line">연결 장소: ${escapeHtml(post.place_name)}</p>` : ""}
        <div class="post-actions">
          <button class="chip-button" data-share-post="${post.id}" type="button">카카오 공유</button>
          <button class="chip-button" data-copy-post="${post.id}" type="button">인스타 문구</button>
        </div>
        <div class="comments-wrap">
          ${commentsHtml}
          <div class="comment-form-row">
            <input data-comment-input="${post.id}" type="text" maxlength="160" placeholder="댓글을 남겨보세요." />
            <button class="action-button" data-comment-submit="${post.id}" type="button">댓글 등록</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  renderMetrics();
  renderMiniLists();
  updateAreaSummary();
}

function togglePhotoPreview(dataUrl) {
  if (!dataUrl) {
    el.photoPreviewWrap.hidden = true;
    el.photoPreview.removeAttribute("src");
    return;
  }
  el.photoPreviewWrap.hidden = false;
  el.photoPreview.src = dataUrl;
}

function createPlaceShareText() {
  if (!state.currentPlace) {
    return "WHEREHERE에서 동네 피드를 보고 있어요.";
  }
  return [
    "[WHEREHERE 오늘의 장소]",
    state.currentPlace.place_name,
    state.currentPlace.road_address_name || state.currentPlace.address_name || "",
    buildKakaoMapLink(state.currentPlace)
  ].filter(Boolean).join("\n");
}

function createInstagramCaption(post) {
  return [
    "오늘의 동네 기록",
    post.title,
    post.body,
    post.place_name ? "장소: " + post.place_name : "",
    "#동네생활 #wherehere #로컬피드"
  ].filter(Boolean).join("\n");
}

async function copyToClipboard(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    showToast("복사에 실패했습니다.");
  }
}

async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      showToast("공유를 보냈습니다.");
      return;
    } catch {
    }
  }
  await copyToClipboard(text, "공유 문구를 복사했습니다.");
}

function drawStoryCard(title, body) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f1722";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#ffbe5c");
  gradient.addColorStop(1, "#4fd28b");
  ctx.fillStyle = gradient;
  ctx.fillRect(60, 80, canvas.width - 120, 8);
  ctx.fillStyle = "#f3f7fb";
  ctx.font = "700 54px Outfit";
  ctx.fillText("WHEREHERE", 80, 180);
  ctx.font = "italic 88px Instrument Serif";
  wrapCanvasText(ctx, title, 80, 340, 920, 104);
  ctx.font = "400 42px Outfit";
  ctx.fillStyle = "#b8c6d5";
  wrapCanvasText(ctx, body, 80, 760, 900, 64);
  ctx.fillStyle = "#ffbe5c";
  ctx.font = "600 38px Outfit";
  ctx.fillText("오늘의 동네 기록을 공유해보세요", 80, 1680);
  return canvas;
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  let offsetY = y;
  words.forEach((word) => {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, offsetY);
      line = word;
      offsetY += lineHeight;
    } else {
      line = test;
    }
  });
  if (line) ctx.fillText(line, x, offsetY);
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

async function shareViaKakao(post) {
  const title = post ? post.title : state.currentPlace ? state.currentPlace.place_name : "WHEREHERE";
  const description = post ? post.body.slice(0, 90) : createPlaceShareText();
  if (window.Kakao && window.Kakao.Share) {
    try {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title,
          description,
          imageUrl: "https://via.placeholder.com/600x315.png?text=WHEREHERE",
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href
          }
        },
        buttons: [
          {
            title: "WHEREHERE 열기",
            link: {
              mobileWebUrl: window.location.href,
              webUrl: window.location.href
            }
          }
        ]
      });
      return;
    } catch {
    }
  }
  await shareText([title, description, window.location.href].join("\n"));
}

function loadKakaoAuthSdk(key) {
  return new Promise((resolve, reject) => {
    if (window.Kakao && window.Kakao.Auth) {
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = KAKAO_AUTH_SDK_URL;
    script.onload = () => {
      if (!window.Kakao) {
        reject(createDiagnosticError("KAKAO_LOGIN_SDK_MISSING", "카카오 로그인 SDK 초기화 실패", "window.Kakao 객체가 생성되지 않았습니다."));
        return;
      }
      window.Kakao.init(key);
      resolve();
    };
    script.onerror = () => reject(createDiagnosticError("KAKAO_LOGIN_SDK_LOAD_FAILED", "카카오 로그인 SDK 다운로드 실패", "카카오 로그인 SDK를 내려받지 못했습니다."));
    document.head.appendChild(script);
  });
}

async function exchangeKakaoCode(code, redirectUri) {
  return apiRequest("/api/kakao-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirectUri })
  });
}

async function initializeKakaoLogin(key) {
  const redirectUri = getLoginRedirectUri();
  const loginResponse = parseLoginResponse();
  try {
    await loadKakaoAuthSdk(key);

    setLoginAction("카카오 로그인 시작", true, () => {
      window.Kakao.Auth.authorize({ redirectUri });
    });

    if (loginResponse.code) {
      setLoginState("카카오 로그인 처리 중", "인가 코드를 토큰으로 교환하고 있습니다.", false);
      setLoginAction("로그인 처리 중", false, null);
      const authResult = await exchangeKakaoCode(loginResponse.code, redirectUri);
      if (authResult.access_token) window.Kakao.Auth.setAccessToken(authResult.access_token);
      clearLoginResponseParams();
      setProfile(authResult.user);
      setLoginState("카카오 로그인 완료", "현재 로그인 사용자: " + formatUserSummary(authResult.user), true);
      setLoginAction("카카오 로그아웃", true, async () => {
        try {
          await window.Kakao.Auth.logout();
        } catch {
        } finally {
          setProfile(null);
          window.location.href = redirectUri;
        }
      });
      return;
    }

    const sessionUser = loadSessionUser();
    if (sessionUser) {
      setProfile(sessionUser);
      setLoginState("카카오 로그인 유지 중", "이 브라우저 세션에서 로그인 상태를 유지하고 있습니다.", true);
      setLoginAction("카카오 로그아웃", true, async () => {
        try {
          await window.Kakao.Auth.logout();
        } catch {
        } finally {
          setProfile(null);
          window.location.href = redirectUri;
        }
      });
      return;
    }

    if (loginResponse.error) {
      setLoginState("카카오 로그인 응답 오류", (loginResponse.errorDescription || loginResponse.error) + " Redirect URI 설정을 확인하세요.", true);
      return;
    }

    setLoginState("카카오 로그인 가능", "로그인하면 게시글 작성자명이 카카오 프로필 기준으로 반영됩니다.", true);
  } catch (error) {
    setLoginState(error.title || "카카오 로그인 준비 실패", error.message || "카카오 로그인 SDK를 준비하지 못했습니다.", false);
    setLoginAction("카카오 로그인 준비 실패", false, null);
  }
}

function loadKakaoSdk(key) {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + encodeURIComponent(key) + "&autoload=false&libraries=services";
    script.onload = () => {
      if (!window.kakao || !window.kakao.maps) {
        reject(createDiagnosticError("KAKAO_SDK_INVALID", "Kakao SDK 초기화 실패", "Kakao 객체가 생성되지 않았습니다."));
        return;
      }
      window.kakao.maps.load(() => {
        if (!window.kakao.maps.services) {
          reject(createDiagnosticError("KAKAO_SERVICE_MISSING", "Kakao Places 로드 실패", "Places 서비스 객체가 없습니다."));
          return;
        }
        resolve();
      });
    };
    script.onerror = () => reject(createDiagnosticError("KAKAO_SDK_LOAD_FAILED", "Kakao SDK 다운로드 실패", "지도 SDK를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(createDiagnosticError("GEO_UNSUPPORTED", "위치 정보 미지원", "브라우저가 위치 정보를 지원하지 않습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(createDiagnosticError("GEO_DENIED", "위치 권한 거부", "브라우저에서 위치 권한을 허용해야 합니다."));
          return;
        }
        reject(createDiagnosticError("GEO_FAILED", "위치 확인 실패", "현재 위치를 가져오지 못했습니다."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
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
        reject(createDiagnosticError("KAKAO_PLACE_SEARCH_FAILED", "Kakao Places 검색 실패", "근처 장소 검색 결과를 가져오지 못했습니다."));
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
    if (!results.length) continue;
    return { category, place: results[getTodaySeed() % Math.min(results.length, 5)] };
  }
  throw createDiagnosticError("NO_PLACE_FOUND", "주변 추천 장소 없음", "주변 3km 안에서 추천할 장소를 찾지 못했습니다.");
}

function deriveAreaName(place) {
  const address = place.road_address_name || place.address_name || "";
  if (!address) return "내 주변 동네";
  return address.split(" ").filter(Boolean).slice(0, 3).join(" ");
}

function renderPlace(recommendation) {
  const { category, place } = recommendation;
  state.currentPlace = place;
  state.localAreaName = deriveAreaName(place);
  renderDate();
  el.placeTag.textContent = "TODAY · " + category.label;
  el.placeName.textContent = place.place_name;
  el.placeSummary.textContent = category.summary;
  el.placeAddress.textContent = place.road_address_name || place.address_name || "주소 정보 없음";
  el.placeDistance.textContent = formatDistance(place.distance);
  el.placeCategory.textContent = place.category_name || category.label;
  el.placePhone.textContent = place.phone || "전화번호 정보 없음";
  el.placeLink.href = buildKakaoMapLink(place);
  updateAreaSummary();
  setStatus("주변 장소와 실제 피드를 연결했습니다.", "done");
}

function renderPlaceError(error) {
  renderDate();
  el.placeTag.textContent = "PLACE ERROR";
  el.placeName.textContent = error.title || "주변 장소를 불러오지 못했습니다";
  el.placeSummary.textContent = error.message || "위치/지도 설정을 확인하세요.";
  el.placeAddress.textContent = "오류 상태";
  el.placeDistance.textContent = "-";
  el.placeCategory.textContent = "진단 필요";
  el.placePhone.textContent = "-";
  el.placeLink.removeAttribute("href");
  updateAreaSummary();
  setStatus(error.message || "주변 장소를 불러오지 못했습니다.", "error");
}

async function refreshFeed() {
  try {
    await loadFeedFromApi();
    renderFeed();
  } catch (error) {
    el.feedList.innerHTML = '<div class="empty-state">' + escapeHtml(error.message || "실제 피드를 불러오지 못했습니다.") + "</div>";
    renderMetrics();
    renderMiniLists();
  }
}

async function handleCreatePost() {
  const payload = {
    type: el.postType.value,
    title: el.postTitle.value.trim(),
    body: el.postBody.value.trim(),
    author: getDisplayName(),
    rating: el.postType.value === "review" ? Number(el.postRating.value) : 0,
    meet_time: el.postType.value === "gathering" ? el.postTime.value.trim() : "",
    place_name: state.currentPlace ? state.currentPlace.place_name : "",
    place_address: state.currentPlace ? (state.currentPlace.road_address_name || state.currentPlace.address_name || "") : "",
    image_url: state.photoDataUrl || ""
  };

  if (!payload.title || !payload.body) {
    showToast("제목과 내용을 입력하세요.");
    return;
  }

  await createPostOnApi(payload);
  el.postForm.reset();
  state.photoDataUrl = "";
  togglePhotoPreview("");
  setActiveTab("feed");
  await refreshFeed();
  showToast("실제 피드에 게시했습니다.");
}

async function handlePostAction(button) {
  const shareId = button.getAttribute("data-share-post");
  const copyId = button.getAttribute("data-copy-post");
  const commentSubmitId = button.getAttribute("data-comment-submit");

  if (shareId) {
    const post = state.posts.find((item) => String(item.id) === shareId);
    if (post) await shareViaKakao(post);
    return;
  }

  if (copyId) {
    const post = state.posts.find((item) => String(item.id) === copyId);
    if (post) {
      const canvas = drawStoryCard(post.title, post.body);
      downloadCanvas(canvas, "wherehere-story-card.png");
      await copyToClipboard(createInstagramCaption(post), "스토리 카드 다운로드 및 문구 복사 완료");
    }
    return;
  }

  if (commentSubmitId) {
    const input = el.feedList.querySelector(`[data-comment-input="${commentSubmitId}"]`);
    if (!input) return;
    const body = input.value.trim();
    if (!body) {
      showToast("댓글 내용을 입력하세요.");
      return;
    }
    await createCommentOnApi({
      post_id: commentSubmitId,
      author: getDisplayName(),
      body
    });
    input.value = "";
    await refreshFeed();
    showToast("댓글을 남겼습니다.");
  }
}

function bindEvents() {
  el.themeToggleButton.addEventListener("click", () => {
    const next = document.body.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
  });

  el.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tabButton);
    });
  });

  el.loginButton.addEventListener("click", () => {
    if (state.loginAction && !el.loginButton.disabled) state.loginAction();
  });

  el.photoInput.addEventListener("change", () => {
    const file = el.photoInput.files && el.photoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.photoDataUrl = typeof reader.result === "string" ? reader.result : "";
      togglePhotoPreview(state.photoDataUrl);
    };
    reader.readAsDataURL(file);
  });

  el.clearPhotoButton.addEventListener("click", () => {
    state.photoDataUrl = "";
    el.photoInput.value = "";
    togglePhotoPreview("");
  });

  el.postForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await handleCreatePost();
    } catch (error) {
      showToast(error.message || "게시글 작성에 실패했습니다.");
    }
  });

  el.feedList.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    try {
      await handlePostAction(button);
    } catch (error) {
      showToast(error.message || "작업에 실패했습니다.");
    }
  });

  el.sharePlaceButton.addEventListener("click", async () => {
    await shareViaKakao(null);
  });

  el.copyInstagramButton.addEventListener("click", async () => {
    const canvas = drawStoryCard(state.currentPlace ? state.currentPlace.place_name : "WHEREHERE", createPlaceShareText());
    downloadCanvas(canvas, "wherehere-place-card.png");
    await copyToClipboard(createPlaceShareText(), "스토리 카드 다운로드 및 문구 복사 완료");
  });
}

async function initializeLocationFlow(key) {
  try {
    setStatus("카카오 장소 정보를 준비하는 중입니다.");
    await loadKakaoSdk(key);
    setStatus("현재 위치를 확인하는 중입니다.");
    const position = await getCurrentPosition();
    const recommendation = await findNearbyPlace(position.coords.longitude, position.coords.latitude);
    renderPlace(recommendation);
  } catch (error) {
    renderPlaceError(error);
  }
}

async function initialize() {
  const key = window.WHEREHERE_CONFIG && window.WHEREHERE_CONFIG.kakaoJavaScriptKey;

  initializeTheme();
  renderDate();
  setProfile(loadSessionUser());
  bindEvents();
  await refreshFeed();

  if (!key) {
    setStatus("카카오 JavaScript 키가 비어 있습니다.", "error");
    setLoginState("카카오 로그인 준비 실패", "config.js의 kakaoJavaScriptKey를 확인하세요.", false);
    setLoginAction("카카오 로그인 준비 실패", false, null);
    return;
  }

  await initializeKakaoLogin(key);
  await initializeLocationFlow(key);
}

initialize();
