from pathlib import Path
from bs4 import BeautifulSoup
import re
import json

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "style.css").read_text(encoding="utf-8")
js = (ROOT / "script.js").read_text(encoding="utf-8")
worker = (ROOT / "service-worker.js").read_text(encoding="utf-8")
manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))

soup = BeautifulSoup(html, "html.parser")
required = [
    "quizScreen", "quizItemBar", "quizStreak", "shopPanel", "inventoryPanel",
    "dailyChallengePanel", "reviewerModePanel", "settingsPanel", "continueJourneyCard",
    "offlineStatus", "globalLiveRegion"
]
missing = [x for x in required if soup.find(id=x) is None]
assert not missing, f"Missing required IDs: {missing}"

script_srcs = [tag.get("src") for tag in soup.find_all("script") if tag.get("src")]
for src in script_srcs:
    assert not re.match(r"^[a-z]+://", src), f"Non-same-origin script: {src}"
    assert (ROOT / src).exists(), f"Missing script: {src}"

for link in soup.find_all("link", href=True):
    href = link["href"]
    if href.startswith("./"):
        href = href[2:]
    if not re.match(r"^[a-z]+://", href) and href != "":
        assert (ROOT / href).exists(), f"Missing linked asset: {href}"

for theme in ["original", "light", "dark"]:
    assert f'body[data-theme="{theme}"]' in css, f"Missing theme CSS: {theme}"
assert not re.search(r'body\[data-theme="(?:neon-voyage|arcade-sunset|paper-lab|blue|neon|cyber|sunset|paper)"\]', css, re.I)
assert 'const allowed = ["original", "light", "dark"]' in js
assert 'aria-pressed="true"' in html
assert 'role="dialog"' in html

assert manifest["display"] == "standalone"
assert manifest["start_url"] == "./"
for icon in manifest.get("icons", []):
    assert (ROOT / icon["src"]).exists(), f"Missing manifest icon: {icon['src']}"

shell_match = re.search(r"const SHELL = \[(.*?)\];", worker, re.S)
assert shell_match, "Service-worker shell list missing"
for asset in re.findall(r'"([^\"]+)"', shell_match.group(1)):
    assert (ROOT / asset.removeprefix("./")).exists(), f"Missing shell asset: {asset}"
assert re.search(r'CACHE_VERSION\s*=\s*"proudgeonquiz-v5-', worker)

for filename in ["questions.json", "questions.new.json"]:
    bank = json.loads((ROOT / filename).read_text(encoding="utf-8"))
    assert set(bank) == {"MATH", "SCIENCE", "PSYCHOLOGY", "TECH 1", "TECH 2"}
    for subject, paths in bank.items():
        assert set(paths) == {"SUBJECT 1", "SUBJECT 2"}
        assert all(len(paths[q]) == 80 for q in paths)

print("Static structural checks passed.")
