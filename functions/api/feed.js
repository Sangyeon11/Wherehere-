import { errorResponse, json, supabaseRequest } from "../_lib/supabase.js";

function normalizePost(post) {
  return {
    ...post,
    comments: Array.isArray(post.comments) ? post.comments : []
  };
}

export async function onRequestGet(context) {
  try {
    const posts = await supabaseRequest(context, "posts?select=*&order=created_at.desc");
    const comments = await supabaseRequest(context, "comments?select=*&order=created_at.asc");
    const commentMap = new Map();

    comments.forEach((comment) => {
      const list = commentMap.get(comment.post_id) || [];
      list.push(comment);
      commentMap.set(comment.post_id, list);
    });

    return json({
      posts: posts.map((post) =>
        normalizePost({
          ...post,
          comments: commentMap.get(post.id) || []
        })
      )
    });
  } catch (error) {
    if (error.message === "SUPABASE_ENV_MISSING") {
      return errorResponse(
        500,
        "SUPABASE_ENV_MISSING",
        "Supabase 환경 변수 누락",
        "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.",
        [
          "Cloudflare Pages 환경 변수에 두 값을 추가하세요.",
          "새 배포 후 다시 시도하세요."
        ]
      );
    }

    return errorResponse(
      error.status || 500,
      "FEED_FETCH_FAILED",
      "피드 조회 실패",
      error.message || "실제 피드를 조회하지 못했습니다."
    );
  }
}

export async function onRequestPost(context) {
  let payload;

  try {
    payload = await context.request.json();
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "잘못된 요청", "JSON 요청 본문이 필요합니다.");
  }

  const row = {
    type: payload.type || "story",
    title: payload.title || "",
    body: payload.body || "",
    author: payload.author || "게스트",
    rating: Number(payload.rating || 0),
    meet_time: payload.meet_time || null,
    place_name: payload.place_name || null,
    place_address: payload.place_address || null,
    image_url: payload.image_url || null
  };

  if (!row.title || !row.body) {
    return errorResponse(400, "MISSING_FIELDS", "필수값 누락", "title과 body는 필수입니다.");
  }

  try {
    const created = await supabaseRequest(
      context,
      "posts",
      {
        method: "POST",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify(row)
      }
    );

    return json({
      post: Array.isArray(created) ? normalizePost(created[0]) : normalizePost(created)
    });
  } catch (error) {
    if (error.message === "SUPABASE_ENV_MISSING") {
      return errorResponse(
        500,
        "SUPABASE_ENV_MISSING",
        "Supabase 환경 변수 누락",
        "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다."
      );
    }

    return errorResponse(
      error.status || 500,
      "POST_CREATE_FAILED",
      "게시글 생성 실패",
      error.message || "실제 게시글 생성에 실패했습니다."
    );
  }
}
