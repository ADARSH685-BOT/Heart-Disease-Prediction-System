"""Capture UI screenshots for README."""

from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5173"
OUT = Path(__file__).resolve().parents[1] / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

PAGES = [
    ("/", "home.png"),
    ("/predict", "predict.png"),
    ("/dashboard", "dashboard.png"),
    ("/about", "about.png"),
]


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5,
            color_scheme="light",
        )
        page = context.new_page()

        for path, filename in PAGES:
            page.goto(f"{BASE}{path}", wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(1200)
            dest = OUT / filename
            page.screenshot(path=str(dest), full_page=True)
            print(f"saved {dest}")

        # Result page: run a prediction first via API then open result from session
        # Fill form and submit for a real Result screenshot
        page.goto(f"{BASE}/predict", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(800)
        page.get_by_role("button", name="Predict Risk").click()
        page.wait_for_url("**/result", timeout=60000)
        page.wait_for_timeout(1500)
        page.screenshot(path=str(OUT / "result.png"), full_page=True)
        print(f"saved {OUT / 'result.png'}")

        browser.close()


if __name__ == "__main__":
    main()
