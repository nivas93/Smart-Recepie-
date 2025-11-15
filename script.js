const API = "http://127.0.0.1:5000";

const ingredientsEl = document.getElementById("ingredients");
const imageEl = document.getElementById("image");
const dietaryEl = document.getElementById("dietary");
const detectBtn = document.getElementById("detectBtn");
const findBtn = document.getElementById("findBtn");
const resultsEl = document.getElementById("results");

detectBtn.addEventListener("click", async () => {
  if (!imageEl.files.length) { alert("Please choose an image file"); return; }
  const form = new FormData();
  form.append("image", imageEl.files[0]);
  detectBtn.disabled = true;
  detectBtn.textContent = "Detecting...";
  try {
    const res = await fetch(API + "/detect", {method:"POST", body: form});
    const data = await res.json();
    if (data.ingredients) {
      ingredientsEl.value = data.ingredients.join(", ");
      alert("Detected: " + data.ingredients.join(", "));
    } else {
      alert("No ingredients detected");
    }
  } catch (e) {
    alert("Detection error: " + e.message);
  } finally {
    detectBtn.disabled = false;
    detectBtn.textContent = "Detect Ingredients from Image";
  }
});

findBtn.addEventListener("click", async () => {
  const input = ingredientsEl.value.trim();
  if (!input) { alert("Please enter ingredients or detect from image."); return; }
  const ingredients = input.split(",").map(s=>s.trim()).filter(Boolean);
  const payload = {ingredients, dietary: dietaryEl.value, max_results:5};
  findBtn.disabled = true;
  findBtn.textContent = "Finding...";
  try {
    const res = await fetch(API + "/match", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const recipes = await res.json();
    showResults(recipes, ingredients);
  } catch (e) {
    alert("Error fetching recipes: " + e.message);
  } finally {
    findBtn.disabled = false;
    findBtn.textContent = "Find Recipes";
  }
});

function showResults(recipes, providedIngredients){
  resultsEl.innerHTML = "";
  if (!recipes || recipes.length===0) {
    resultsEl.innerHTML = "<p class='muted'>No recipes matched.</p>";
    return;
  }
  recipes.forEach(r=>{
    const card = document.createElement("div");
    card.className="card";
    const tags = (r.tags||[]).map(t=>`<span class='tag'>${t}</span>`).join("");
    const matched = (r.matched_ingredients||[]).join(", ");
    card.innerHTML = `
      <h3>${r.name}</h3>
      <div class='muted'>${tags}</div>
      <p><strong>Time:</strong> ${r.time} mins &nbsp; <strong>Difficulty:</strong> ${r.difficulty}</p>
      <p><strong>Matched Ingredients:</strong> ${matched || "<span class='muted'>None</span>"}</p>
      <details>
        <summary>Ingredients & Steps</summary>
        <p><strong>Ingredients:</strong> ${r.ingredients.join(", ")}</p>
        <p><strong>Steps:</strong><br>${r.steps.map(s=>"<li>"+s+"</li>").join("")}</p>
        <p><strong>Nutrition:</strong> ${Object.entries(r.nutrition||{}).map(kv=>kv.join(": ")).join(", ")}</p>
      </details>
      <div style="margin-top:8px">
        <button class="saveBtn">Save</button>
        <button class="rateBtn">Rate</button>
        <button class="subsBtn">Substitutions</button>
      </div>
    `;
    // Save button
    card.querySelector(".saveBtn").addEventListener("click", ()=>{
      const saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
      if (!saved.find(x=>x.id===r.id)) { saved.push(r); localStorage.setItem("savedRecipes", JSON.stringify(saved)); alert("Saved!");}
      else alert("Already saved");
    });
    // Rate button
    card.querySelector(".rateBtn").addEventListener("click", ()=>{
      const rating = prompt("Rate this recipe 1-5 stars");
      const n = Number(rating);
      if (n>=1 && n<=5) {
        const ratings = JSON.parse(localStorage.getItem("ratings") || "{}");
        ratings[r.id] = n;
        localStorage.setItem("ratings", JSON.stringify(ratings));
        alert("Thanks for rating!");
      } else alert("Invalid rating");
    });
    // Substitutions button
    card.querySelector(".subsBtn").addEventListener("click", async ()=>{
      const missing = prompt("Enter missing ingredient(s), comma-separated");
      if (!missing) return;
      const list = missing.split(",").map(s=>s.trim()).filter(Boolean);
      const res = await fetch(API + "/substitutions", {
        method:"POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({missing:list})
      });
      const data = await res.json();
      const lines = Object.entries(data).map(([k,v])=>k + ": " + (v.length? v.join(", ") : "No suggestions found"));
      alert(lines.join("\n"));
    });

    resultsEl.appendChild(card);
  });
}

// On load, fetch and show a few sample recipes (optional)
window.addEventListener("load", async ()=>{
  try {
    const res = await fetch(API + "/recipes");
    const all = await res.json();
    // show top 3 as examples
    showResults(all.slice(0,3), []);
  } catch(e){}
});
