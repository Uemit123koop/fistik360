import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getStorePublishState } from "@/lib/store-publish";

function errorResponse(error: string, status: number, missing?: string[]) {
  return NextResponse.json(missing ? { error, missing } : { error }, { status });
}

function logDatabaseError(stage: string, error: unknown) {
  const details = error && typeof error === "object"
    ? {
        code: "code" in error ? String(error.code) : undefined,
        message: "message" in error ? String(error.message) : "Bilinmeyen veritabanı hatası",
      }
    : { message: "Bilinmeyen veritabanı hatası" };
  console.error(`[store/publish] ${stage}`, details);
}

async function getContext() {
  const user = await getServerUser();
  if (!user) return { response: errorResponse("Önce giriş yapın.", 401) };
  if (user.role !== "NUT_STORE") {
    return { response: errorResponse("Bu işlem yalnız kuruyemişçi hesaplarına açıktır.", 403) };
  }

  const supabase = await createSupabaseServerClient();
  try {
    const state = await getStorePublishState(supabase, user.id);
    const store = state.store;
    if (!store) return { response: errorResponse("Bu hesaba bağlı mağaza bulunamadı.", 404) };
    return { user, supabase, state, store };
  } catch {
    return { response: errorResponse("Mağaza yayın durumu okunamadı.", 500) };
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Geçersiz istek kaynağı.", 403);

  const context = await getContext();
  if ("response" in context) return context.response;
  const { user, state, store } = context;

  if (store.platformStatus === "SUSPENDED") {
    return errorResponse("Mağaza platform tarafından askıya alınmış. Yeniden yayınlamak için destek ekibiyle iletişime geçin.", 409);
  }

  const alreadyPublished = store.platformStatus === "ACTIVE";
  if (!alreadyPublished && !state.allReady) {
    const missing = state.checks.filter((check) => !check.ready).map((check) => check.label);
    return errorResponse(`Yayına alma için eksik adımlar var: ${missing.join(", ")}.`, 409, missing);
  }

  if (!state.onboarding) {
    return errorResponse("Satıcı onboarding kaydı bulunamadı. Yayına alma işlemi tamamlanamadı.", 409);
  }
  if (state.onboarding.status === "CANCELLED") {
    return errorResponse("İptal edilmiş onboarding kaydıyla mağaza yayına alınamaz.", 409);
  }
  if (alreadyPublished && state.onboarding.status === "COMPLETED") {
    return NextResponse.json({
      ok: true,
      alreadyPublished: true,
      store: {
        isActive: store.isActive,
        platformStatus: store.platformStatus,
        publishedAt: store.publishedAt,
      },
    });
  }

  const admin = createSupabaseAdminClient();
  const transitionAt = new Date().toISOString();
  const previousOnboarding = state.onboarding;
  let onboardingMovedToReview = false;
  let storeUpdated = false;

  if (state.onboarding.status !== "READY_TO_PUBLISH" || state.onboarding.currentStep !== "REVIEW") {
    const { data, error } = await admin
      .from("seller_onboardings")
      .update({ status: "READY_TO_PUBLISH", current_step: "REVIEW", completed_at: null })
      .eq("id", state.onboarding.id)
      .eq("user_id", user.id)
      .eq("store_id", store.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      logDatabaseError("onboarding READY_TO_PUBLISH geçişi başarısız", error);
      return errorResponse("Onboarding yayın incelemesine alınamadı.", 500);
    }
    onboardingMovedToReview = true;
  }

  const { data: updatedStore, error: storeError } = await admin
    .from("stores")
    .update({
      is_active: alreadyPublished ? store.isActive : true,
      platform_status: "ACTIVE",
      published_at: store.publishedAt ?? transitionAt,
    })
    .eq("id", store.id)
    .eq("owner_id", user.id)
    .select("is_active, platform_status, published_at")
    .maybeSingle();

  if (storeError || !updatedStore) {
    logDatabaseError("stores ACTIVE geçişi başarısız", storeError);
    if (onboardingMovedToReview) {
      const { error: rollbackError } = await admin
        .from("seller_onboardings")
        .update({
          status: previousOnboarding.status,
          current_step: previousOnboarding.currentStep,
          completed_at: previousOnboarding.completedAt,
        })
        .eq("id", previousOnboarding.id)
        .eq("user_id", user.id);
      if (rollbackError) logDatabaseError("onboarding rollback başarısız", rollbackError);
    }
    return errorResponse("Mağaza yayına alınamadı.", 500);
  }
  storeUpdated = true;

  const { data: completedOnboarding, error: onboardingError } = await admin
    .from("seller_onboardings")
    .update({ status: "COMPLETED", current_step: "COMPLETED", completed_at: transitionAt })
    .eq("id", state.onboarding.id)
    .eq("user_id", user.id)
    .eq("store_id", store.id)
    .select("id")
    .maybeSingle();

  if (onboardingError || !completedOnboarding) {
    logDatabaseError("onboarding COMPLETED geçişi başarısız", onboardingError);
    if (storeUpdated) {
      const { error: storeRollbackError } = await admin
        .from("stores")
        .update({
          is_active: store.isActive,
          platform_status: store.platformStatus,
          published_at: store.publishedAt,
        })
        .eq("id", store.id)
        .eq("owner_id", user.id);
      if (storeRollbackError) logDatabaseError("stores rollback başarısız", storeRollbackError);
    }
    const { error: onboardingRollbackError } = await admin
      .from("seller_onboardings")
      .update({
        status: previousOnboarding.status,
        current_step: previousOnboarding.currentStep,
        completed_at: previousOnboarding.completedAt,
      })
      .eq("id", previousOnboarding.id)
      .eq("user_id", user.id);
    if (onboardingRollbackError) logDatabaseError("onboarding rollback başarısız", onboardingRollbackError);
    return errorResponse("Mağaza yayınlandıktan sonra onboarding tamamlanamadı; işlem geri alındı.", 500);
  }

  return NextResponse.json({
    ok: true,
    store: {
      isActive: updatedStore.is_active,
      platformStatus: updatedStore.platform_status,
      publishedAt: updatedStore.published_at,
    },
  });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Geçersiz istek kaynağı.", 403);

  const context = await getContext();
  if ("response" in context) return context.response;
  const { user, supabase, store } = context;
  const body = await request.json().catch(() => null) as { isActive?: unknown } | null;

  if (typeof body?.isActive !== "boolean") return errorResponse("Mağaza durumu seçimi geçersiz.", 400);
  if (store.platformStatus !== "ACTIVE") {
    return errorResponse("Tatil modu yalnız platformda yayına alınmış mağazalarda kullanılabilir.", 409);
  }

  const { data, error } = await supabase
    .from("stores")
    .update({ is_active: body.isActive })
    .eq("id", store.id)
    .eq("owner_id", user.id)
    .select("is_active, platform_status, published_at")
    .maybeSingle();

  if (error) return errorResponse("Mağaza durumu güncellenemedi.", 400);
  if (!data) return errorResponse("Mağaza durumuna erişilemiyor.", 404);
  return NextResponse.json({
    ok: true,
    store: {
      isActive: data.is_active,
      platformStatus: data.platform_status,
      publishedAt: data.published_at,
    },
  });
}
