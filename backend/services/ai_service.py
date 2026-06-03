"""
AI product search via Anthropic Claude.
Falls back gracefully if ANTHROPIC_API_KEY is not set.
"""
import json
from config.settings import get_settings

settings = get_settings()

SYSTEM_PROMPT = """You are a beauty product database assistant.
When the user searches for a skincare or beauty product, return a JSON array of up to 5 matching products.
Each product must have these exact keys:
  name, brand, category, skin_concerns (list), key_ingredients (list), description (1 sentence)
Only return valid JSON — no markdown, no extra text."""


async def ai_product_search(query: str) -> list[dict]:
    if not settings.ANTHROPIC_API_KEY:
        return []   # graceful fallback — no key configured
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Find products matching: {query}"}],
        )
        raw = response.content[0].text.strip()
        products = json.loads(raw)
        return products if isinstance(products, list) else []
    except Exception as e:
        print(f"AI product search error: {e}")
        return []


async def ai_skin_analysis(image_base64: str) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        return {"observations": [], "overall_impression": "AI analysis not configured."}
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_base64}},
                    {"type": "text", "text": "Briefly describe visible skin characteristics. Return JSON with keys: observations (list), overall_impression (string). No medical advice. JSON only."},
                ],
            }],
        )
        return json.loads(response.content[0].text.strip())
    except Exception:
        return {"observations": [], "overall_impression": "Analysis unavailable."}
