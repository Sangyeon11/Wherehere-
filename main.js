const CATEGORY_ROTATION = [
  {
    code: "CE7",
    label: "카페",
    summary: "지금 가장 빠르게 들를 수 있는 로컬 카페 한 곳을 추천합니다."
  },
  {
    code: "FD6",
    label: "음식점",
    summary: "오늘 동네에서 바로 갈 수 있는 식사 장소 한 곳입니다."
  },
  {
    code: "CT1",
    label: "문화시설",
    summary: "잠깐 머물러도 기분 전환이 되는 동네 문화시설 한 곳입니다."
  },
  {
    code: "AT4",
    label: "관광명소",
    summary: "오늘의 이동 목적지가 될 만한 주변 스팟 한 곳입니다."
  }
];

const SEARCH_RADIUS_METERS = 3000;
const KAKAO_AUTH_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.9/kakao.min.js";
const STORAGE_KEY = "wherehere_local_app_v1";
const SESSION_KEY = "wherehere_login_session_v1";

const el = {
  statusDot: document.querySelector("#status-dot"),
  statusText: document.querySelector("#status-text"),
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
  feed: loadFeed()
};

function createDiagnosticError(code, title, message, tips = []) {
  const error = new Error(message);
  error.code = code;
  error.title = title;
  error.tips = tips;
  return error;
}

function getTodaySeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function setStatus(message, type = "loading") {
  el.statusText.textContent = message;
  el.statusDot.className = "status-dot";
  if (type === "done") {
    el.statusDot.classList.add("done");
  }
  if (type === "error") {
    el.statusDot.classList.add("error");
  }
}

function setLoginState(status, detail, isEnabled) {
  el.loginStatus.textContent = status;
  el.loginDetail.textContent = detail;
  el.loginButton.disabled = !isEnabled;
}

function setLoginAction(label, isEnabled, action) {
  el.loginButton.textContent = label;
  el.loginButton.disabled = !isEnabled;
  state.loginAction = isEnabled ? action : null;
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
  ["code", "error", "error_description", "state"].forEach((key) => {
    url.searchParams.delete(key);
  });
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
  if (!state.user) {
    return "게스트";
  }
  const account = state.user.kakao_account || {};
  const profile = account.profile || {};
  return profile.nickname || "카카오 사용자";
}

function setProfile(user) {
  state.user = user;
  if (!user) {
    window.sessionStorage.removeItem(SESSION_KEY);
    el.profileChip.textContent = "로그인 대기";
    el.profileName.textContent = "게스트 모드";
    el.profileMeta.textContent = "로그인하면 작성자명이 카카오 프로필 기준으로 채워집니다.";
    return;
  }

  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
  }

  const account = user.kakao_account || {};
  const profile = account.profile || {};
  el.profileChip.textContent = "로그인 완료";
  el.profileName.textContent = profile.nickname || "카카오 사용자";
  el.profileMeta.textContent = account.email || "이메일 비공개";
}

function loadFeed() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createSeedFeed();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.posts)) {
      return createSeedFeed();
    }
    return parsed;
  } catch {
  return createSeedFeed();
  }
}

function loadSessionUser() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistFeed() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.feed));
}

function createSeedFeed() {
  const now = Date.now();
  return {
    posts: [
      {
        id: "seed-1",
        type: "story",
        title: "오늘 한강 바람 좋다",
        body: "퇴근 전에 잠깐 들렀는데 사람 너무 많지 않고 산책하기 딱 좋았어요. 근처 카페 포장해서 가면 완성.",
        author: "동네러너",
        createdAt: now - 1000 * 60 * 40,
        placeName: "오늘의 장소 연동",
        placeAddress: "",
        rating: 0,
        meetTime: "",
        image: "",
        comments: [
          {
            id: "seed-1-c1",
            author: "망원동주민",
            text: "노을 질 때 더 좋아요.",
            createdAt: now - 1000 * 60 * 22
          }
        ]
      },
      {
        id: "seed-2",
        type: "review",
        title: "오늘 추천된 카페 후기",
        body: "좌석 간격 넓고 조용해서 작업하기 좋았어요. 재방문 의사 있습니다.",
        author: "로컬리뷰어",
        createdAt: now - 1000 * 60 * 75,
        placeName: "주변 카페",
        placeAddress: "",
        rating: 5,
        meetTime: "",
        image: "",
        comments: []
      },
      {
        id: "seed-3",
        type: "gathering",
        title: "오늘 저녁 8시 동네 산책 모임",
        body: "가볍게 40분 정도 같이 걸을 분. 부담 없이 참여 가능해요.",
        author: "동네모임장",
        createdAt: now - 1000 * 60 * 120,
        placeName: "오늘의 장소 출발",
        placeAddress: "",
        rating: 0,
        meetTime: "오늘 저녁 8시",
        image: "",
        comments: [
          {
            id: "seed-3-c1",
            author: "참여희망",
            text: "출발 장소만 알려주세요.",
            createdAt: now - 1000 * 60 * 55
          }
        ]
      }
    ]
  };
}

