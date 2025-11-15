from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

RECIPES_FILE = os.path.join(os.path.dirname(__file__), "recipes.json")

# Load recipes
with open(RECIPES_FILE, "r", encoding="utf-8") as f:
    RECIPES = json.load(f)

# Simple substitution map
SUBSTITUTIONS = {
    "milk": ["almond milk", "soy milk"],
    "egg": ["flaxseed (1 tbsp + 3 tbsp water)", "mashed banana"],
    "butter": ["oil", "margarine"]
    "sugar": ["honey", "maple syrup"]
}

@app.route("/")
def home():
    return "Smart Recipe Generator Backend Running"

@app.route("/recipes", methods=["GET"])
def get_recipes():
    return jsonify(RECIPES)

@app.route("/match", methods=["POST"])
def match_recipes():
    data = request.json or {}
    ingredients = [x.strip().lower() for x in data.get("ingredients", []) if x.strip()]
    dietary = data.get("dietary", "").lower()
    max_results = int(data.get("max_results", 5))

    matches = []
    for r in RECIPES:
        # dietary filter
        if dietary and dietary != "any":
            if dietary not in [t.lower() for t in r.get("tags", [])]:
                continue
        # compute score
        recipe_ings = [i.lower() for i in r.get("ingredients",[])]
        if not recipe_ings:
            continue
        common = set(ingredients) & set(recipe_ings)
        score = len(common) / len(recipe_ings)
        matches.append((score, len(common), r))

    # sort by score then by number of common ingredients
    matches.sort(key=lambda x: (x[0], x[1]), reverse=True)
    results = [m[2] for m in matches[:max_results]]
    # attach matched_ingredients info
    for res in results:
        res_ings = [i.lower() for i in res.get("ingredients",[])]
        res["matched_ingredients"] = [i for i in res_ings if i in ingredients]
    return jsonify(results)

@app.route("/detect", methods=["POST"])
def detect_ingredients():
    # Mock image ingredient detection.
    # Accepts a file upload (form field 'image') and returns a list of detected ingredients.
    # This mock uses filename keywords; in real app you'd call Vision API.
    if "image" not in request.files:
        return jsonify({"error":"no image uploaded"}), 400
    img = request.files["image"]
    filename = img.filename.lower()
    # Very simple heuristic: check keywords in filename
    keywords = ["tomato","onion","garlic","carrot","potato","egg","milk","cheese","rice","chicken","banana","apple","spinach","pepper","beans","peas"]
    found = [k for k in keywords if k in filename]
    # If none found, return a small default set to let UI proceed
    if not found:
        found = ["tomato","onion","garlic"]
    return jsonify({"ingredients": found})

@app.route("/substitutions", methods=["POST"])
def get_substitutions():
    data = request.json or {}
    missing = data.get("missing", [])
    suggestions = {}
    for m in missing:
        key = m.lower()
        if key in SUBSTITUTIONS:
            suggestions[m] = SUBSTITUTIONS[key]
        else:
            suggestions[m] = []
    return jsonify(suggestions)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
