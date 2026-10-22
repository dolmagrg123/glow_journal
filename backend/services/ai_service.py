"""
AI product search via Anthropic Claude.
Falls back gracefully if ANTHROPIC_API_KEY is not set.
"""
import json
from config.settings import get_settings

settings = get_settings()

MODEL = "claude-opus-5"

SYSTEM_PROMPT = """You are a beauty product database assistant.
When the user searches for a skincare or beauty product, return a JSON array of up to 5 matching products.
Each product must have these exact keys:
  name, brand, category, skin_concerns (list), key_ingredients (list), description (1 sentence)
Only return valid JSON — no markdown, no extra text."""


async def _ask_claude(**kwargs) -> str:
    """Send one request and return the text reply ("" if Claude declined)."""
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = await client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        **kwargs,
    )
    if response.stop_reason == "refusal":
        return ""
    # With thinking on, the first block may be a thinking block — take the text one.
    return next((b.text for b in response.content if b.type == "text"), "").strip()


async def ai_product_search(query: str) -> list[dict]:
    if not settings.ANTHROPIC_API_KEY:
        return []   # graceful fallback — no key configured
    try:
        raw = await _ask_claude(
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Find products matching: {query}"}],
        )
        products = json.loads(raw)
        return products if isinstance(products, list) else []
    except Exception as e:
        print(f"AI product search error: {e}")
        return []


async def ai_skin_analysis(image_base64: str) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        return {"observations": [], "overall_impression": "AI analysis not configured."}
    try:
        raw = await _ask_claude(
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_base64}},
                    {"type": "text", "text": "Briefly describe visible skin characteristics. Return JSON with keys: observations (list), overall_impression (string). No medical advice. JSON only."},
                ],
            }],
        )
        return json.loads(raw)
    except Exception:
        return {"observations": [], "overall_impression": "Analysis unavailable."}