function relativeTime(timestamp) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) {
    return diffMinutes + "분 전";
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours + "시간 전";
  }
  return Math.round(diffHours / 24) + "일 전";
}

function getPostTypeLabel(type) {
  const labels = {
    story: "동네 이야기",
    review: "리뷰",
    gathering: "모임"
  };
  return labels[type] || "피드";
}

function getPostTypeClass(type) {
  const map = {
    story: "story",
    review: "review",
    gathering: "gathering"
  };
  return map[type] || "story";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMiniLists() {
  const gatherings = state.feed.posts
    .filter((post) => post.type === "gathering")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
  const reviews = state.feed.posts
    .filter((post) => post.type === "review" && Number(post.rating) > 0)
    .sort((a, b) => Number(b.rating) - Number(a.rating) || b.createdAt - a.createdAt)
    .slice(0, 3);

  el.gatheringList.innerHTML = gatherings.length
    ? gatherings.map((post) => `
      <article class="mini-item">
        <strong>${escapeHtml(post.title)}</strong>
        <span>${escapeHtml(post.meetTime || "시간 미정")} · ${escapeHtml(post.author)}</span>
        <p>${escapeHtml(post.body.slice(0, 80))}</p>
      </article>
    `).join("")
    : '<div class="empty-state">아직 열린 모임이 없습니다.</div>';

  el.reviewList.innerHTML = reviews.length
    ? reviews.map((post) => `
      <article class="mini-item">
        <strong>${escapeHtml(post.title)}</strong>
        <span>평점 ${Number(post.rating).toFixed(1)} / 5 · ${escapeHtml(post.author)}</span>
        <p>${escapeHtml(post.body.slice(0, 80))}</p>
      </article>
    `).join("")
    : '<div class="empty-state">아직 리뷰가 없습니다.</div>';
}

function renderMetrics() {
  const posts = state.feed.posts;
  const totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0);
  const gatherings = posts.filter((post) => post.type === "gathering").length;
  const reviewPosts = posts.filter((post) => Number(post.rating) > 0);
  const reviewAverage = reviewPosts.length
    ? reviewPosts.reduce((sum, post) => sum + Number(post.rating), 0) / reviewPosts.length
    : 0;

  el.metricPosts.textContent = String(posts.length);
  el.metricGatherings.textContent = String(gatherings);
  el.metricComments.textContent = String(totalComments);
  el.metricRating.textContent = reviewAverage.toFixed(1);
  el.feedSummary.textContent = posts.length + "개 게시글";
}

