const form = document.getElementById("calcForm");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const age = Number(document.getElementById("age").value);
  const height = Number(document.getElementById("height").value);
  const weight = Number(document.getElementById("weight").value);

  if (
    age < 5 || age > 120 ||
    height < 80 || height > 230 ||
    weight < 20 || weight > 250
  ) {
    alert("Por favor, introduce valores realistas.");
    return;
  }

  const base = Math.max(1, 100 - age);
  const sizeFactor = (height + weight) / 200;

  const tri = Math.max(0.5, base / sizeFactor);
  const jur = Math.max(0.3, base / (sizeFactor * 1.3));
  const cre = Math.max(0.2, base / (sizeFactor * 1.6));

  document.getElementById("resTri").textContent = tri.toFixed(1) + " días";
  document.getElementById("resJur").textContent = jur.toFixed(1) + " días";
  document.getElementById("resCre").textContent = cre.toFixed(1) + " días";
});