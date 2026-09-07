import os
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
VIEWPORTS = [
    (320, 568), (360, 800), (375, 667), (390, 844), (412, 915),
    (768, 1024), (1024, 768), (1280, 800), (1440, 900)
]
THEMES = ["original", "light", "dark"]


def start_http_server():
    handler = lambda *args, **kwargs: SimpleHTTPRequestHandler(*args, directory=str(ROOT), **kwargs)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, f"http://127.0.0.1:{server.server_port}/"


server = None
try:
    with sync_playwright() as p:
        base_url = os.environ.get("GEON_BASE_URL")
        if not base_url:
            server, base_url = start_http_server()
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium")
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()
        errors = []
        console_errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.goto(base_url, wait_until="networkidle")
        page.evaluate("localStorage.clear(); sessionStorage.clear();")
        page.reload(wait_until="networkidle")
        page.wait_for_function("document.readyState === 'complete'")

        assert page.locator("#introFlow").count() == 1
        intro_status = page.evaluate("""() => {
            const status = document.querySelector('#offlineStatus');
            const box = status.getBoundingClientRect();
            return {position: getComputedStyle(status).position, top: box.top, bottom: box.bottom, height: innerHeight};
        }""")
        if intro_status["position"] != "fixed" or intro_status["top"] < 0 or intro_status["bottom"] > intro_status["height"] + 1:
            raise RuntimeError(f"Intro offline status is not safely visible at the bottom: {intro_status}")
        page.evaluate("window.introContinue()")
        page.evaluate("window.introNext()")
        page.evaluate("window.proceedToHome()")
        assert page.locator("#introFlow.hidden").count() == 1
        assert page.locator(".game-container").count() == 1

        for width, height in VIEWPORTS:
            page.set_viewport_size({"width": width, "height": height})
            for theme in THEMES:
                page.evaluate("(theme) => window.setTheme(theme)", theme)
                page.wait_for_timeout(30)
                overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
                if overflow:
                    raise RuntimeError(f"Horizontal overflow at {width}x{height} in {theme}")
                if width <= 412:
                    bounds = page.evaluate("""theme => {
                        const rect = selector => {
                            const node = document.querySelector(selector);
                            if (!node) return null;
                            const box = node.getBoundingClientRect();
                            return {left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width};
                        };
                        const titles = [...document.querySelectorAll('.section-title')];
                        const aligned = [
                            rect('.subject-progress-section'),
                            rect('.continue-journey-card'),
                            titles[0] ? {left: titles[0].getBoundingClientRect().left, right: titles[0].getBoundingClientRect().right} : null,
                            rect('.progress-card'),
                            titles[1] ? {left: titles[1].getBoundingClientRect().left, right: titles[1].getBoundingClientRect().right} : null,
                            rect('.play-section')
                        ].filter(Boolean);
                        const rows = [...document.querySelectorAll('.play-row')].map(row => ({
                            row: rectNode(row),
                            button: rectNode(row.querySelector('button'))
                        }));
                        const status = rect('#offlineStatus');
                        const shell = rect('.game-container');
                        const lightContrast = theme !== 'light' || ['.game-container', '.section-title', '.play-row', '.offline-status'].every(selector => {
                            const node = document.querySelector(selector);
                            if (!node) return false;
                            const style = getComputedStyle(node);
                            return style.color !== style.backgroundColor && style.borderTopColor !== 'rgba(0, 0, 0, 0)';
                        });
                        return {aligned, rows, status, shell, lightContrast};
                        function rectNode(node) {
                            if (!node) return null;
                            const box = node.getBoundingClientRect();
                            return {left: box.left, right: box.right, top: box.top, bottom: box.bottom};
                        }
                    }""", theme)
                    if not bounds["aligned"] or max(x["right"] - bounds["aligned"][0]["right"] for x in bounds["aligned"]) > 3 or min(x["left"] for x in bounds["aligned"]) < bounds["aligned"][0]["left"] - 3:
                        raise RuntimeError(f"Home boundary misalignment at {width}x{height} in {theme}: {bounds['aligned']}")
                    for row in bounds["rows"]:
                        if not row["row"] or not row["button"] or row["button"]["left"] < row["row"]["left"] - 1 or row["button"]["right"] > row["row"]["right"] + 1:
                            raise RuntimeError(f"Subject card/button containment failed at {width}x{height} in {theme}")
                    if not bounds["status"] or bounds["status"]["top"] < bounds["shell"]["bottom"] - 4:
                        raise RuntimeError(f"Offline status is not below the game shell at {width}x{height} in {theme}")
                    if not bounds["lightContrast"]:
                        raise RuntimeError(f"Light Mode contrast check failed at {width}x{height}")
            if width == 390 and height == 844:
                for theme in THEMES:
                    page.evaluate("(theme) => window.setTheme(theme)", theme)
                    page.screenshot(path=str(ROOT / "tests" / f"smoke-{theme}.png"), full_page=True)

        page.set_viewport_size({"width": 390, "height": 844})
        page.evaluate("window.playGame('MATH')")
        assert page.locator("#subjectSelection.show").count() == 1
        page.evaluate("window.startSelectedQuiz('A')")
        page.wait_for_timeout(150)
        assert page.locator("#levelSelection.show").count() == 1
        page.evaluate("window.startQuizAtSelectedLevel('A', 1)")
        page.wait_for_timeout(250)
        assert page.locator("#quizScreen.show").count() == 1
        assert page.locator(".quiz-answer").count() >= 2
        assert page.locator("#quizItemBar").count() == 1
        page.evaluate("window.stopQuizTimer()")
        page.evaluate("window.openMenu()")
        assert page.locator("#menuPanel.show").count() == 1
        page.evaluate("window.openSettings()")
        assert page.locator("#settingsPanel.show").count() == 1
        assert page.locator("#settingsPanel[aria-hidden='false']").count() == 1
        page.evaluate("window.closeSettings()")
        page.evaluate("window.closeQuizScreen()")
        page.evaluate("window.closeMenu()")

        for panel_id in ["menuPanel", "settingsPanel", "infoPanel", "quizScreen", "codePanel"]:
            role = page.locator(f"#{panel_id}[role='dialog']").count()
            if role != 1:
                raise RuntimeError(f"Missing dialog role for {panel_id}")

        if errors:
            raise RuntimeError("Page errors:\n" + "\n".join(errors))
        if console_errors:
            raise RuntimeError("Console errors:\n" + "\n".join(console_errors))
        browser.close()
finally:
    if server:
        server.shutdown()

print("Browser HTTP-origin smoke test passed.")