function renderFeed() {
  const posts = [...state.feed.posts].sort((a, b) => b.createdAt - a.createdAt);

  if (!posts.length) {
    el.feedList.innerHTML = '<div class="empty-state">첫 번째 동네 글을 올려보세요.</div>';
    renderMetrics();
    renderMiniLists();
    return;
  }

  el.feedList.innerHTML = posts.map((post) => {
    const commentsHtml = post.comments.length
      ? post.comments.map((comment) => `
        <article class="comment-card">
          <div class="comment-row">
            <div>
              <strong class="comment-author">${escapeHtml(comment.author)}</strong>
              <span class="comment-meta">${relativeTime(comment.createdAt)}</span>
            </div>
          </div>
          <p class="comment-text">${escapeHtml(comment.text)}</p>
        </article>
      `).join("")
      : '<div class="empty-state">첫 댓글을 남겨보세요.</div>';

    return `
      <article class="post-card" data-post-id="${post.id}">
        <div class="post-head">
          <div>
            <span class="post-type">${escapeHtml(getPostTypeLabel(post.type))}</span>
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
          </div>
          <div class="post-meta">${escapeHtml(post.author)} · ${relativeTime(post.createdAt)}</div>
        </div>
        <p class="post-content">${escapeHtml(post.body)}</p>
        ${post.image ? `<img class="post-image" src="${post.image}" alt="게시글 이미지" />` : ""}
        ${Number(post.rating) > 0 ? `<p class="review-line">리뷰 평점 ${Number(post.rating).toFixed(1)} / 5</p>` : ""}
        ${post.meetTime ? `<p class="review-line">모임 시간: ${escapeHtml(post.meetTime)}</p>` : ""}
        ${post.placeName ? `<p class="review-line">연결 장소: ${escapeHtml(post.placeName)}</p>` : ""}
        <div class="post-actions">
          <button class="chip-button" data-like-post="${post.id}" type="button">공감 ${post.comments.length + 1}</button>
          <button class="chip-button" data-share-post="${post.id}" type="button">공유</button>
          <button class="chip-button" data-copy-post="${post.id}" type="button">인스타 문구 복사</button>
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
}

function updateAreaSummary() {
  const total = state.feed.posts.length;
  const gatherings = state.feed.posts.filter((post) => post.type === "gathering").length;
  el.areaTitle.textContent = state.localAreaName + "에서 지금 살아있는 동네 분위기";
  el.areaSummary.textContent =
    "오늘의 장소를 중심으로 " +
    total +
    "개의 로컬 피드가 열려 있고, 현재 " +
    gatherings +
    "개의 모임 글이 올라와 있습니다.";
  el.localArea.textContent = state.localAreaName;
}

function persistAndRefresh() {
  persistFeed();
  renderFeed();
  updateAreaSummary();
}

function addComment(postId, text) {
  const post = state.feed.posts.find((item) => item.id === postId);
  if (!post) {
    return;
  }
  post.comments.push({
    id: "comment-" + Date.now(),
    author: getDisplayName(),
    text,
    createdAt: Date.now()
  });
  persistAndRefresh();
  showToast("댓글을 남겼습니다.");
}

function createPost() {
  const type = el.postType.value;
  const rating = Number(el.postRating.value);
  const title = el.postTitle.value.trim();
  const body = el.postBody.value.trim();
  const meetTime = el.postTime.value.trim();

  if (!title || !body) {
    showToast("제목과 내용을 입력하세요.");
    return;
  }

  const post = {
    id: "post-" + Date.now(),
    type,
    title,
    body,
    author: getDisplayName(),
    createdAt: Date.now(),
    placeName: state.currentPlace ? state.currentPlace.place_name : "",
    placeAddress: state.currentPlace ? (state.currentPlace.road_address_name || state.currentPlace.address_name || "") : "",
    rating: type === "review" ? rating : 0,
    meetTime: type === "gathering" ? meetTime : "",
    image: state.photoDataUrl,
    comments: []
  };

  state.feed.posts.unshift(post);
  el.postForm.reset();
  state.photoDataUrl = "";
  togglePhotoPreview("");
  persistAndRefresh();
  showToast("동네 피드에 게시했습니다.");
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

function loadKakaoAuthSdk(key) {
  return new Promise((resolve, reject) => {
    if (window.Kakao && window.Kakao.Auth) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(key);
      }
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
    script.onerror = () => {
      reject(createDiagnosticError("KAKAO_LOGIN_SDK_LOAD_FAILED", "카카오 로그인 SDK 다운로드 실패", "카카오 로그인 SDK를 내려받지 못했습니다."));
    };
    document.head.appendChild(script);
  });
}

async function exchangeKakaoCode(code, redirectUri) {
  const response = await fetch("/api/kakao-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirectUri })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createDiagnosticError(
      data.code || "KAKAO_TOKEN_EXCHANGE_FAILED",
      data.title || "카카오 토큰 교환 실패",
      data.message || "인가 코드를 액세스 토큰으로 바꾸지 못했습니다."
    );
  }
  return data;
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
      setLoginState("카카오 로그인 처리 중", "인가 코드를 토큰으로 교환하고 사용자 정보를 가져오고 있습니다.", false);
      setLoginAction("로그인 처리 중", false, null);

      const authResult = await exchangeKakaoCode(loginResponse.code, redirectUri);
      if (authResult.access_token) {
        window.Kakao.Auth.setAccessToken(authResult.access_token);
      }
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
      showToast("카카오 로그인 완료");
      return;
    }

    if (loginResponse.error) {
      setLoginState("카카오 로그인 응답 오류", (loginResponse.errorDescription || loginResponse.error) + " Redirect URI 설정을 확인하세요.", true);
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

    setLoginState("카카오 로그인 가능", "지금 로그인하면 게시글 작성자명이 카카오 프로필 기준으로 반영됩니다.", true);
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
    script.onerror = () => {
      reject(createDiagnosticError("KAKAO_SDK_LOAD_FAILED", "Kakao SDK 다운로드 실패", "https://dapi.kakao.com SDK를 불러오지 못했습니다."));
    };
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
          reject(createDiagnosticError("GEO_DENIED", "위치 권한 거부", "브라우저에서 위치 권한을 허용해야 주변 장소를 찾을 수 있습니다."));
          return;
        }
        reject(createDiagnosticError("GEO_FAILED", "위치 확인 실패", "현재 위치를 가져오지 못했습니다."));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
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
    if (!results.length) {
      continue;
    }
    return {
      category,
      place: results[getTodaySeed() % Math.min(results.length, 5)]
    };
  }

  throw createDiagnosticError("NO_PLACE_FOUND", "주변 추천 장소 없음", "주변 3km 안에서 추천할 장소를 찾지 못했습니다.");
}

function deriveAreaName(place) {
  const address = place.road_address_name || place.address_name || "";
  if (!address) {
    return "내 주변 동네";
  }
  const chunks = address.split(" ").filter(Boolean);
  return chunks.slice(0, Math.min(3, chunks.length)).join(" ");
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
  el.placeLink.setAttribute("aria-disabled", "false");

  updateAreaSummary();
  setStatus("주변 장소와 동네 피드를 연결했습니다.", "done");
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
  el.placeLink.setAttribute("aria-disabled", "true");
  updateAreaSummary();
  setStatus(error.message || "주변 장소를 불러오지 못했습니다.", "error");
}

async function copyToClipboard(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    showToast("클립보드 복사에 실패했습니다.");
  }
}

function createPlaceShareText() {
  if (!state.currentPlace) {
    return "WHEREHERE에서 동네 피드를 보고 있어요.";
  }
  const address = state.currentPlace.road_address_name || state.currentPlace.address_name || "";
  return [
    "[WHEREHERE 오늘의 장소]",
    state.currentPlace.place_name,
    address,
    buildKakaoMapLink(state.currentPlace)
  ].filter(Boolean).join("\n");
}

function createInstagramCaption(post) {
  return [
    "오늘의 동네 기록",
    post.title,
    post.body,
    post.placeName ? "장소: " + post.placeName : "",
    "#동네생활 #로컬피드 #wherehere"
  ].filter(Boolean).join("\n");
}

async function shareTextPayload(text) {
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

async function shareViaKakao(post) {
  if (window.Kakao && window.Kakao.Share && state.currentPlace) {
    try {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: post ? post.title : state.currentPlace.place_name,
          description: post ? post.body.slice(0, 80) : createPlaceShareText(),
          imageUrl: post && post.image ? post.image : "https://via.placeholder.com/400x240.png?text=WHEREHERE",
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href
          }
        },
        buttons: [
          {
            title: "동네 피드 보기",
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
  await shareTextPayload(post ? createInstagramCaption(post) : createPlaceShareText());
}

function handlePostAction(target) {
  const shareId = target.getAttribute("data-share-post");
  const copyId = target.getAttribute("data-copy-post");
  const commentSubmitId = target.getAttribute("data-comment-submit");
  const likeId = target.getAttribute("data-like-post");

  if (likeId) {
    showToast("공감은 로컬 MVP라 숫자만 표시합니다.");
    return;
  }

  if (shareId) {
    const post = state.feed.posts.find((item) => item.id === shareId);
    if (post) {
      shareViaKakao(post);
    }
    return;
  }

  if (copyId) {
    const post = state.feed.posts.find((item) => item.id === copyId);
    if (post) {
      copyToClipboard(createInstagramCaption(post), "인스타용 문구를 복사했습니다.");
    }
    return;
  }

  if (commentSubmitId) {
    const input = el.feedList.querySelector(`[data-comment-input="${commentSubmitId}"]`);
    if (!input) {
      return;
    }
    const text = input.value.trim();
    if (!text) {
      showToast("댓글 내용을 입력하세요.");
      return;
    }
    input.value = "";
    addComment(commentSubmitId, text);
  }
}

function bindEvents() {
  el.loginButton.addEventListener("click", () => {
    if (state.loginAction && !el.loginButton.disabled) {
      state.loginAction();
    }
  });

  el.photoInput.addEventListener("change", () => {
    const file = el.photoInput.files && el.photoInput.files[0];
    if (!file) {
      return;
    }
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

  el.postForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createPost();
  });

  el.feedList.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) {
      return;
    }
    handlePostAction(target);
  });

  el.sharePlaceButton.addEventListener("click", () => {
    shareViaKakao(null);
  });

  el.copyInstagramButton.addEventListener("click", () => {
    const text = createPlaceShareText() + "\n#오늘의장소 #동네생활 #wherehere";
    copyToClipboard(text, "인스타용 장소 문구를 복사했습니다.");
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

function initialize() {
  const key = window.WHEREHERE_CONFIG && window.WHEREHERE_CONFIG.kakaoJavaScriptKey;

  renderDate();
  renderFeed();
  updateAreaSummary();
  bindEvents();
  setProfile(loadSessionUser());

  if (!key) {
    setStatus("카카오 JavaScript 키가 비어 있습니다.", "error");
    setLoginState("카카오 로그인 준비 실패", "config.js의 kakaoJavaScriptKey를 확인하세요.", false);
    setLoginAction("카카오 로그인 준비 실패", false, null);
    return;
  }

  initializeKakaoLogin(key);
  initializeLocationFlow(key);
}

initialize();
