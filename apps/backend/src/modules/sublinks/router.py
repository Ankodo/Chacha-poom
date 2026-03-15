"""Sub-link API — subscription link endpoints."""

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.sublinks.service import SubLinkService

router = APIRouter()


@router.get("/{token}")
async def get_sub_link(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_agent: str = Header(default=""),
):
    """
    Main sub-link endpoint. Auto-detects client format by User-Agent.
    Browser → HTML subscription page.
    Proxy client → config in appropriate format.
    """
    # Check if request is from a browser (not a proxy client)
    if _is_browser(user_agent):
        # Return HTML subscription page
        return await _render_sub_page(token, db)

    content, content_type = await SubLinkService.generate_sub(
        db, token, format=None, user_agent=user_agent
    )
    if not content:
        raise HTTPException(status_code=404, detail="Subscription not found or expired")

    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Content-Disposition": "inline",
            "Subscription-Userinfo": "upload=0; download=0; total=0; expire=0",
            "Profile-Update-Interval": "12",
        },
    )


@router.get("/{token}/v2ray")
async def get_sub_v2ray(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Sub-link in V2Ray/v2rayNG format (base64 URIs)."""
    content, content_type = await SubLinkService.generate_sub(db, token, format="v2ray")
    if not content:
        raise HTTPException(status_code=404, detail="Subscription not found or expired")
    return Response(content=content, media_type=content_type)


@router.get("/{token}/clash")
async def get_sub_clash(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Sub-link in Clash/Mihomo YAML format."""
    content, content_type = await SubLinkService.generate_sub(db, token, format="clash")
    if not content:
        raise HTTPException(status_code=404, detail="Subscription not found or expired")
    return Response(content=content, media_type=content_type)


@router.get("/{token}/singbox")
async def get_sub_singbox(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Sub-link in Sing-box JSON format."""
    content, content_type = await SubLinkService.generate_sub(db, token, format="singbox")
    if not content:
        raise HTTPException(status_code=404, detail="Subscription not found or expired")
    return Response(content=content, media_type=content_type)


@router.get("/{token}/shadowrocket")
async def get_sub_shadowrocket(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Sub-link in Shadowrocket format."""
    content, content_type = await SubLinkService.generate_sub(db, token, format="shadowrocket")
    if not content:
        raise HTTPException(status_code=404, detail="Subscription not found or expired")
    return Response(content=content, media_type=content_type)


@router.get("/{token}/outline")
async def get_sub_outline(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Sub-link in Outline format."""
    content, content_type = await SubLinkService.generate_sub(db, token, format="outline")
    if not content:
        raise HTTPException(status_code=404, detail="Subscription not found or expired")
    return Response(content=content, media_type=content_type)


def _is_browser(user_agent: str) -> bool:
    """Check if User-Agent is a browser (not a proxy client)."""
    browsers = ["mozilla", "chrome", "safari", "firefox", "edge", "opera"]
    proxy_clients = [
        "v2rayn", "v2rayng", "clash", "mihomo", "stash",
        "shadowrocket", "quantumult", "surge", "sing-box",
        "sfi", "sfa", "hiddify", "nekoray", "outline",
    ]
    ua = user_agent.lower()
    # If it's a known proxy client, it's not a browser
    for pc in proxy_clients:
        if pc in ua:
            return False
    # Check for browser signature
    for b in browsers:
        if b in ua:
            return True
    return False


async def _render_sub_page(token: str, db: AsyncSession) -> Response:
    """Render HTML subscription info page for browser access."""
    user = await SubLinkService.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=404, detail="Subscription not found or expired")

    sub = user.subscription
    html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ProxyForge — Подписка</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               background: #0a0a0a; color: #e5e5e5; min-height: 100vh; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; }}
        h1 {{ font-size: 24px; margin-bottom: 8px; }}
        .status {{ display: inline-block; padding: 4px 12px; border-radius: 9999px;
                   font-size: 12px; font-weight: 600; margin-bottom: 24px; }}
        .active {{ background: #065f46; color: #34d399; }}
        .expired {{ background: #7f1d1d; color: #f87171; }}
        .card {{ background: #171717; border: 1px solid #262626; border-radius: 12px;
                 padding: 20px; margin-bottom: 16px; }}
        .card h3 {{ font-size: 14px; color: #a3a3a3; margin-bottom: 12px; }}
        .sub-link {{ background: #0a0a0a; border: 1px solid #262626; border-radius: 8px;
                     padding: 12px; word-break: break-all; font-family: monospace;
                     font-size: 13px; cursor: pointer; position: relative; }}
        .sub-link:hover {{ border-color: #525252; }}
        .apps {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}
        .app-btn {{ display: block; padding: 12px; background: #171717; border: 1px solid #262626;
                    border-radius: 8px; text-align: center; text-decoration: none; color: #e5e5e5;
                    font-size: 14px; transition: border-color 0.2s; }}
        .app-btn:hover {{ border-color: #525252; }}
        .info-row {{ display: flex; justify-content: space-between; padding: 8px 0;
                     border-bottom: 1px solid #1a1a1a; }}
        .info-label {{ color: #737373; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 ProxyForge</h1>
        <span class="status {'active' if sub and sub.status.value == 'active' else 'expired'}">
            {sub.status.value.upper() if sub else 'NO SUBSCRIPTION'}
        </span>

        <div class="card">
            <h3>📋 Подписка</h3>
            <div class="info-row">
                <span class="info-label">Пользователь</span>
                <span>{user.username}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Срок до</span>
                <span>{sub.expiry_date.strftime('%d.%m.%Y') if sub else 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Трафик</span>
                <span>{'∞' if not sub or sub.traffic_limit == 0 else f'{sub.traffic_used // (1024**3)}/{sub.traffic_limit // (1024**3)} GB'}</span>
            </div>
        </div>

        <div class="card">
            <h3>🔗 Ссылка подписки (нажмите чтобы скопировать)</h3>
            <div class="sub-link" onclick="navigator.clipboard.writeText(this.textContent.trim())">
                {f'https://sub.proxyforge.app/sub/{token}'}
            </div>
        </div>

        <div class="card">
            <h3>📱 Приложения</h3>
            <div class="apps">
                <a class="app-btn" href="v2rayng://install-sub?url=https://sub.proxyforge.app/sub/{token}">v2rayNG (Android)</a>
                <a class="app-btn" href="hiddify://import/https://sub.proxyforge.app/sub/{token}">Hiddify</a>
                <a class="app-btn" href="clash://install-config?url=https://sub.proxyforge.app/sub/{token}/clash">Clash / Mihomo</a>
                <a class="app-btn" href="shadowrocket://add/sub://{'aHR0cHM6Ly9zdWIucHJveHlmb3JnZS5hcHAvc3ViLw=='}">Shadowrocket (iOS)</a>
            </div>
        </div>
    </div>
</body>
</html>"""
    return Response(content=html, media_type="text/html")
