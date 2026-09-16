/*
 * Static, no-backend version of the assessment.
 * There is no server here (GitHub Pages only serves static files), so all
 * scoring logic runs in the browser using the data in quiz-data.js.
 *
 * IMPORTANT HONESTY NOTE (read this before assuming this "hides" answers):
 * Each question stores a SHA-256 hash of its correct option text instead of
 * a plain "correctIndex". This stops a casual "View Page Source" or a quick
 * look at quiz-data.js from showing the answers directly. It is NOT real
 * security: anyone who opens devtools and hashes each option themselves
 * (a few lines of JS) can still recover the answer, because with a pure
 * static site the browser has to be able to check the answer itself - there
 * is no server left to keep the secret on. If you need answers that are
 * genuinely unreadable by students, you need a real backend (e.g. keep the
 * Flask version deployed on Vercel/Render/PythonAnywhere) instead of GitHub
 * Pages.
 */

const SALT = "cybershield-static-v1";
const TOTAL = QUIZ_DATA.length;
const $ = id => document.getElementById(id);
const sectionNotes = {
  Easy: "Warm-up: remember the basic meaning.",
  Medium: "Think about the warning signs.",
  Hard: "Read every detail before choosing."
};

let questionNumber = 1;
let currentSourceIndex = null;
let currentShuffledOptions = null;
let answerLocked = false;
let changingPage = false;

document.addEventListener("DOMContentLoaded", restoreAssessment);
$("start").addEventListener("click", startAssessment);
$("hint").addEventListener("click", openOptionalHint);
$("next").addEventListener("click", goNext);
$("retry").addEventListener("click", startAssessment);
document.addEventListener("keydown", useNumberShortcut);

// ---------- crypto helper ----------
async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// ---------- state (sessionStorage keeps progress while the tab stays open) ----------
function loadState() {
  try { return JSON.parse(sessionStorage.getItem("cs_state")) || null; }
  catch { return null; }
}
function saveState(state) {
  sessionStorage.setItem("cs_state", JSON.stringify(state));
}
function clearState() {
  sessionStorage.removeItem("cs_state");
}

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestionOrder() {
  const easy = shuffle([0, 1, 2, 3, 4, 5, 6]);
  const mediumOther = shuffle([7, 8, 9, 10, 11, 13, 14]);
  const hard = shuffle([15, 16, 17, 18, 19]);
  return [...easy, ...mediumOther.slice(0, 5), 12, ...mediumOther.slice(5), ...hard];
}

function levelFor(score) {
  return score >= 17 ? "Excellent" : score >= 13 ? "Good" : score >= 9 ? "Keep Practising" : "Review the Lessons";
}

// ---------- flow ----------
function restoreAssessment() {
  const state = loadState();
  if (!state) { showOnly("intro"); return; }
  if (state.answered.length === TOTAL) {
    showResult(state.score);
  } else {
    questionNumber = state.answered.length + 1;
    showOnly("quiz");
    loadQuestion();
  }
}

function startAssessment() {
  $("start").disabled = true;
  const state = {
    order: buildQuestionOrder(),
    optionOrders: {},
    answered: [],
    score: 0,
    hint13: false
  };
  saveState(state);
  questionNumber = 1;
  showOnly("quiz");
  loadQuestion();
  $("start").disabled = false;
}

function loadQuestion() {
  answerLocked = false;
  changingPage = false;
  $("next").disabled = false;
  hide("feedback", "error", "next", "hintStatus");

  const state = loadState();
  if (!state) { showOnly("intro"); return; }

  const sourceIndex = state.order[questionNumber - 1];
  const q = QUIZ_DATA[sourceIndex];
  currentSourceIndex = sourceIndex;

  const key = String(questionNumber);
  if (!state.optionOrders[key]) {
    state.optionOrders[key] = shuffle(q.options.map((_, i) => i));
    saveState(state);
  }
  const shownOrder = state.optionOrders[key];
  currentShuffledOptions = shownOrder.map(i => q.options[i]);

  document.body.className = q.level.toLowerCase();
  $("section").textContent = q.level;
  $("sectionNote").textContent = sectionNotes[q.level];
  $("counter").textContent = "Question " + questionNumber + " of " + TOTAL;
  $("progress").style.width = ((questionNumber - 1) / TOTAL * 100) + "%";
  $("question").textContent = q.question;
  $("options").innerHTML = "";

  $("hint").classList.toggle("hidden", questionNumber !== 13);
  if (questionNumber === 13 && state.hint13) show("hintStatus");

  currentShuffledOptions.forEach((text, index) => {
    const button = document.createElement("button");
    button.className = "option";
    button.innerHTML = "<span class='key'>" + (index + 1) + "</span><span>" + escapeHtml(text) + "</span>";
    button.addEventListener("click", () => submitAnswer(index, button));
    $("options").appendChild(button);
  });
}

function openOptionalHint() {
  const state = loadState();
  state.hint13 = true;
  saveState(state);
  window.open("hint13.png", "_blank");
  show("hintStatus");
}

async function submitAnswer(choice, selectedButton) {
  if (answerLocked) return;
  answerLocked = true;
  setOptionsDisabled(true);

  const state = loadState();
  const q = QUIZ_DATA[currentSourceIndex];

  // Hash every shown option so we can find which one matches the stored
  // answer hash, without ever keeping a plain "correct index" in the data file.
  const hashes = await Promise.all(
    currentShuffledOptions.map(text => sha256Hex(`${currentSourceIndex}::${text}::${SALT}`))
  );
  const correctIndex = hashes.findIndex(h => h === q.answerHash);
  const correct = correctIndex === choice;

  [...$("options").children].forEach((button, index) => {
    if (index === correctIndex) button.classList.add("correct");
  });
  if (!correct) selectedButton.classList.add("wrong");

  state.answered.push(questionNumber);
  if (correct) state.score += 1;
  saveState(state);

  $("feedback").innerHTML = "<b>" + (correct ? "Correct!" : "Not quite.") + "</b> " + escapeHtml(q.explanation);
  show("feedback", "next");
  $("progress").style.width = (questionNumber / TOTAL * 100) + "%";
  $("next").textContent = questionNumber === TOTAL ? "See my result →" : "Next question →";
}

function goNext() {
  if (changingPage) return;
  changingPage = true;
  $("next").disabled = true;
  if (questionNumber < TOTAL) {
    questionNumber += 1;
    loadQuestion();
  } else {
    const state = loadState();
    showResult(state.score);
  }
}

function showResult(score) {
  showOnly("result");
  document.body.className = "complete";
  $("score").textContent = score + " / " + TOTAL;
  $("level").textContent = levelFor(score);
  $("resultText").textContent =
    score >= 17 ? "Excellent—you clearly understand social engineering." :
    score >= 13 ? "Good work. Review any missed answers." :
    score >= 9 ? "Keep practising. Read the topic pages once more." :
    "Review the lessons and try again.";
}

function useNumberShortcut(event) {
  if (answerLocked || $("quiz").classList.contains("hidden") || !["1", "2", "3"].includes(event.key)) return;
  const button = $("options").children[Number(event.key) - 1];
  if (button) button.click();
}

function setOptionsDisabled(value) {
  [...$("options").children].forEach(button => { button.disabled = value; });
}
function show(...ids) { ids.forEach(id => $(id).classList.remove("hidden")); }
function hide(...ids) { ids.forEach(id => $(id).classList.add("hidden")); }
function showOnly(id) {
  ["intro", "quiz", "result"].forEach(name => $(name).classList.toggle("hidden", name !== id));
}
function showError(message) {
  $("error").textContent = message || "Something went wrong. Please try again.";
  show("error");
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
