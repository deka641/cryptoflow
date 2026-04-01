"""AI-powered portfolio insights using Claude API."""

import json
import logging
from datetime import timezone, datetime

_logger = logging.getLogger(__name__)


def generate_portfolio_insights(
    holdings_data: list[dict],
    total_value: float,
    total_pnl: float,
    total_pnl_pct: float | None,
) -> str:
    """Generate natural language portfolio insights using Claude API.

    Returns a markdown-formatted string with analysis.
    Falls back to a rule-based summary if the API is unavailable.
    """
    # Try Redis cache first
    try:
        import redis
        from app.config import settings
        r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        # Use a hash of holdings as cache key
        cache_key = f"portfolio_insights:{hash(json.dumps(holdings_data, sort_keys=True, default=str))}"
        cached = r.get(cache_key)
        if cached:
            return cached
    except Exception:
        r = None
        cache_key = None

    # Build the context for Claude
    holdings_summary = []
    for h in holdings_data:
        holdings_summary.append(
            f"- {h['name']} ({h['symbol']}): {h['quantity']:.4f} units, "
            f"cost basis ${h['cost_basis']:,.2f}, current value ${h['current_value']:,.2f}, "
            f"P&L {h['pnl_pct']:+.1f}%, weight {h['weight']:.1f}%"
        )

    pnl_display = f"{total_pnl_pct:+.1f}%" if total_pnl_pct else "N/A"
    context = f"""Portfolio Summary:
- Total Value: ${total_value:,.2f}
- Total P&L: ${total_pnl:,.2f} ({pnl_display})
- Holdings ({len(holdings_data)}):
{chr(10).join(holdings_summary)}
"""

    try:
        import anthropic
        client = anthropic.Anthropic()

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            system="You are a concise crypto portfolio analyst. Provide brief, actionable insights in markdown. Focus on: 1) Overall portfolio health (1 sentence), 2) Concentration risk if any single holding >40%, 3) Top performer and underperformer, 4) One specific suggestion. Keep it under 150 words total. Use bullet points.",
            messages=[
                {"role": "user", "content": f"Analyze this crypto portfolio:\n\n{context}"}
            ],
        )

        result = message.content[0].text
    except Exception as e:
        _logger.warning("Claude API unavailable, using rule-based insights: %s", e)
        # Rule-based fallback
        result = _generate_fallback_insights(holdings_data, total_value, total_pnl, total_pnl_pct)

    # Cache for 1 hour
    if r and cache_key:
        try:
            r.setex(cache_key, 3600, result)
        except Exception:
            pass

    return result


def _generate_fallback_insights(
    holdings_data: list[dict],
    total_value: float,
    total_pnl: float,
    total_pnl_pct: float | None,
) -> str:
    """Rule-based fallback when Claude API is unavailable."""
    lines = []

    # Overall health
    if total_pnl_pct is not None:
        if total_pnl_pct > 10:
            lines.append("- **Portfolio Health:** Strong positive performance overall.")
        elif total_pnl_pct > 0:
            lines.append("- **Portfolio Health:** Modest gains. Portfolio is in positive territory.")
        elif total_pnl_pct > -10:
            lines.append("- **Portfolio Health:** Slight drawdown. Minor losses within normal range.")
        else:
            lines.append("- **Portfolio Health:** Significant drawdown. Consider reviewing your positions.")

    # Concentration risk
    if holdings_data:
        max_weight = max(h['weight'] for h in holdings_data)
        max_coin = next(h for h in holdings_data if h['weight'] == max_weight)
        if max_weight > 50:
            lines.append(f"- **Concentration Risk:** {max_coin['symbol']} represents {max_weight:.0f}% of your portfolio. Consider diversifying.")
        elif max_weight > 40:
            lines.append(f"- **Concentration Risk:** {max_coin['symbol']} is {max_weight:.0f}% of your portfolio — approaching concentrated territory.")

    # Top/bottom performers
    if len(holdings_data) >= 2:
        sorted_by_pnl = sorted(holdings_data, key=lambda h: h['pnl_pct'])
        best = sorted_by_pnl[-1]
        worst = sorted_by_pnl[0]
        lines.append(f"- **Top Performer:** {best['symbol']} ({best['pnl_pct']:+.1f}%)")
        lines.append(f"- **Underperformer:** {worst['symbol']} ({worst['pnl_pct']:+.1f}%)")

    return "\n".join(lines) if lines else "- Add more holdings to get portfolio insights."
