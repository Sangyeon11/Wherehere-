function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

function errorResponse(status, code, title, message, tips) {
  return json(
    {
      code,
      title,
      message,
      tips
    },
    { status }
  );
}

async function requestAccessToken({ restApiKey, clientSecret, code, redirectUri }) {
  const params = new URLSearchParams();
  params.set("grant_type", "authorization_code");
  params.set("client_id", restApiKey);
  params.set("redirect_uri", redirectUri);
  params.set("code", code);

  if (clientSecret) {
    params.set("client_secret", clientSecret);
  }

  const response = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
    },
    body: params.toString()
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error_description || data.error || "카카오 토큰 요청이 실패했습니다.");
  }

  return data;
}

async function requestUserProfile(accessToken) {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.msg || "카카오 사용자 정보 조회가 실패했습니다.");
  }

  return data;
}

export async function onRequestPost(context) {
  const restApiKey = context.env.KAKAO_REST_API_KEY;
  const clientSecret = context.env.KAKAO_CLIENT_SECRET || "";

  if (!restApiKey) {
    return errorResponse(
      500,
      "KAKAO_REST_KEY_MISSING",
      "서버 환경 변수 누락",
      "Cloudflare Pages 환경 변수 KAKAO_REST_API_KEY가 설정되지 않았습니다.",
      [
        "Pages 프로젝트 설정에서 KAKAO_REST_API_KEY를 추가하세요.",
        "필요하면 KAKAO_CLIENT_SECRET도 함께 설정하세요.",
        "환경 변수 저장 후 새 배포가 반영되었는지 확인하세요."
      ]
    );
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_REQUEST_BODY",
      "잘못된 요청 본문",
      "JSON 형식의 code와 redirectUri가 필요합니다.",
      [
        "프론트엔드 요청 형식을 확인하세요.",
        "브라우저 콘솔에 추가 에러가 있는지 확인하세요."
      ]
    );
  }

  const code = payload && payload.code;
  const redirectUri = payload && payload.redirectUri;

  if (!code || !redirectUri) {
    return errorResponse(
      400,
      "MISSING_CODE_OR_REDIRECT",
      "인가 코드 누락",
      "카카오 인가 코드 또는 Redirect URI가 비어 있습니다.",
      [
        "카카오 로그인 후 code 파라미터가 붙는지 확인하세요.",
        "Redirect URI 설정이 현재 배포 주소와 같은지 확인하세요."
      ]
    );
  }

  try {
    const token = await requestAccessToken({
      restApiKey,
      clientSecret,
      code,
      redirectUri
    });
    const user = await requestUserProfile(token.access_token);

    return json({
      access_token: token.access_token,
      refresh_token: token.refresh_token || null,
      expires_in: token.expires_in,
      user
    });
  } catch (error) {
    return errorResponse(
      502,
      "KAKAO_TOKEN_REQUEST_FAILED",
      "카카오 토큰 교환 실패",
      error.message || "카카오 인증 서버와 통신하지 못했습니다.",
      [
        "KAKAO_REST_API_KEY가 올바른지 확인하세요.",
        "Kakao 로그인 Redirect URI가 현재 배포 주소와 같은지 확인하세요.",
        "카카오 콘솔에서 카카오 로그인이 활성화되어 있는지 확인하세요."
      ]
    );
  }
}
