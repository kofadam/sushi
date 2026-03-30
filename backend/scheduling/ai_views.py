import json
import os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework.permissions import IsAuthenticated
from core.permissions import HasPermCode


@csrf_exempt
@require_POST
def ai_insights(request):
    """
    Generate AI insights for a month's report data.
    Requires manage_schedule permission.
    Proxies the request to Claude API server-side to avoid CORS issues.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    if not request.user.has_perm_code("manage_schedule"):
        return JsonResponse({"error": "Permission denied"}, status=403)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return JsonResponse(
            {"error": "ANTHROPIC_API_KEY not configured"},
            status=503,
        )

    try:
        data = json.loads(request.body)
        report_summary = data.get("report_summary", {})
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    prompt = f"""You are an assistant for a helpdesk shift manager in Israel. Analyze this monthly shift report and provide 3-5 actionable insights in Hebrew. Be concise and specific — point out problems, suggest solutions, and highlight what's going well. Use bullet points with emoji for visual clarity.

Report data:
{json.dumps(report_summary, ensure_ascii=False, indent=2)}

Respond ONLY in Hebrew. Focus on:
1. Coverage gaps and risks — which days/teams need urgent attention
2. Team balance — is demand distributed fairly
3. Specific recommendations — what should the manager do this week
4. What's working well (if anything)
5. Techs who haven't submitted preferences — should the manager follow up"""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(
            block.text for block in message.content if block.type == "text"
        )
        return JsonResponse({"insight": text})

    except Exception as e:
        return JsonResponse(
            {"error": f"AI API error: {str(e)}"},
            status=502,
        )
